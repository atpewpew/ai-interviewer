from bson import ObjectId
from fastapi import APIRouter, HTTPException
from config import db
from models.schemas import ReportResponse

router = APIRouter()


@router.get("/session/{session_id}", response_model=ReportResponse)
async def get_report_by_session(session_id: str):
    r = await db.reports.find_one({"session_id": session_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found or not yet generated")
    return _format(r)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str):
    r = await db.reports.find_one({"_id": ObjectId(report_id)})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return _format(r)


def _format(r: dict) -> ReportResponse:
    from models.schemas import DimensionScores

    return ReportResponse(
        id=str(r["_id"]),
        session_id=r["session_id"],
        candidate_id=r["candidate_id"],
        interview_id=r["interview_id"],
        overall_score=r["overall_score"],
        dimension_scores=DimensionScores(**r["dimension_scores"]),
        dimension_justifications=r.get("dimension_justifications"),
        recommendation=r["recommendation"],
        strengths=r["strengths"],
        red_flags=r["red_flags"],
        proctoring_score=r["proctoring_score"],
        proctoring_flags=r.get("proctoring_flags", []),
        per_question_proctoring=r.get("per_question_proctoring", []),
        speech_metrics_summary=r.get("speech_metrics_summary"),
        full_summary=r["full_summary"],
        generated_at=r["generated_at"],
    )
