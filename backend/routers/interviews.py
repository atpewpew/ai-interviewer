from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from config import db
from dependencies import get_current_user
from models.schemas import InterviewCreate, InterviewResponse

router = APIRouter()


@router.post("/", response_model=InterviewResponse, status_code=201)
async def create_interview(
    req: InterviewCreate, user: dict = Depends(get_current_user)
):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")

    doc = {
        "recruiter_id": user["user_id"],
        "title": req.title,
        "job_role": req.job_role,
        "job_description": req.job_description,
        "topics": req.topics,
        "difficulty": req.difficulty,
        "total_questions": req.total_questions,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.interviews.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format(doc)


@router.get("/", response_model=list[InterviewResponse])
async def list_interviews(user: dict = Depends(get_current_user)):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")
    cursor = db.interviews.find({"recruiter_id": user["user_id"]}).sort("created_at", -1)
    results = await cursor.to_list(100)
    return [_format(r) for r in results]


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: str):
    doc = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    return _format(doc)


@router.delete("/{interview_id}", status_code=204)
async def delete_interview(
    interview_id: str, user: dict = Depends(get_current_user)
):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")
    result = await db.interviews.delete_one(
        {"_id": ObjectId(interview_id), "recruiter_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")


def _format(doc: dict) -> InterviewResponse:
    return InterviewResponse(
        id=str(doc["_id"]),
        recruiter_id=doc["recruiter_id"],
        title=doc["title"],
        job_role=doc["job_role"],
        job_description=doc["job_description"],
        topics=doc["topics"],
        difficulty=doc["difficulty"],
        total_questions=doc["total_questions"],
        created_at=doc["created_at"],
    )
