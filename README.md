# InterviewOS — Agentic AI Interviewer Platform

A production-grade AI-powered interview platform with real-time voice interaction, adaptive questioning, proctoring, and comprehensive candidate reporting.

## Tech Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 19, Bootstrap, Chart.js, face-api.js, Web Speech API        |
| Backend   | FastAPI, Motor (async MongoDB), WebSockets                        |
| AI/Speech | Groq (Llama 3.3 70B), Deepgram (Nova-2 STT), Web Speech API (TTS) |
| Database  | MongoDB Atlas (M0 free tier)                                      |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (M0 free tier)
- Groq API key
- Deepgram API key

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your actual API keys and MongoDB URI in .env

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:8000`.

## Architecture

### Recruiter Flow

1. Register/Login → Dashboard
2. Create interview (set job role, topics, difficulty, question count)
3. Copy candidate invite link
4. View candidate results and detailed reports

### Candidate Flow

1. Open invite link → Enter name, email, upload resume
2. Lobby → Camera/mic check, proctoring consent
3. Interview Room → Real-time AI voice interview with:
   - Adaptive questioning based on performance
   - Live transcription via Deepgram
   - Per-turn scoring visualization
   - Browser-side proctoring (face detection, tab switching)
4. Report auto-generated after session ends

### WebSocket Interview Loop

```
Browser Mic → WebSocket → FastAPI → Deepgram STT → Groq LLM (evaluate + next Q)
                                                        ↓
Browser TTS ← WebSocket ← FastAPI ← scores + next question
```

## Environment Variables

| Variable           | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `MONGO_URI`        | MongoDB Atlas connection string                           |
| `GROQ_API_KEY`     | Groq API key for Llama 3.3 70B                            |
| `DEEPGRAM_API_KEY` | Deepgram API key for Nova-2                               |
| `JWT_SECRET`       | Random string for JWT signing                             |
| `FRONTEND_URL`     | Frontend origin for CORS (default: http://localhost:5173) |

## Project Structure

```
backend/
├── main.py              # FastAPI app, CORS, routers
├── config.py            # DB connection, settings
├── dependencies.py      # JWT auth middleware
├── routers/             # API endpoints
│   ├── auth.py          # Register/Login
│   ├── interviews.py    # CRUD for interviews
│   ├── candidates.py    # Candidate registration + resume upload
│   ├── sessions.py      # Session management + proctoring flags
│   ├── reports.py       # Report retrieval
│   └── ws_interview.py  # WebSocket interview handler
├── services/            # Business logic
│   ├── llm_service.py   # Groq LLM calls
│   ├── deepgram_service.py  # STT streaming
│   ├── resume_service.py    # PDF parsing
│   └── report_service.py   # Report generation
└── models/
    └── schemas.py       # Pydantic models

frontend/
├── src/
│   ├── context/         # AuthContext, InterviewContext
│   ├── hooks/           # useMicrophone, useSpeech, useProctoring, useWebSocket
│   ├── pages/
│   │   ├── recruiter/   # Login, Dashboard, CreateInterview, CandidateList, Report
│   │   └── candidate/   # Entry, Lobby, InterviewRoom, Complete
│   └── components/
│       ├── shared/      # Navbar, ProtectedRoute, LoadingSpinner
│       ├── recruiter/   # ScoreRadarChart, CandidateCard, ProctoringTimeline
│       └── candidate/   # AIAvatar, QuestionDisplay, TranscriptPanel, ScoreLiveFeed
```

## Demo Notes

- Use **Chrome** or **Edge** (Web Speech API TTS requirement)
- Set MongoDB Atlas IP whitelist to `0.0.0.0/0` for team development
- face-api.js models should be placed in `frontend/public/models/`
