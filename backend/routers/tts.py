import logging
import httpx
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from config import DEEPGRAM_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter()


def _truncate_for_speech(text: str, max_chars: int = 200) -> str:
    """Truncate text at the nearest sentence boundary before max_chars."""
    if len(text) <= max_chars:
        return text
    # Find last sentence-ending punctuation before max_chars
    truncated = text[:max_chars]
    for end_char in ['. ', '? ', '! ']:
        last_idx = truncated.rfind(end_char)
        if last_idx > 0:
            return truncated[:last_idx + 1]
    # No sentence boundary found — cut at last space
    last_space = truncated.rfind(' ')
    if last_space > 0:
        return truncated[:last_space] + "?"
    return truncated


@router.get("/speak")
async def speak(text: str = Query(..., description="Text to synthesize")):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is not configured")

    # Hard truncation safety net — spoken questions should be short
    speech_text = _truncate_for_speech(text)

    url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"text": speech_text}

    # Proxy the audio stream from Deepgram
    async def generate():
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err = await response.aread()
                    logger.error(f"Deepgram TTS error {response.status_code}: {err}")
                    return
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk

    return StreamingResponse(generate(), media_type="audio/mpeg")
