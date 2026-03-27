"""
Live 1-on-1 Interview Room — WebRTC signaling + AI co-pilot.

Collections:
  live_rooms: {_id, application_id, job_id, recruiter_id, candidate_name, candidate_email,
               status, transcript[], hr_notes[], ai_summary, signaling_data, created_at}

WebSocket path: /ws/live-room/{room_id}
  - Both HR and candidate connect
  - Handles WebRTC signaling (offer/answer/ice-candidate)
  - HR sends audio chunks → Deepgram STT → live transcript
  - HR sends private notes
  - At end: AI generates summary
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from config import db
from dependencies import get_current_user
from models.schemas import LiveRoomResponse, HRNoteCreate
from services.llm_service import _call_llm

logger = logging.getLogger(__name__)
router = APIRouter()

# Active WebSocket connections per room
active_rooms: dict[str, dict[str, WebSocket]] = {}  # room_id -> {role: ws}


def _recruiter_only(user: dict):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter only")


def _format_room(doc: dict) -> LiveRoomResponse:
    return LiveRoomResponse(
        id=str(doc["_id"]),
        application_id=doc.get("application_id", ""),
        job_id=doc.get("job_id", ""),
        recruiter_id=doc.get("recruiter_id", ""),
        candidate_name=doc.get("candidate_name", ""),
        candidate_email=doc.get("candidate_email", ""),
        status=doc.get("status", "waiting"),
        transcript=doc.get("transcript", []),
        hr_notes=doc.get("hr_notes", []),
        ai_summary=doc.get("ai_summary"),
        created_at=doc["created_at"],
    )


# ── REST Endpoints ──

@router.get("/{room_id}", response_model=LiveRoomResponse)
async def get_room(room_id: str):
    doc = await db.live_rooms.find_one({"_id": ObjectId(room_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Room not found")
    return _format_room(doc)


@router.post("/{room_id}/notes")
async def add_hr_note(room_id: str, note: HRNoteCreate, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    now = datetime.now(timezone.utc)
    note_doc = {"text": note.text, "timestamp": now.isoformat()}
    await db.live_rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$push": {"hr_notes": note_doc}},
    )
    return {"status": "ok", "note": note_doc}


@router.get("/{room_id}/notes")
async def get_hr_notes(room_id: str, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    doc = await db.live_rooms.find_one({"_id": ObjectId(room_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"notes": doc.get("hr_notes", [])}


@router.post("/{room_id}/end")
async def end_room(room_id: str, user: dict = Depends(get_current_user)):
    """End the live room and trigger AI summary generation."""
    _recruiter_only(user)
    now = datetime.now(timezone.utc)

    doc = await db.live_rooms.find_one({"_id": ObjectId(room_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Room not found")

    # Generate AI summary from transcript + notes
    ai_summary = await _generate_live_summary(doc)

    await db.live_rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$set": {"status": "completed", "ai_summary": ai_summary, "ended_at": now}},
    )

    # Update application round_results
    app_id = doc.get("application_id")
    if app_id:
        await db.applications.update_one(
            {"_id": ObjectId(app_id), "round_results.live_room_id": room_id},
            {"$set": {
                "round_results.$.status": "completed",
                "round_results.$.score": None,
                "round_results.$.ai_summary": ai_summary,
                "round_results.$.completed_at": now,
            }},
        )

    return {"status": "completed", "ai_summary": ai_summary}


async def _generate_live_summary(room: dict) -> str:
    """Use LLM to generate a summary of the live interview."""
    transcript = room.get("transcript", [])
    hr_notes = room.get("hr_notes", [])
    candidate_name = room.get("candidate_name", "Candidate")

    if not transcript and not hr_notes:
        return "No conversation data available for summary."

    transcript_text = "\n".join(
        f"[{t.get('speaker', '?')}] {t.get('text', '')}" for t in transcript[-50:]  # last 50 entries
    )
    notes_text = "\n".join(f"- {n.get('text', '')}" for n in hr_notes)

    system = "You are an expert HR analyst. Analyze the live interview conversation and HR notes to produce a concise evaluation."
    user_prompt = f"""Analyze this live 1-on-1 interview with {candidate_name}.

Conversation Transcript (most recent):
{transcript_text or 'No transcript available.'}

HR Private Notes:
{notes_text or 'No notes recorded.'}

