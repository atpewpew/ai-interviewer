from datetime import datetime
from typing import Optional, Literal
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


# ══════════════════════════════════════════════
#  ATS — Jobs, Pipelines, Applications
# ══════════════════════════════════════════════

RoundType = Literal["ai_interview", "dsa_coding", "live_1on1", "manual_review"]

class PipelineRound(BaseModel):
    """One stage in a job's interview pipeline."""
    round_number: int = Field(ge=1)
    name: str                               # e.g. "AI Technical Screen"
    round_type: RoundType
    # AI Interview config (used when round_type == "ai_interview")
    interview_config: Optional[dict] = None  # {topics, difficulty, total_questions}
    # DSA config (future — used when round_type == "dsa_coding")
    dsa_config: Optional[dict] = None        # {problem_ids, time_limit_minutes}
    # Live 1-on-1 config (future)
    live_config: Optional[dict] = None


class JobCreate(BaseModel):
    title: str
    department: str = ""
    location: str = ""
    job_type: str = "full_time"              # full_time | part_time | contract | internship
    description: str
    requirements: list[str] = []
    pipeline: list[PipelineRound]            # ordered list of rounds


class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[list[str]] = None
    status: Optional[str] = None             # draft | active | paused | closed
    pipeline: Optional[list[PipelineRound]] = None


class JobResponse(BaseModel):
    id: str
    recruiter_id: str
    title: str
    department: str
    location: str
    job_type: str
    description: str
    requirements: list[str]
    pipeline: list[dict]
    status: str
    applicant_count: int = 0
    created_at: datetime
    updated_at: datetime


# ── Applications (candidate applies to a job) ──

class ApplicationCreate(BaseModel):
    name: str
    email: EmailStr
    github_username: str = ""
    # resume uploaded as file separately


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    candidate_name: str
    candidate_email: str
    github_username: str
    resume_text: Optional[str] = None
    current_round: int                # 1-based — which pipeline round they're at
    stage: str                        # applied | in_progress | advanced | rejected | hired
    round_results: list[dict]         # [{round_number, status, score, report_id, completed_at}]
    applied_at: datetime
    updated_at: datetime


class AdvanceApplicationRequest(BaseModel):
    """HR advances or rejects a candidate in the pipeline."""
    action: Literal["advance", "reject"]
    notes: str = ""


# ══════════════════════════════════════════════
#  Phase 2 — DSA / Coding Round
# ══════════════════════════════════════════════

class TestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False

class DSAProblemCreate(BaseModel):
    title: str
    description: str          # Markdown problem statement
    difficulty: str = Field(pattern="^(easy|medium|hard)$")
    constraints: str = ""
    starter_code: dict = {}   # {python: "def solve(...):", javascript: "function solve(...){}", ...}
    test_cases: list[TestCase]
    time_limit_seconds: int = 5
    memory_limit_kb: int = 262144

class DSAProblemResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    constraints: str
    starter_code: dict
    test_cases: list[dict]     # hidden ones filtered for candidates
    time_limit_seconds: int
    memory_limit_kb: int
    created_by: str
    created_at: datetime

class DSASubmissionCreate(BaseModel):
    language: str              # python, javascript, cpp, java
    source_code: str

class DSASubmissionResponse(BaseModel):
    id: str
    dsa_session_id: str
    language: str
    source_code: str
    status: str                # pending | running | accepted | wrong_answer | time_limit | runtime_error | compile_error
    test_results: list[dict]   # [{input, expected, actual, passed, time_ms}]
    score: float               # 0-100 (% tests passed)
    submitted_at: datetime


# ══════════════════════════════════════════════
#  Phase 3 — Live 1-on-1 Interview Room
# ══════════════════════════════════════════════

class LiveRoomResponse(BaseModel):
    id: str
    application_id: str
    job_id: str
    recruiter_id: str
    candidate_name: str
    candidate_email: str
    status: str                # waiting | active | completed
    transcript: list[dict]     # [{speaker, text, timestamp}]
    hr_notes: list[dict]       # [{text, timestamp}]
    ai_summary: Optional[str] = None
    created_at: datetime

class HRNoteCreate(BaseModel):
    text: str

class LiveRoomSummaryRequest(BaseModel):
    """Trigger AI summary generation."""
    pass


# ══════════════════════════════════════════════
#  Phase 4 — Email & Scorecard
# ══════════════════════════════════════════════

class EmailSendRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str

class ScorecardResponse(BaseModel):
    application_id: str
    candidate_name: str
    candidate_email: str
    job_title: str
    rounds: list[dict]         # [{round_number, name, type, status, score, summary}]
    overall_recommendation: str
    overall_score: Optional[float] = None
    generated_at: datetime

