import logging
import asyncio
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
from config import DEEPGRAM_API_KEY

logger = logging.getLogger(__name__)


class DeepgramTranscriber:
    """Manages a live Deepgram transcription session."""

    def __init__(self):
        self.client = DeepgramClient(DEEPGRAM_API_KEY)
        self.connection = None
        self.final_transcript = ""
        self.interim_transcript = ""
        self._transcript_ready = asyncio.Event()
        self._is_connected = False

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

    async def _on_transcript(self, _self, result, **kwargs):
        """Handle transcript events from Deepgram."""
        try:
            transcript = result.channel.alternatives[0].transcript
            if not transcript:
                return

            if result.is_final:
                self.final_transcript += " " + transcript
                self.final_transcript = self.final_transcript.strip()
                if result.speech_final:
                    self._transcript_ready.set()
            else:
                self.interim_transcript = transcript
        except Exception as e:
            logger.error("Error processing transcript: %s", str(e))

    async def _on_error(self, _self, error, **kwargs):
        logger.error("Deepgram error: %s", str(error))
        self._is_connected = False
        self._transcript_ready.set()  # unblock any waiting wait_for_final_transcript

    async def _on_close(self, _self, close, **kwargs):
        self._is_connected = False

    def get_interim(self) -> str:
        return self.interim_transcript
