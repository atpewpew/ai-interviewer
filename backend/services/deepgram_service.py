import logging
import asyncio
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
from config import DEEPGRAM_API_KEY

logger = logging.getLogger(__name__)


FILLER_WORDS = {"um", "uh", "like", "you know", "basically", "actually", "so", "well", "right", "okay"}


class DeepgramTranscriber:
    """Manages a live Deepgram transcription session."""

    def __init__(self):
        self.client = DeepgramClient(DEEPGRAM_API_KEY)
        self.connection = None
        self.final_transcript = ""
        self.interim_transcript = ""
        self._transcript_ready = asyncio.Event()
        self._is_connected = False
        # Speech metadata accumulators
        self._words: list[dict] = []  # {word, start, end, confidence}
        self._confidence_sum: float = 0.0
        self._confidence_count: int = 0

    async def connect(self):
        """Open a live transcription connection."""
        self.connection = self.client.listen.asyncwebsocket.v("1")

        self.connection.on(LiveTranscriptionEvents.Transcript, self._on_transcript)
        self.connection.on(LiveTranscriptionEvents.Error, self._on_error)
        self.connection.on(LiveTranscriptionEvents.Close, self._on_close)

        options = LiveOptions(
            model="nova-2",
            language="en-US",
            punctuate=True,
            interim_results=True,
            endpointing=300,
            smart_format=True,
            encoding="linear16",
            sample_rate=16000,
            channels=1,
        )

        if await self.connection.start(options):
            self._is_connected = True
            logger.info("Deepgram connection established")
        else:
            raise ConnectionError("Failed to connect to Deepgram")

    async def send_audio(self, audio_chunk: bytes):
        """Send audio data to Deepgram."""
        if self._is_connected and self.connection:
            try:
                await self.connection.send(audio_chunk)
            except Exception as e:
                logger.error("send() failed - %s", e)
                self._is_connected = False

    async def wait_for_final_transcript(self, timeout: float = 10.0) -> str:
        """Wait for a final transcript. Does not clear accumulated text."""
        if not self._transcript_ready.is_set():
            try:
                await asyncio.wait_for(self._transcript_ready.wait(), timeout=timeout)
            except asyncio.TimeoutError:
                logger.warning("Transcript timeout — returning what we have")
        return self.final_transcript.strip()

    async def close(self):
        """Close the Deepgram connection."""
        self._is_connected = False
        if self.connection:
            try:
                await self.connection.finish()
            except Exception:
                pass

    def get_speech_metrics(self) -> dict:
        """Return accumulated speech quality metrics for the current turn."""
        total_words = len(self._words)
        if total_words == 0:
            return {
                "total_words": 0,
                "avg_confidence": 0.0,
                "words_per_minute": 0.0,
                "filler_word_count": 0,
                "filler_words_found": [],
            }

        avg_conf = self._confidence_sum / self._confidence_count if self._confidence_count else 0.0

        # Calculate words per minute from word timestamps
        if total_words >= 2:
            duration = self._words[-1]["end"] - self._words[0]["start"]
            wpm = (total_words / duration * 60) if duration > 0 else 0.0
        else:
            wpm = 0.0

        # Count filler words
        filler_found = []
        for w in self._words:
            if w["word"].lower().strip(".,!?") in FILLER_WORDS:
                filler_found.append(w["word"].lower().strip(".,!?"))

        return {
            "total_words": total_words,
            "avg_confidence": round(avg_conf, 3),
            "words_per_minute": round(wpm, 1),
            "filler_word_count": len(filler_found),
            "filler_words_found": filler_found,
        }

    def reset_turn_metrics(self):
        """Reset metrics accumulators for a new turn."""
        self.final_transcript = ""
        self.interim_transcript = ""
        self._transcript_ready.clear()
        self._words = []
        self._confidence_sum = 0.0
        self._confidence_count = 0

    async def _on_transcript(self, _self, result, **kwargs):
        """Handle transcript events from Deepgram."""
        try:
            alt = result.channel.alternatives[0]
            transcript = alt.transcript
            if not transcript:
                return

            if result.is_final:
                self.final_transcript += " " + transcript
                self.final_transcript = self.final_transcript.strip()

                # Extract word-level data from final results
                if hasattr(alt, "words") and alt.words:
                    for w in alt.words:
                        self._words.append({
                            "word": w.word if hasattr(w, "word") else str(w),
                            "start": getattr(w, "start", 0),
                            "end": getattr(w, "end", 0),
                            "confidence": getattr(w, "confidence", 0),
                        })

                # Accumulate utterance-level confidence
                if hasattr(alt, "confidence") and alt.confidence:
                    self._confidence_sum += alt.confidence
                    self._confidence_count += 1

                if result.speech_final:
                    self._transcript_ready.set()
            else:
                self.interim_transcript = transcript
        except Exception as e:
            logger.error("Error processing transcript: %s", str(e))

    async def _on_error(self, _self, error, **kwargs):
        logger.error("Deepgram error: %s", str(error))
        self._is_connected = False
        self._transcript_ready.set()
    async def _on_close(self, _self, close, **kwargs):
        self._is_connected = False

    def get_interim(self) -> str:
        return self.interim_transcript
