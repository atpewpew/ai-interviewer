"""
DSA / Coding Round — problem management and code submissions.

Collections:
  dsa_problems: {_id, title, description, difficulty, constraints, starter_code, test_cases, time_limit_seconds, memory_limit_kb, created_by, created_at}
  dsa_sessions: {_id, application_id, problem_id, round_number, candidate_name, status, started_at, ended_at, time_limit_minutes}
  dsa_submissions: {_id, dsa_session_id, language, source_code, status, test_results, score, submitted_at}
"""
from datetime import datetime, timezone
import logging
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from config import db
from dependencies import get_current_user
from models.schemas import (
    DSAProblemCreate, DSAProblemResponse,
    DSASubmissionCreate, DSASubmissionResponse,
)
from services.python_runner import run_against_test_cases, run_custom_input
from routers.applications import auto_advance_candidate

logger = logging.getLogger(__name__)
router = APIRouter()


def _utc(dt):
    """Ensure a datetime from MongoDB has UTC timezone info for correct JSON serialization."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _recruiter_only(user: dict):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")


# ══════════════════════════════════════════════
#  Problem CRUD (Recruiter)
# ══════════════════════════════════════════════

@router.post("/problems", response_model=DSAProblemResponse, status_code=201)
async def create_problem(req: DSAProblemCreate, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    now = datetime.now(timezone.utc)
    doc = {
        **req.model_dump(),
        "test_cases": [tc.model_dump() for tc in req.test_cases],
        "created_by": user["user_id"],
        "created_at": now,
    }
    result = await db.dsa_problems.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format_problem(doc)


@router.get("/problems", response_model=list[DSAProblemResponse])
async def list_problems(user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    cursor = db.dsa_problems.find({"created_by": user["user_id"]}).sort("created_at", -1)
    problems = await cursor.to_list(200)
    return [_format_problem(p) for p in problems]


@router.get("/problems/{problem_id}", response_model=DSAProblemResponse)
async def get_problem(problem_id: str):
    doc = await db.dsa_problems.find_one({"_id": ObjectId(problem_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Problem not found")
    return _format_problem(doc)


@router.delete("/problems/{problem_id}", status_code=204)
async def delete_problem(problem_id: str, user: dict = Depends(get_current_user)):
    _recruiter_only(user)
    result = await db.dsa_problems.delete_one(
        {"_id": ObjectId(problem_id), "created_by": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Problem not found")


def _format_problem(doc: dict, hide_hidden_tests: bool = False) -> DSAProblemResponse:
    test_cases = doc.get("test_cases", [])
    if hide_hidden_tests:
        test_cases = [tc for tc in test_cases if not tc.get("is_hidden")]
    return DSAProblemResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc["description"],
        difficulty=doc.get("difficulty", "medium"),
        constraints=doc.get("constraints", ""),
        starter_code=doc.get("starter_code", {}),
        test_cases=test_cases,
        time_limit_seconds=doc.get("time_limit_seconds", 5),
        memory_limit_kb=doc.get("memory_limit_kb", 262144),
        created_by=doc.get("created_by", ""),
        created_at=doc["created_at"],
    )


# ── Debug endpoint: list all sessions (dev only) ──
@router.get("/debug/sessions")
async def debug_sessions():
    """List all DSA sessions (for debugging). Remove in production."""
    sessions = await db.dsa_sessions.find({}).to_list(50)
    return [{"id": str(s["_id"]), "status": s.get("status"), "problem_ids": s.get("problem_ids"), "application_id": s.get("application_id")} for s in sessions]


# ══════════════════════════════════════════════
#  DSA Sessions (provisioned by start-round)
# ══════════════════════════════════════════════

@router.get("/session/{session_id}")
async def get_dsa_session(session_id: str):
    """Get DSA session details + problem (with hidden tests filtered for candidate)."""
    logger.info("DSA get_session called with id=%s", session_id)
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid session ID format: {session_id}")

    session = await db.dsa_sessions.find_one({"_id": oid})
    if not session:
        # Log all sessions to help diagnose
        all_ids = [str(s["_id"]) async for s in db.dsa_sessions.find({}, {"_id": 1}).limit(20)]
        logger.warning("DSA session %s not found. Existing sessions: %s", session_id, all_ids)
        raise HTTPException(status_code=404, detail=f"DSA session not found (id={session_id})")

    problem_ids = session.get("problem_ids") or []
    idx = session.get("current_problem_index", 0)

    # Fallback: if no problem assigned yet, pick the most recent available one
    if not problem_ids:
        latest = await db.dsa_problems.find_one({}, sort=[("created_at", -1)])
        if not latest:
            raise HTTPException(status_code=404, detail="No DSA problems exist yet. Ask the recruiter to create one.")
        problem_ids = [str(latest["_id"])]
        await db.dsa_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"problem_ids": problem_ids}},
        )

    problem = await db.dsa_problems.find_one({"_id": ObjectId(problem_ids[idx])})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Filter hidden test cases for candidates
    visible_tests = [tc for tc in problem.get("test_cases", []) if not tc.get("is_hidden")]

    return {
        "id": str(session["_id"]),
        "application_id": session.get("application_id", ""),
        "candidate_name": session.get("candidate_name", ""),
        "status": session.get("status", "waiting"),
        "time_limit_minutes": session.get("time_limit_minutes", 45),
        "best_score": session.get("best_score", 0),
        "started_at": _utc(session.get("started_at")),
        "created_at": _utc(session.get("created_at")),
        "ended_at": _utc(session.get("ended_at")),
        "problem": {
            "id": str(problem["_id"]),
            "title": problem["title"],
            "description": problem["description"],
            "difficulty": problem.get("difficulty", "medium"),
            "constraints": problem.get("constraints", ""),
            "starter_code": problem.get("starter_code", {}),
            "test_cases": visible_tests,
            "time_limit_seconds": problem.get("time_limit_seconds", 5),
        },
    }


@router.post("/session/{session_id}/start")
async def start_dsa_session(session_id: str):
    """Mark DSA session as started (candidate clicked start)."""
    now = datetime.now(timezone.utc)
    result = await db.dsa_sessions.update_one(
        {"_id": ObjectId(session_id), "status": "waiting"},
        {"$set": {"status": "active", "started_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="Session not found or already started")
    return {"status": "active", "started_at": now}


# ══════════════════════════════════════════════
#  Code Submission & Execution
# ══════════════════════════════════════════════

@router.post("/session/{session_id}/submit", response_model=DSASubmissionResponse)
async def submit_code(session_id: str, req: DSASubmissionCreate):
    """Submit code for a DSA session — runs against ALL test cases (including hidden)."""
    session = await db.dsa_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")
    if session.get("status") not in ("active", "waiting"):
        raise HTTPException(status_code=400, detail="Session is no longer active")

    problem_ids = session.get("problem_ids") or []
    idx = session.get("current_problem_index", 0)
    if not problem_ids:
        latest = await db.dsa_problems.find_one({}, sort=[("created_at", -1)])
        if not latest:
            raise HTTPException(status_code=404, detail="No DSA problems exist yet")
        problem_ids = [str(latest["_id"])]
        await db.dsa_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"problem_ids": problem_ids}},
        )
    problem = await db.dsa_problems.find_one({"_id": ObjectId(problem_ids[idx])})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    all_tests = problem.get("test_cases", [])
    time_limit = problem.get("time_limit_seconds", 5)

    # Run code against all test cases
    test_results = await run_against_test_cases(
        source_code=req.source_code,
        language=req.language,
        test_cases=all_tests,
        time_limit=time_limit,
    )

    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    score = round((passed / total) * 100, 1) if total > 0 else 0

    # Determine overall status
    if all(r["passed"] for r in test_results):
        overall_status = "accepted"
    elif any(r["status"] == "compile_error" for r in test_results):
        overall_status = "compile_error"
    elif any(r["status"] == "time_limit" for r in test_results):
        overall_status = "time_limit"
    elif any(r["status"] == "runtime_error" for r in test_results):
        overall_status = "runtime_error"
    else:
        overall_status = "wrong_answer"

    now = datetime.now(timezone.utc)
    submission_doc = {
        "dsa_session_id": session_id,
        "language": req.language,
        "source_code": req.source_code,
        "status": overall_status,
        "test_results": test_results,
        "score": score,
        "submitted_at": now,
    }
    result = await db.dsa_submissions.insert_one(submission_doc)
    submission_doc["_id"] = result.inserted_id

    # Update session with best score
    existing_best = session.get("best_score", 0)
    if score > existing_best:
        await db.dsa_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"best_score": score, "best_submission_id": str(result.inserted_id)}},
        )

    # If all passed, mark session completed
    if overall_status == "accepted":
        await db.dsa_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": "completed", "ended_at": now}},
        )
        # Update application round_results
        app_id = session.get("application_id")
        if app_id:
            await db.applications.update_one(
                {"_id": ObjectId(app_id), "round_results.dsa_session_id": session_id},
                {"$set": {
                    "round_results.$.status": "completed",
                    "round_results.$.score": score,
                    "round_results.$.completed_at": now,
                }},
            )
            # Auto-advance candidate to next round
            try:
                await auto_advance_candidate(app_id)
            except Exception as e:
                logger.error("Auto-advance failed for app %s: %s", app_id, e)

    return DSASubmissionResponse(
        id=str(submission_doc["_id"]),
        dsa_session_id=session_id,
        language=req.language,
        source_code=req.source_code,
        status=overall_status,
        test_results=test_results,
        score=score,
        submitted_at=now,
    )


@router.post("/session/{session_id}/run")
async def run_code(session_id: str, req: DSASubmissionCreate):
    """Run code against VISIBLE test cases only (no save, no scoring)."""
    session = await db.dsa_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    problem_ids = session.get("problem_ids") or []
    idx = session.get("current_problem_index", 0)
    if not problem_ids:
        latest = await db.dsa_problems.find_one({}, sort=[("created_at", -1)])
        if not latest:
            raise HTTPException(status_code=404, detail="No DSA problems exist yet")
        problem_ids = [str(latest["_id"])]
        await db.dsa_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"problem_ids": problem_ids}},
        )
    problem = await db.dsa_problems.find_one({"_id": ObjectId(problem_ids[idx])})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    visible_tests = [tc for tc in problem.get("test_cases", []) if not tc.get("is_hidden")]
    time_limit = problem.get("time_limit_seconds", 5)

    test_results = await run_against_test_cases(
        source_code=req.source_code,
        language=req.language,
        test_cases=visible_tests,
        time_limit=time_limit,
    )

    passed = sum(1 for r in test_results if r["passed"])
    return {"test_results": test_results, "passed": passed, "total": len(visible_tests)}


@router.post("/session/{session_id}/run-custom")
async def run_custom(session_id: str, req: dict):
    """Run code with custom stdin input — no test comparison, returns raw output."""
    session = await db.dsa_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    source_code = req.get("source_code", "")
    custom_input = req.get("custom_input", "")

    result = await run_custom_input(source_code, custom_input, timeout=5)
    return result


@router.get("/session/{session_id}/submissions")
async def list_submissions(session_id: str):
    """List all submissions for a DSA session."""
    cursor = db.dsa_submissions.find({"dsa_session_id": session_id}).sort("submitted_at", -1)
    subs = await cursor.to_list(50)
    return [
        {
            "id": str(s["_id"]),
            "language": s["language"],
            "source_code": s.get("source_code", ""),
            "status": s["status"],
            "score": s["score"],
            "test_results": s.get("test_results", []),
            "submitted_at": s["submitted_at"],
        }
        for s in subs
    ]


@router.get("/session/{session_id}/submissions/{submission_id}")
async def get_submission(session_id: str, submission_id: str):
    """Get a single submission with full details."""
    sub = await db.dsa_submissions.find_one({
        "_id": ObjectId(submission_id),
        "dsa_session_id": session_id,
    })
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "id": str(sub["_id"]),
        "dsa_session_id": sub["dsa_session_id"],
        "language": sub["language"],
        "source_code": sub.get("source_code", ""),
        "status": sub["status"],
        "score": sub["score"],
        "test_results": sub.get("test_results", []),
        "submitted_at": sub["submitted_at"],
    }


@router.post("/session/{session_id}/end")
async def end_dsa_session(session_id: str):
    """Manually end a DSA session (time's up or candidate finishes)."""
    now = datetime.now(timezone.utc)
    session = await db.dsa_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    await db.dsa_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "completed", "ended_at": now}},
    )

    # Update application round with best score
    app_id = session.get("application_id")
    best_score = session.get("best_score", 0)
    if app_id:
        await db.applications.update_one(
            {"_id": ObjectId(app_id), "round_results.dsa_session_id": session_id},
            {"$set": {
                "round_results.$.status": "completed",
                "round_results.$.score": best_score,
                "round_results.$.completed_at": now,
            }},
        )
        # Auto-advance candidate to next round
        try:
            await auto_advance_candidate(app_id)
        except Exception as e:
            logger.error("Auto-advance failed for app %s: %s", app_id, e)

    return {"status": "completed", "best_score": best_score}


@router.post("/session/{session_id}/proctor-event")
async def record_proctor_event(session_id: str, event: dict):
    """Record a proctoring event (tab switch, window blur, etc.) for a DSA session."""
    session = await db.dsa_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    proctor_entry = {
        "event_type": event.get("event_type", "unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.dsa_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"proctoring_flags": proctor_entry}},
    )
    return {"status": "recorded"}