Provide a JSON response:
{{
  "summary": "3-5 sentence evaluation of the candidate's communication, cultural fit, and soft skills",
  "soft_skill_score": <0-100>,
  "cultural_fit": "Strong Fit" | "Moderate Fit" | "Weak Fit",
  "key_observations": ["observation 1", "observation 2", ...],
  "concerns": ["concern 1", ...] or []
}}"""

    result = await _call_llm(system, user_prompt, max_tokens=1024)
    if "error" in result:
        return f"AI summary generation failed: {result['error']}"

    # Return as formatted string for storage
    parts = []
    if result.get("summary"):
        parts.append(result["summary"])
    if result.get("cultural_fit"):
        parts.append(f"Cultural Fit: {result['cultural_fit']}")
    if result.get("soft_skill_score") is not None:
        parts.append(f"Soft Skill Score: {result['soft_skill_score']}/100")
    if result.get("key_observations"):
        parts.append("Key Observations: " + "; ".join(result["key_observations"]))
    if result.get("concerns"):
        parts.append("Concerns: " + "; ".join(result["concerns"]))
    return " | ".join(parts) if parts else str(result)


# ══════════════════════════════════════════════
#  WebSocket — Signaling + Live Transcript
# ══════════════════════════════════════════════

@router.websocket("/ws/{room_id}")
async def live_room_ws(websocket: WebSocket, room_id: str):
    """
    WebSocket for live room. Both HR and candidate connect.
    Message types:
      - {type: "join", role: "hr"|"candidate"}
      - {type: "offer"|"answer"|"ice-candidate", data: ...}  (WebRTC signaling)
      - {type: "transcript", speaker: "hr"|"candidate", text: "..."}  (live transcript entries)
      - {type: "note", text: "..."}  (HR private note)
      - {type: "end"}  (HR ends the call)
    """
    await websocket.accept()

    room = await db.live_rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close()
        return

    if room_id not in active_rooms:
        active_rooms[room_id] = {}

    role = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "join":
                role = data.get("role", "candidate")

                # Notify new joiner about peers already in the room
                for existing_role in list(active_rooms[room_id]):
                    if existing_role != role:
                        await websocket.send_json({"type": "peer_joined", "role": existing_role})

                active_rooms[room_id][role] = websocket
                logger.info("Live room %s: %s joined", room_id, role)

                # Update room status
                if len(active_rooms[room_id]) >= 2:
                    await db.live_rooms.update_one(
                        {"_id": ObjectId(room_id)},
                        {"$set": {"status": "active"}},
                    )

                # Notify other participants about new joiner
                await _broadcast(room_id, {"type": "peer_joined", "role": role}, exclude=role)

            elif msg_type in ("offer", "answer", "ice-candidate"):
                # Forward WebRTC signaling to the other peer
                await _broadcast(room_id, data, exclude=role)

            elif msg_type == "transcript":
                # Live transcript entry — save to DB and forward
                entry = {
                    "speaker": data.get("speaker", role or "unknown"),
                    "text": data.get("text", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await db.live_rooms.update_one(
                    {"_id": ObjectId(room_id)},
                    {"$push": {"transcript": entry}},
                )
                await _broadcast(room_id, {"type": "transcript", **entry})

            elif msg_type == "note":
                # HR private note — only save, don't broadcast to candidate
                note_doc = {
                    "text": data.get("text", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await db.live_rooms.update_one(
                    {"_id": ObjectId(room_id)},
                    {"$push": {"hr_notes": note_doc}},
                )
                # Only send back to HR
                if "hr" in active_rooms.get(room_id, {}):
                    await active_rooms[room_id]["hr"].send_json(
                        {"type": "note_saved", **note_doc}
                    )

            elif msg_type == "end":
                await _broadcast(room_id, {"type": "room_ended"})
                break

    except WebSocketDisconnect:
        logger.info("Live room %s: %s disconnected", room_id, role)
    except asyncio.CancelledError:
        logger.warning("Live room %s: task cancelled", room_id)
    except Exception as e:
        logger.error("Live room %s error: %s", room_id, str(e))
    finally:
        if role and room_id in active_rooms:
            active_rooms[room_id].pop(role, None)
            await _broadcast(room_id, {"type": "peer_left", "role": role})
            if not active_rooms[room_id]:
                del active_rooms[room_id]


async def _broadcast(room_id: str, message: dict, exclude: str = None):
    """Send a message to all connected peers in a room, optionally excluding one role."""
    peers = active_rooms.get(room_id, {})
    for peer_role, ws in list(peers.items()):
        if peer_role != exclude:
            try:
                await ws.send_json(message)
            except Exception:
                pass
