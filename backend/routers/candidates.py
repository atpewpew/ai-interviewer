from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from config import db
from models.schemas import CandidateResponse
from services.resume_service import parse_resume_pdf

router = APIRouter()


@router.post("/register", response_model=CandidateResponse, status_code=201)
async def register_candidate(
    name: str = Form(...),
    email: str = Form(...),
    interview_id: str = Form(...),
    resume: UploadFile = File(...),
):
    interview = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    existing = await db.candidates.find_one(
        {"email": email, "interview_id": interview_id}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this interview")

    resume_bytes = await resume.read()
    resume_text = parse_resume_pdf(resume_bytes)

    candidate_doc = {
        "name": name,
        "email": email,
        "interview_id": interview_id,
        "resume_text": resume_text,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.candidates.insert_one(candidate_doc)
    candidate_doc["_id"] = result.inserted_id

    session_doc = {
        "candidate_id": str(result.inserted_id),
        "interview_id": interview_id,
        "status": "waiting",
        "proctoring_flags": [],
        "started_at": None,
        "ended_at": None,
    }
    session_result = await db.sessions.insert_one(session_doc)

    return CandidateResponse(
        id=str(result.inserted_id),
        name=name,
        email=email,
        interview_id=interview_id,
        resume_text=resume_text,
        status="pending",
    )


@router.get("/interview/{interview_id}", response_model=list[CandidateResponse])
async def list_candidates_for_interview(interview_id: str):
    cursor = db.candidates.find({"interview_id": interview_id})
    results = await cursor.to_list(200)
    return [
        CandidateResponse(
            id=str(c["_id"]),
            name=c["name"],
            email=c["email"],
            interview_id=c["interview_id"],
            resume_text=c.get("resume_text"),
            status=c["status"],
        )
        for c in results
    ]


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str):
    c = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return CandidateResponse(
        id=str(c["_id"]),
        name=c["name"],
        email=c["email"],
        interview_id=c["interview_id"],
        resume_text=c.get("resume_text"),
        status=c["status"],
    )
