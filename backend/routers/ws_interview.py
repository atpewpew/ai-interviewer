import asyncio
import json
import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from config import db
from services.llm_service import generate_first_question, evaluate_and_next
from services.deepgram_service import DeepgramTranscriber
from services.report_service import generate_report
from services.proctoring_service import ProctoringAnalyzer
from services.github_service import fetch_github_context

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory session state — keyed by session_id
active_sessions: dict[str, dict] = {}


@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Guard: reject duplicate connections for the same session (e.g. React StrictMode double-mount)
    if session_id in active_sessions:
        await websocket.send_json({"error": "Session already in progress"})
        await websocket.close(code=1008)
        return

    # Reserve slot immediately to prevent race with concurrent connections
    active_sessions[session_id] = {}

    # Load session and interview data from DB
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        await websocket.send_json({"error": "Session not found"})
        await websocket.close()
        return

    interview = await db.interviews.find_one(
        {"_id": ObjectId(session["interview_id"])}
    )
    if not interview:
        await websocket.send_json({"error": "Interview not found"})
        await websocket.close()
        return

    candidate = await db.candidates.find_one(
        {"_id": ObjectId(session["candidate_id"])}
    )
    resume_summary = candidate.get("resume_text", "") if candidate else ""
    github_username = candidate.get("github_username", "") if candidate else ""

    # Fetch GitHub context (non-blocking, returns empty string on failure)
    github_context = ""
    if github_username:
        github_context = await fetch_github_context(github_username)

    # Initialize in-memory session state
    state = {
        "session_id": session_id,
        "interview_id": session["interview_id"],
        "candidate_id": session["candidate_id"],
        "job_role": interview["job_role"],
        "job_description": interview["job_description"],
        "topics": interview["topics"],
        "difficulty": interview["difficulty"],
        "total_questions": interview["total_questions"],
        "resume_summary": resume_summary,
        "github_context": github_context,
        "current_turn": 0,
        "current_question": "",
        "current_topic": "",
        "questions_asked": [],
        "running_scores": [],
        "speech_metrics_all": [],  # per-turn speech metrics for report
    }
    active_sessions[session_id] = state

    # Mark session in-progress
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc)}},
    )

    # Deepgram is connected lazily per turn when the first audio byte arrives.
    transcriber = None
    dg_connect_tried = False

    # Server-side proctoring (MediaPipe)
    proctor = ProctoringAnalyzer()

    try:
        # Generate and send first question
        first_q = await generate_first_question(
            job_role=state["job_role"],
            job_description=state["job_description"],
            topics=state["topics"],
            difficulty=state["difficulty"],
            resume_summary=state["resume_summary"],
            github_context=state["github_context"],
        )

        if "error" in first_q:
            await websocket.send_json({"error": "Failed to generate question"})
            await websocket.close()
            return

        state["current_turn"] = 1
        state["current_question"] = first_q["question"]
        state["current_topic"] = first_q.get("topic", state["topics"][0])

        await websocket.send_json({
            "type": "question",
            "question": first_q["question"],
            "topic": first_q.get("topic", ""),
            "turn_number": 1,
            "total_questions": state["total_questions"],
            "is_complete": False,
        })

        # Main interview loop
        collecting_audio = True
        while True:
            try:
                message = await websocket.receive()
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected for session %s", session_id)
                break

            # Handle binary audio data
            if "bytes" in message:
                if collecting_audio:
                    if not dg_connect_tried:
                        dg_connect_tried = True
                        transcriber = DeepgramTranscriber()
                        try:
                            await transcriber.connect()
                        except Exception as e:
                            logger.error("Failed to connect Deepgram: %s", e)
                            transcriber = None

                    if transcriber and transcriber._is_connected:
                        await transcriber.send_audio(message["bytes"])
                        interim = transcriber.get_interim()
                        if interim:
                            await websocket.send_json({
                                "type": "interim_transcript",
                                "transcript": interim,
                            })

            # Handle text commands from frontend
            elif "text" in message:
                data = json.loads(message["text"])
                cmd = data.get("command")
                event = data.get("event")

                # --- Proctoring events ---
                if event == "frame":
                    image_data = data.get("image", "")
                    frame_interval = data.get("frame_interval", 1000)
                    result = proctor.process_frame(image_data, frame_interval)
                    await websocket.send_json({
                        "type": "proctor_update",
                        "risk_score": result["risk_score"],
                        "message": result["message"],
                    })
                    continue

                if event in ("tab_switch", "window_blur", "tab_focus", "window_focus"):
                    proctor.process_event(event)
                    continue

                # --- Text input fallback ---
                if cmd == "text_input":
                    collecting_audio = False
                    text_answer = data.get("text", "").strip() or "(no response)"

                    if transcriber:
                        await transcriber.close()
                        transcriber = None

                    await websocket.send_json({
                        "type": "transcript_final",
                        "transcript": text_answer,
                    })
                    await websocket.send_json({"type": "processing"})

                    # No speech metrics for text input
                    await _process_answer(
                        websocket, state, proctor, text_answer, None, transcriber
                    )

                    collecting_audio = True
                    dg_connect_tried = False
                    if state.get("_interview_complete"):
                        break
                    continue

                if cmd == "stop_recording":
                    collecting_audio = False

                    # Get final transcript + speech metrics, then close Deepgram
                    speech_metrics = None
                    if transcriber and transcriber._is_connected:
                        transcript = await transcriber.wait_for_final_transcript(timeout=10)
                        speech_metrics = transcriber.get_speech_metrics()
                        await transcriber.close()
                    elif transcriber:
                        transcript = transcriber.final_transcript
                        speech_metrics = transcriber.get_speech_metrics()
                        await transcriber.close()
                    else:
                        transcript = ""
                    transcriber = None

                    if not transcript.strip():
                        transcript = "(no response)"

                    await websocket.send_json({
                        "type": "transcript_final",
                        "transcript": transcript,
                    })

                    await websocket.send_json({"type": "processing"})

                    await _process_answer(
                        websocket, state, proctor, transcript, speech_metrics, None
                    )

                    collecting_audio = True
                    dg_connect_tried = False
                    if state.get("_interview_complete"):
                        break

                elif cmd == "end_interview":
                    await _finish_interview(session_id, proctor, state)
                    await websocket.send_json({"type": "ended"})
                    break

    except WebSocketDisconnect:
        logger.info("Client disconnected: session %s", session_id)
    except asyncio.CancelledError:
        logger.warning("Task cancelled for session %s", session_id)
    except Exception as e:
        logger.error("WebSocket error for session %s: %s", session_id, str(e))
    finally:
        if transcriber is not None:
            await transcriber.close()
        active_sessions.pop(session_id, None)
        await db.sessions.update_one(
            {"_id": ObjectId(session_id), "status": "in_progress"},
            {"$set": {"status": "completed", "ended_at": datetime.now(timezone.utc)}},
        )


