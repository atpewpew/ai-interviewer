"""
Aggregated Scorecard — rolls up all round results for a candidate application.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from config import db
from dependencies import get_current_user
from models.schemas import ScorecardResponse

router = APIRouter()


def _recruiter_only(user: dict):
    if user["role"] != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter only")


@router.get("/{app_id}", response_model=ScorecardResponse)
async def get_scorecard(app_id: str, user: dict = Depends(get_current_user)):
    """Build an aggregated scorecard for an application across all rounds."""
    _recruiter_only(user)

    app = await db.applications.find_one({"_id": ObjectId(app_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    pipeline = job.get("pipeline", [])
    round_results = app.get("round_results", [])

    # Build a lookup from round_number → round_result
    rr_map = {r["round_number"]: r for r in round_results}

    rounds = []
    total_score = 0.0
    scored_count = 0

    for p_round in pipeline:
        rn = p_round["round_number"]
        rr = rr_map.get(rn, {})

        round_data = {
            "round_number": rn,
            "name": p_round["name"],
            "type": p_round["round_type"],
            "status": rr.get("status", "not_started"),
            "score": rr.get("score"),
            "summary": None,
        }

        # Enrich with report summary for AI interviews
        if rr.get("report_id"):
            report = await db.reports.find_one({"_id": ObjectId(rr["report_id"])})
            if report:
                round_data["score"] = report.get("overall_score")
                round_data["summary"] = report.get("full_summary", "")[:500]

        # Enrich with DSA session best score
        if rr.get("dsa_session_id"):
            dsa_sess = await db.dsa_sessions.find_one({"_id": ObjectId(rr["dsa_session_id"])})
            if dsa_sess:
                round_data["score"] = dsa_sess.get("best_score")
                round_data["summary"] = f"Best score: {dsa_sess.get('best_score', 0)}% — Submissions: {dsa_sess.get('submission_count', 0)}"

        # Enrich with live room summary
        if rr.get("live_room_id"):
            room = await db.live_rooms.find_one({"_id": ObjectId(rr["live_room_id"])})
            if room:
                round_data["summary"] = room.get("ai_summary", "")[:500]

        if round_data["score"] is not None:
            total_score += round_data["score"]
            scored_count += 1

        rounds.append(round_data)

    overall_score = round(total_score / scored_count, 1) if scored_count > 0 else None

    # Generate recommendation based on scores and stage
    stage = app.get("stage", "applied")
    if stage == "hired":
        recommendation = "Hired"
    elif stage == "rejected":
        recommendation = "Rejected"
    elif overall_score is not None and overall_score >= 75:
        recommendation = "Strong Hire"
    elif overall_score is not None and overall_score >= 50:
        recommendation = "Lean Hire"
    elif overall_score is not None:
        recommendation = "No Hire"
    else:
        recommendation = "Pending"

    return ScorecardResponse(
        application_id=app_id,
        candidate_name=app["candidate_name"],
        candidate_email=app["candidate_email"],
        job_title=job["title"],
        rounds=rounds,
        overall_recommendation=recommendation,
        overall_score=overall_score,
        generated_at=datetime.now(timezone.utc),
    )
