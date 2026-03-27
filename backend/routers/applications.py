"""
Applications — candidate applies to a job, HR advances/rejects through pipeline.

MongoDB collection: applications
{
    _id, job_id, candidate_name, candidate_email, github_username,
    resume_text, current_round (1-based), stage,
    round_results: [{round_number, status, score, report_id, session_id, completed_at, notes}],
    applied_at, updated_at
}
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from config import db, FRONTEND_URL
from dependencies import get_current_user
from models.schemas import ApplicationResponse, AdvanceApplicationRequest
from services.resume_service import parse_resume_pdf
from services.email_service import send_application_received, send_round_invite, send_rejection, send_offer

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ──

def _recruiter_only(user: dict):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")


def _format(doc: dict) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(doc["_id"]),
        job_id=doc["job_id"],
        candidate_name=doc["candidate_name"],
        candidate_email=doc["candidate_email"],
        github_username=doc.get("github_username", ""),
        resume_text=doc.get("resume_text"),
        current_round=doc.get("current_round", 1),
        stage=doc.get("stage", "applied"),
        round_results=doc.get("round_results", []),
        applied_at=doc["applied_at"],
        updated_at=doc.get("updated_at", doc["applied_at"]),
    )


# ── Candidate applies to a job (public, no auth) ──

@router.post("/apply/{job_id}", response_model=ApplicationResponse, status_code=201)
async def apply_to_job(
    job_id: str,
    name: str = Form(...),
    email: str = Form(...),
    github_username: str = Form(""),
    resume: UploadFile = File(...),
):
    # Validate job exists and is active
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job or job.get("status") != "active":
        raise HTTPException(status_code=404, detail="Job not found or not active")

    # Prevent duplicate applications
    existing = await db.applications.find_one(
        {"job_id": job_id, "candidate_email": email}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    resume_bytes = await resume.read()
    resume_text = parse_resume_pdf(resume_bytes)

    now = datetime.now(timezone.utc)
    doc = {
        "job_id": job_id,
        "candidate_name": name,
        "candidate_email": email,
        "github_username": github_username.strip() if github_username else "",
        "resume_text": resume_text,
        "current_round": 1,
        "stage": "applied",
        "round_results": [],
        "applied_at": now,
        "updated_at": now,
    }
    result = await db.applications.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Send confirmation email (fire-and-forget)
    await send_application_received(name, email, job.get("title", "this position"))

    # Auto-start the first round of the pipeline
    try:
        await _auto_start_current_round(doc, job)
    except Exception as e:
        logger.error("Auto-start first round failed for app %s: %s", str(doc["_id"]), e)

    return _format(doc)


# ── List applications for a job (Kanban data) ──

@router.get("/job/{job_id}", response_model=list[ApplicationResponse])
async def list_applications(job_id: str, user: dict = Depends(get_current_user)):
    _recruiter_only(user)

    # Verify recruiter owns this job
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job or job["recruiter_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Job not found")

    cursor = db.applications.find({"job_id": job_id}).sort("applied_at", -1)
    apps = await cursor.to_list(500)
    return [_format(a) for a in apps]


# ── Get single application ──

@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    doc = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return _format(doc)


# ── Advance or Reject a candidate ──

@router.post("/{app_id}/advance", response_model=ApplicationResponse)
async def advance_or_reject(
    app_id: str,
    req: AdvanceApplicationRequest,
    user: dict = Depends(get_current_user),
):
    _recruiter_only(user)

    app = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify recruiter owns the job
    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    if not job or job["recruiter_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")

    pipeline = job.get("pipeline", [])
    current_round = app.get("current_round", 1)
    now = datetime.now(timezone.utc)

    if req.action == "reject":
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": {"stage": "rejected", "updated_at": now}},
        )
        await send_rejection(app["candidate_name"], app["candidate_email"], job.get("title", ""))
    elif req.action == "advance":
        if app.get("stage") == "rejected":
            raise HTTPException(status_code=400, detail="Cannot advance a rejected candidate")

        next_round = current_round + 1
        if next_round > len(pipeline):
            # All rounds complete → hired
            await db.applications.update_one(
                {"_id": ObjectId(app_id)},
                {"$set": {"stage": "hired", "updated_at": now}},
            )
            await send_offer(app["candidate_name"], app["candidate_email"], job.get("title", ""))
        else:
            await db.applications.update_one(
                {"_id": ObjectId(app_id)},
                {"$set": {
                    "current_round": next_round,
                    "stage": "in_progress",
                    "updated_at": now,
                }},
            )

    doc = await db.applications.find_one({"_id": ObjectId(app_id)})
    return _format(doc)


# ── Start a round for a candidate (creates the session/interview link) ──

@router.post("/{app_id}/start-round")
async def start_round(app_id: str, user: dict = Depends(get_current_user)):
    """
    For the current round of an application, provision the necessary resources.
    - ai_interview: create an Interview doc + Candidate doc + Session doc, return session_id
    - dsa_coding / live_1on1 / manual_review: return placeholder (future implementation)
    """
    _recruiter_only(user)

    app = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    if not job or job["recruiter_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")

    pipeline = job.get("pipeline", [])
    current_round = app.get("current_round", 1)

    # Find the current round config
    round_config = None
    for r in pipeline:
        if r["round_number"] == current_round:
            round_config = r
            break

    if not round_config:
        raise HTTPException(status_code=400, detail="Round config not found")

    round_type = round_config["round_type"]

    if round_type == "ai_interview":
        return await _start_ai_interview_round(app, job, round_config)
    elif round_type == "dsa_coding":
        return await _start_dsa_round(app, job, round_config)
    elif round_type == "live_1on1":
        return await _start_live_round(app, job, round_config)
    elif round_type == "manual_review":
        return {"status": "manual", "message": "Manual review — no automated session needed", "round_type": round_type}


async def _start_ai_interview_round(app: dict, job: dict, round_config: dict):
    """Create interview + candidate + session docs for an AI interview round."""
    app_id = str(app["_id"])
    ic = round_config.get("interview_config") or {}

    now = datetime.now(timezone.utc)

    # Check if already started (idempotent)
    existing_round = next(
        (r for r in app.get("round_results", []) if r["round_number"] == round_config["round_number"]),
        None,
    )
    if existing_round and existing_round.get("session_id"):
        session = await db.sessions.find_one({"_id": ObjectId(existing_round["session_id"])})
        if session:
            return {
                "round_type": "ai_interview",
                "session_id": existing_round["session_id"],
                "interview_id": existing_round.get("interview_id", ""),
                "candidate_id": existing_round.get("candidate_id", ""),
                "status": session.get("status", "waiting"),
            }

    # Create an Interview doc linked to this job/round
    interview_doc = {
        "recruiter_id": job["recruiter_id"],
        "title": f"{job['title']} — {round_config['name']}",
        "job_role": job["title"],
        "job_description": job["description"],
        "topics": ic.get("topics", ["General"]),
        "difficulty": ic.get("difficulty", "medium"),
        "total_questions": ic.get("total_questions", 7),
        "job_id": str(job["_id"]),
        "round_number": round_config["round_number"],
        "application_id": app_id,
        "created_at": now,
    }
    interview_result = await db.interviews.insert_one(interview_doc)
    interview_id = str(interview_result.inserted_id)

    # Create a Candidate doc
    candidate_doc = {
        "name": app["candidate_name"],
        "email": app["candidate_email"],
        "interview_id": interview_id,
        "resume_text": app.get("resume_text", ""),
        "github_username": app.get("github_username", ""),
        "application_id": app_id,
        "status": "pending",
        "created_at": now,
    }
    candidate_result = await db.candidates.insert_one(candidate_doc)
    candidate_id = str(candidate_result.inserted_id)

    # Create a Session doc
    session_doc = {
        "candidate_id": candidate_id,
        "interview_id": interview_id,
        "application_id": app_id,
        "status": "waiting",
        "proctoring_flags": [],
        "started_at": None,
        "ended_at": None,
    }
    session_result = await db.sessions.insert_one(session_doc)
    session_id = str(session_result.inserted_id)

    # Record in round_results
    round_result_entry = {
        "round_number": round_config["round_number"],
        "round_type": "ai_interview",
        "status": "pending",
        "session_id": session_id,
        "interview_id": interview_id,
        "candidate_id": candidate_id,
        "score": None,
        "report_id": None,
        "completed_at": None,
    }
    await db.applications.update_one(
        {"_id": app["_id"]},
        {
            "$push": {"round_results": round_result_entry},
            "$set": {"stage": "in_progress", "updated_at": now},
        },
    )

    # Send invite email with lobby link (includes sessionId for direct access)
    await send_round_invite(
        app["candidate_name"], app["candidate_email"],
        job.get("title", ""), round_config.get("name", "AI Interview"), "ai_interview",
        f"{FRONTEND_URL}/interview/{interview_id}/lobby?sid={session_id}",
    )

    return {
        "round_type": "ai_interview",
        "session_id": session_id,
        "interview_id": interview_id,
        "candidate_id": candidate_id,
        "status": "waiting",
    }


async def _start_dsa_round(app: dict, job: dict, round_config: dict):
    """Create a DSA session for the candidate."""
    app_id = str(app["_id"])
    now = datetime.now(timezone.utc)
    dsa_cfg = round_config.get("dsa_config") or {}

    # Check if already started
    existing_round = next(
        (r for r in app.get("round_results", []) if r["round_number"] == round_config["round_number"]),
        None,
    )
    if existing_round and existing_round.get("dsa_session_id"):
        return {
            "round_type": "dsa_coding",
            "dsa_session_id": existing_round["dsa_session_id"],
            "status": existing_round.get("status", "pending"),
        }

    # Pick problem IDs from config, or use first available
    problem_ids = dsa_cfg.get("problem_ids", [])
    if not problem_ids:
        cursor = db.dsa_problems.find().sort("created_at", -1).limit(1)
        problems = await cursor.to_list(1)
        if problems:
            problem_ids = [str(problems[0]["_id"])]

    time_limit = dsa_cfg.get("time_limit_minutes", 60)

    session_doc = {
        "application_id": app_id,
        "job_id": str(job["_id"]),
        "candidate_name": app["candidate_name"],
        "candidate_email": app["candidate_email"],
        "problem_ids": problem_ids,
        "current_problem_index": 0,
        "status": "waiting",
        "time_limit_minutes": time_limit,
        "best_score": 0,
        "submission_count": 0,
        "created_at": now,
    }
    result = await db.dsa_sessions.insert_one(session_doc)
    dsa_session_id = str(result.inserted_id)

    round_result_entry = {
        "round_number": round_config["round_number"],
        "round_type": "dsa_coding",
        "status": "pending",
        "dsa_session_id": dsa_session_id,
        "score": None,
        "completed_at": None,
    }
    await db.applications.update_one(
        {"_id": app["_id"]},
        {
            "$push": {"round_results": round_result_entry},
            "$set": {"stage": "in_progress", "updated_at": now},
        },
    )

    # Send invite email
    await send_round_invite(
        app["candidate_name"], app["candidate_email"],
        job.get("title", ""), "DSA Coding Challenge", "dsa_coding",
        f"{FRONTEND_URL}/dsa/{dsa_session_id}",
    )

    return {
        "round_type": "dsa_coding",
        "dsa_session_id": dsa_session_id,
        "status": "waiting",
    }


async def _start_live_round(app: dict, job: dict, round_config: dict):
    """Create a live 1-on-1 room."""
    app_id = str(app["_id"])
    now = datetime.now(timezone.utc)

    # Check if already started
    existing_round = next(
        (r for r in app.get("round_results", []) if r["round_number"] == round_config["round_number"]),
        None,
    )
    if existing_round and existing_round.get("live_room_id"):
        return {
            "round_type": "live_1on1",
            "live_room_id": existing_round["live_room_id"],
            "status": existing_round.get("status", "pending"),
        }

    room_doc = {
        "application_id": app_id,
        "job_id": str(job["_id"]),
        "recruiter_id": job["recruiter_id"],
        "candidate_name": app["candidate_name"],
        "candidate_email": app["candidate_email"],
        "status": "waiting",
        "transcript": [],
        "hr_notes": [],
        "ai_summary": None,
        "created_at": now,
    }
    result = await db.live_rooms.insert_one(room_doc)
    live_room_id = str(result.inserted_id)

    round_result_entry = {
        "round_number": round_config["round_number"],
        "round_type": "live_1on1",
        "status": "pending",
        "live_room_id": live_room_id,
        "score": None,
        "ai_summary": None,
        "completed_at": None,
    }
    await db.applications.update_one(
        {"_id": app["_id"]},
        {
            "$push": {"round_results": round_result_entry},
            "$set": {"stage": "in_progress", "updated_at": now},
        },
    )

    # Send invite email
    await send_round_invite(
        app["candidate_name"], app["candidate_email"],
        job.get("title", ""), "Live 1-on-1 Interview", "live_1on1",
        f"{FRONTEND_URL}/live-room/{live_room_id}/candidate",
    )

    return {
        "round_type": "live_1on1",
        "live_room_id": live_room_id,
        "status": "waiting",
    }


# ══════════════════════════════════════════════
#  Auto-advance & Auto-start Helpers
# ══════════════════════════════════════════════

async def _auto_start_current_round(app: dict, job: dict):
    """Auto-start the current round for a candidate (called after apply or advance)."""
    pipeline = job.get("pipeline", [])
    current_round = app.get("current_round", 1)

    round_config = next((r for r in pipeline if r["round_number"] == current_round), None)
    if not round_config:
        return

    round_type = round_config["round_type"]

    if round_type == "ai_interview":
        await _start_ai_interview_round(app, job, round_config)
    elif round_type == "dsa_coding":
        await _start_dsa_round(app, job, round_config)
    elif round_type == "live_1on1":
        await _start_live_round(app, job, round_config)
    # manual_review: no auto-start needed


async def auto_advance_candidate(app_id: str):
    """Check if the current round is completed and auto-advance to the next round.
    Call this after a round finishes (DSA submit, AI interview complete, etc.)."""
    app = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not app or app.get("stage") in ("rejected", "hired"):
        return

    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    if not job:
        return

    pipeline = job.get("pipeline", [])
    current_round = app.get("current_round", 1)

    # Find the current round's result
    current_result = next(
        (r for r in app.get("round_results", []) if r["round_number"] == current_round),
        None,
    )
    if not current_result or current_result.get("status") != "completed":
        return

    score = current_result.get("score")
    if score is None:
        return

    # Get threshold from round config (default 50%)
    round_config = next((r for r in pipeline if r["round_number"] == current_round), None)
    threshold = 50
    if round_config:
        threshold = round_config.get("auto_advance_threshold", 50)

    if score < threshold:
        logger.info("App %s round %d score %s < threshold %s — not auto-advancing",
                     app_id, current_round, score, threshold)
        return

    # Advance to next round
    next_round = current_round + 1
    now = datetime.now(timezone.utc)

    if next_round > len(pipeline):
        # All rounds complete → hired
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": {"stage": "hired", "updated_at": now}},
        )
        await send_offer(app["candidate_name"], app["candidate_email"], job.get("title", ""))
        logger.info("App %s auto-hired (all rounds passed)", app_id)
        return

    # Move to next round
    await db.applications.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"current_round": next_round, "stage": "in_progress", "updated_at": now}},
    )

    # Re-fetch updated application, then auto-start the next round
    app = await db.applications.find_one({"_id": ObjectId(app_id)})
    try:
        await _auto_start_current_round(app, job)
        logger.info("App %s auto-advanced to round %d and started", app_id, next_round)
    except Exception as e:
        logger.error("Auto-start round %d failed for app %s: %s", next_round, app_id, e)
