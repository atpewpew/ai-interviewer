"""
Job Openings — CRUD + pipeline management.

MongoDB collection: jobs
{
    _id, recruiter_id, title, department, location, job_type,
    description, requirements[], status,
    pipeline: [{round_number, name, round_type, interview_config, ...}],
    created_at, updated_at
}
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from config import db
from dependencies import get_current_user
from models.schemas import JobCreate, JobUpdate, JobResponse

router = APIRouter()


# ── Helpers ──

def _recruiter_only(user: dict):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")


def _format(doc: dict, applicant_count: int = 0) -> JobResponse:
    return JobResponse(
        id=str(doc["_id"]),
        recruiter_id=doc["recruiter_id"],
        title=doc["title"],
        department=doc.get("department", ""),
        location=doc.get("location", ""),
        job_type=doc.get("job_type", "full_time"),
        description=doc["description"],
        requirements=doc.get("requirements", []),
        pipeline=doc.get("pipeline", []),
        status=doc.get("status", "draft"),
        applicant_count=applicant_count,
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at", doc["created_at"]),
    )


# ── CRUD ──

@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(req: JobCreate, user: dict = Depends(get_current_user)):
    _recruiter_only(user)

    # Normalize pipeline round numbers to be sequential
    pipeline_dicts = []
    for i, r in enumerate(req.pipeline, start=1):
        rd = r.model_dump()
        rd["round_number"] = i
        pipeline_dicts.append(rd)

    now = datetime.now(timezone.utc)
    doc = {
        "recruiter_id": user["user_id"],
        "title": req.title,
        "department": req.department,
        "location": req.location,
        "job_type": req.job_type,
        "description": req.description,
        "requirements": req.requirements,
        "pipeline": pipeline_dicts,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format(doc)


@router.get("/", response_model=list[JobResponse])
async def list_jobs(user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    cursor = db.jobs.find({"recruiter_id": user["user_id"]}).sort("created_at", -1)
    jobs = await cursor.to_list(200)

    # Batch-count applicants per job
    job_ids = [str(j["_id"]) for j in jobs]
    pipeline_agg = [
        {"$match": {"job_id": {"$in": job_ids}}},
        {"$group": {"_id": "$job_id", "count": {"$sum": 1}}},
    ]
    counts_raw = await db.applications.aggregate(pipeline_agg).to_list(200)
    counts = {c["_id"]: c["count"] for c in counts_raw}

    return [_format(j, applicant_count=counts.get(str(j["_id"]), 0)) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    doc = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    count = await db.applications.count_documents({"job_id": job_id})
    return _format(doc, applicant_count=count)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, req: JobUpdate, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    updates = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Re-normalize pipeline round numbers if pipeline changed
    if "pipeline" in updates:
        for i, r in enumerate(updates["pipeline"], start=1):
            r["round_number"] = i

    updates["updated_at"] = datetime.now(timezone.utc)

    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "recruiter_id": user["user_id"]},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")

    doc = await db.jobs.find_one({"_id": ObjectId(job_id)})
    count = await db.applications.count_documents({"job_id": job_id})
    return _format(doc, applicant_count=count)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    result = await db.jobs.delete_one(
        {"_id": ObjectId(job_id), "recruiter_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")


# ── Public endpoint for candidates to see a job posting ──

@router.get("/public/{job_id}")
async def get_public_job(job_id: str):
    """Public-facing job details (no auth). Returns info needed for application page."""
    doc = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not doc or doc.get("status") != "active":
        raise HTTPException(status_code=404, detail="Job not found or not active")
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "department": doc.get("department", ""),
        "location": doc.get("location", ""),
        "job_type": doc.get("job_type", "full_time"),
        "description": doc["description"],
        "requirements": doc.get("requirements", []),
        "total_rounds": len(doc.get("pipeline", [])),
    }
