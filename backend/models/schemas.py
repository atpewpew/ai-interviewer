from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Auth ──
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: str = Field(pattern="^(recruiter|candidate)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


# ── Interviews ──
class InterviewCreate(BaseModel):
    title: str
    job_role: str
    job_description: str
    topics: list[str]
    difficulty: str = Field(pattern="^(easy|medium|hard)$")
    total_questions: int = Field(ge=3, le=20)


class InterviewResponse(BaseModel):
    id: str
    recruiter_id: str
    title: str
    job_role: str
    job_description: str
    topics: list[str]
    difficulty: str
    total_questions: int
    created_at: datetime


# ── Candidates ──
class CandidateRegister(BaseModel):
    name: str
    email: EmailStr
    interview_id: str


class CandidateResponse(BaseModel):
    id: str
    name: str
    email: str
    interview_id: str
    resume_text: Optional[str] = None
    github_username: str = ""
    status: str


# ── Sessions ──
class SessionResponse(BaseModel):
    id: str
    candidate_id: str
    interview_id: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class ProctoringFlag(BaseModel):
    type: str = Field(pattern="^(NO_FACE|MULTIPLE_FACES|LOOKING_AWAY|TAB_SWITCH|WINDOW_BLUR)$")
    timestamp: datetime
    severity: str = Field(pattern="^(low|medium|high)$")


# ── Messages (turn data) ──
class TurnScore(BaseModel):
    technical: float = Field(ge=0, le=10)
    communication: float = Field(ge=0, le=10)
    depth: float = Field(ge=0, le=10)


class MessageResponse(BaseModel):
    id: str
    session_id: str
    turn_number: int
    question: str
    topic: str
    difficulty: str
    answer_transcript: str
    scores: TurnScore
    llm_feedback: str
    justifications: Optional[dict] = None
    contradiction_note: Optional[str] = None
    speech_metrics: Optional[dict] = None
    proctoring_snapshot: Optional[float] = None
    timestamp: datetime


# ── Reports ──
class DimensionScores(BaseModel):
    technical: float
    communication: float
    depth: float
    consistency: float


class ReportResponse(BaseModel):
    id: str
    session_id: str
    candidate_id: str
    interview_id: str
    overall_score: float
    dimension_scores: DimensionScores
    dimension_justifications: Optional[dict] = None
    recommendation: str
    strengths: list[str]
    red_flags: list[str]
    proctoring_score: float
    proctoring_flags: list[dict] = []
    per_question_proctoring: list[dict] = []
    speech_metrics_summary: Optional[dict] = None
    full_summary: str
    generated_at: datetime


# ── WebSocket messages ──
class WSInterviewResponse(BaseModel):
    transcript: str
    scores: Optional[TurnScore] = None
    feedback: Optional[str] = None
    next_question: Optional[str] = None
    topic: Optional[str] = None
    turn_number: int
    is_complete: bool
