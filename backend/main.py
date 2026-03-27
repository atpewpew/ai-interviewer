from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import connect_db, close_db, FRONTEND_URL
from routers import auth, interviews, candidates, sessions, reports, ws_interview, tts, jobs, applications, dsa, live_room, scorecard

app = FastAPI(title="InterviewOS API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(interviews.router, prefix="/interviews", tags=["Interviews"])
app.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(tts.router, prefix="/tts", tags=["TTS"])
app.include_router(dsa.router, prefix="/dsa", tags=["DSA Coding"])
app.include_router(live_room.router, prefix="/live-room", tags=["Live Room"])
app.include_router(scorecard.router, prefix="/scorecard", tags=["Scorecard"])
app.include_router(ws_interview.router, tags=["WebSocket Interview"])


@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


@app.get("/health")
async def health():
    return {"status": "ok"}