async def _process_answer(
    websocket: WebSocket,
    state: dict,
    proctor: ProctoringAnalyzer,
    answer_text: str,
    speech_metrics: dict | None,
    transcriber,
):
    """Evaluate an answer (voice or text), persist turn, send result to client."""
    session_id = state["session_id"]

    eval_result = await evaluate_and_next(
        job_role=state["job_role"],
        job_description=state["job_description"],
        topics=state["topics"],
        difficulty=state["difficulty"],
        resume_summary=state["resume_summary"],
        current_question=state["current_question"],
        current_topic=state["current_topic"],
        answer_transcript=answer_text,
        questions_asked=state["questions_asked"],
        turn_number=state["current_turn"],
        total_questions=state["total_questions"],
        speech_metrics=speech_metrics,
        github_context=state.get("github_context", ""),
    )

    if "error" in eval_result:
        await websocket.send_json({"type": "error", "message": "Evaluation failed"})
        return

    scores = {
        "technical": eval_result.get("technical_score", 5),
        "communication": eval_result.get("communication_score", 5),
        "depth": eval_result.get("depth_score", 5),
    }
    justifications = {
        "technical": eval_result.get("technical_justification", ""),
        "communication": eval_result.get("communication_justification", ""),
        "depth": eval_result.get("depth_justification", ""),
    }
    feedback = (
        f"Technical: {eval_result.get('technical_justification', eval_result.get('technical_feedback', ''))} | "
        f"Communication: {eval_result.get('communication_justification', eval_result.get('communication_feedback', ''))} | "
        f"Depth: {eval_result.get('depth_justification', eval_result.get('depth_feedback', ''))}"
    )
    contradiction_note = eval_result.get("contradiction_note", "")

    # Snapshot proctoring score for this question
    proctoring_snapshot = proctor.get_proctoring_score()

    # Save turn to MongoDB
    turn_doc = {
        "session_id": session_id,
        "turn_number": state["current_turn"],
        "question": state["current_question"],
        "topic": state["current_topic"],
        "difficulty": state["difficulty"],
        "answer_transcript": answer_text,
        "scores": scores,
        "justifications": justifications,
        "contradiction_note": contradiction_note,
        "llm_feedback": feedback,
        "speech_metrics": speech_metrics,
        "proctoring_snapshot": proctoring_snapshot,
        "timestamp": datetime.now(timezone.utc),
    }
    await db.messages.insert_one(turn_doc)

    # Update in-memory state — include answer for cross-referencing
    state["questions_asked"].append({
        "turn": state["current_turn"],
        "topic": state["current_topic"],
        "question": state["current_question"],
        "answer": answer_text,
        "tech_score": scores["technical"],
        "comm_score": scores["communication"],
        "depth_score": scores["depth"],
    })
    state["running_scores"].append(scores)
    if speech_metrics:
        state["speech_metrics_all"].append(speech_metrics)

    is_complete = state["current_turn"] >= state["total_questions"]

    if is_complete:
        await websocket.send_json({
            "type": "result",
            "transcript": answer_text,
            "scores": scores,
            "feedback": feedback,
            "turn_number": state["current_turn"],
            "is_complete": True,
        })
        await _finish_interview(session_id, proctor, state)
        state["_interview_complete"] = True
    else:
        next_question = eval_result.get("next_question", "Tell me more.")
        next_topic = eval_result.get("next_topic", state["current_topic"])
        state["current_turn"] += 1
        state["current_question"] = next_question
        state["current_topic"] = next_topic
        await websocket.send_json({
            "type": "result",
            "transcript": answer_text,
            "scores": scores,
            "feedback": feedback,
            "next_question": next_question,
            "topic": next_topic,
            "turn_number": state["current_turn"],
            "total_questions": state["total_questions"],
            "is_complete": False,
        })


