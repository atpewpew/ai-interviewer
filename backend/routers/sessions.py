from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from config import db
from models.schemas import SessionResponse, ProctoringFlag

router = APIRouter()


@router.get("/candidate/{candidate_id}", response_model=SessionResponse)
async def get_session_by_candidate(candidate_id: str):
    s = await db.sessions.find_one({"candidate_id": candidate_id})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return _format(s)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    s = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return _format(s)


@router.post("/{session_id}/flag", status_code=201)
async def submit_proctoring_flag(session_id: str, flag: ProctoringFlag):
    result = await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"proctoring_flags": flag.model_dump()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "flag recorded"}


@router.get("/{session_id}/messages")
async def get_session_messages(session_id: str):
    cursor = db.messages.find({"session_id": session_id}).sort("turn_number", 1)
    results = await cursor.to_list(100)
    for r in results:
        r["id"] = str(r.pop("_id"))
    return results


def _format(s: dict) -> SessionResponse:
    return SessionResponse(
        id=str(s["_id"]),
        candidate_id=s["candidate_id"],
        interview_id=s["interview_id"],
        status=s["status"],
        started_at=s.get("started_at"),
        ended_at=s.get("ended_at"),
    )
