import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

client: AsyncIOMotorClient = None


class _DB:
    """Wrapper so all importers share the same mutable reference."""
    def __getattr__(self, name):
        if client is None:
            raise RuntimeError("Database not connected yet")
        return getattr(client.interviewos, name)


db = _DB()


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI)


async def close_db():
    global client
    if client:
        client.close()
        client = None