async def _finish_interview(session_id: str, proctor: ProctoringAnalyzer, state: dict | None = None):
    """Mark session completed, save proctoring data, trigger report generation."""
    proctoring_score = proctor.get_proctoring_score()
    proctoring_flags = proctor.get_flags_for_report()

    # Aggregate speech metrics for report
    speech_metrics_summary = None
    if state and state.get("speech_metrics_all"):
        all_sm = state["speech_metrics_all"]
        total_words = sum(m.get("total_words", 0) for m in all_sm)
        total_fillers = sum(m.get("filler_word_count", 0) for m in all_sm)
        wpms = [m["words_per_minute"] for m in all_sm if m.get("words_per_minute", 0) > 0]
        confs = [m["avg_confidence"] for m in all_sm if m.get("avg_confidence", 0) > 0]
        speech_metrics_summary = {
            "total_words": total_words,
            "total_fillers": total_fillers,
            "avg_wpm": sum(wpms) / len(wpms) if wpms else 0,
            "avg_confidence": sum(confs) / len(confs) if confs else 0,
        }

    update_data = {
        "status": "completed",
        "ended_at": datetime.now(timezone.utc),
        "proctoring_score": proctoring_score,
        "proctoring_flags": proctoring_flags,
    }
    if speech_metrics_summary:
        update_data["speech_metrics_summary"] = speech_metrics_summary

    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_data},
    )
    asyncio.create_task(generate_report(session_id))
