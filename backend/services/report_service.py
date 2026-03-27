import logging
from datetime import datetime, timezone
from bson import ObjectId
from config import db
from services.llm_service import generate_report_data

logger = logging.getLogger(__name__)


async def generate_report(session_id: str):
    """Generate a full interview report after session ends."""
    try:
        session = await db.sessions.find_one({"_id": ObjectId(session_id)})
        if not session:
            logger.error("Session %s not found for report generation", session_id)
            return

        interview = await db.interviews.find_one(
            {"_id": ObjectId(session["interview_id"])}
        )
        if not interview:
            logger.error("Interview not found for session %s", session_id)
            return

        cursor = db.messages.find({"session_id": session_id}).sort("turn_number", 1)
        all_turns = await cursor.to_list(100)

        turns_data = []
        per_question_proctoring = []
        for t in all_turns:
            turn_entry = {
                "turn_number": t["turn_number"],
                "question": t["question"],
                "topic": t["topic"],
                "difficulty": t["difficulty"],
                "answer_transcript": t["answer_transcript"],
                "scores": t["scores"],
                "llm_feedback": t["llm_feedback"],
                "justifications": t.get("justifications"),
                "contradiction_note": t.get("contradiction_note", ""),
            }
            turns_data.append(turn_entry)

            # Collect per-question proctoring snapshots
            snapshot = t.get("proctoring_snapshot")
            per_question_proctoring.append({
                "turn_number": t["turn_number"],
                "topic": t["topic"],
                "proctoring_score": snapshot if snapshot is not None else 100.0,
            })

        proctoring_flags = session.get("proctoring_flags", [])
        proctoring_score = session.get("proctoring_score", 100)
        speech_metrics_summary = session.get("speech_metrics_summary")

        report_data = await generate_report_data(
            job_role=interview["job_role"],
            job_description=interview["job_description"],
            all_turns=turns_data,
            proctoring_flags=proctoring_flags,
            proctoring_score=proctoring_score,
            per_question_proctoring=per_question_proctoring,
            speech_metrics_summary=speech_metrics_summary,
        )

        if "error" in report_data:
            logger.error("Report generation LLM error: %s", report_data["error"])
            return

        report_doc = {
            "session_id": session_id,
            "candidate_id": session["candidate_id"],
            "interview_id": session["interview_id"],
            "overall_score": report_data.get("overall_score", 0),
            "dimension_scores": report_data.get("dimension_scores", {}),
            "dimension_justifications": report_data.get("dimension_justifications", {}),
            "recommendation": report_data.get("recommendation", "Hold"),
            "strengths": report_data.get("strengths", []),
            "red_flags": report_data.get("red_flags", []),
            "proctoring_score": proctoring_score,
            "proctoring_flags": proctoring_flags,
            "per_question_proctoring": per_question_proctoring,
            "speech_metrics_summary": speech_metrics_summary,
            "full_summary": report_data.get("full_summary", ""),
            "generated_at": datetime.now(timezone.utc),
        }

        await db.reports.insert_one(report_doc)

        await db.candidates.update_one(
            {"_id": ObjectId(session["candidate_id"])},
            {"$set": {"status": "completed"}},
        )

        # If this session is linked to a job application, update round_results
        application_id = session.get("application_id")
        if application_id:
            overall = report_data.get("overall_score", 0)
            report_id = str(report_doc.get("_id", ""))
            await db.applications.update_one(
                {
                    "_id": ObjectId(application_id),
                    "round_results.session_id": session_id,
                },
                {"$set": {
                    "round_results.$.status": "completed",
                    "round_results.$.score": overall,
                    "round_results.$.report_id": report_id,
                    "round_results.$.completed_at": datetime.now(timezone.utc),
                }},
            )

        logger.info("Report generated for session %s", session_id)

    except Exception as e:
        logger.error("Report generation failed for session %s: %s", session_id, str(e))
