"""
Server-side proctoring using MediaPipe Tasks API (mediapipe >= 0.10).
Model files are downloaded once to services/mp_models/ and reused.
"""

import base64
import logging
import os
import time
import urllib.request

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model files — downloaded once at startup
# ---------------------------------------------------------------------------
_MODELS_DIR = os.path.join(os.path.dirname(__file__), "mp_models")
_FACE_DETECTOR_PATH = os.path.join(_MODELS_DIR, "blaze_face_short_range.tflite")
_FACE_LANDMARKER_PATH = os.path.join(_MODELS_DIR, "face_landmarker.task")

_FACE_DETECTOR_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
)
_FACE_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)


def _ensure_models() -> bool:
    """Download model files if absent. Returns True on success."""
    try:
        os.makedirs(_MODELS_DIR, exist_ok=True)
        for path, url in [
            (_FACE_DETECTOR_PATH, _FACE_DETECTOR_URL),
            (_FACE_LANDMARKER_PATH, _FACE_LANDMARKER_URL),
        ]:
            if not os.path.exists(path):
                logger.info("Downloading MediaPipe model from %s ...", url)
                urllib.request.urlretrieve(url, path)
                logger.info("Saved to %s", path)
        return True
    except Exception as exc:
        logger.error("Could not download MediaPipe models: %s", exc)
        return False


_models_ready = _ensure_models()

# ---------------------------------------------------------------------------
# Shared detector / landmarker instances (one per process)
# ---------------------------------------------------------------------------
_face_detector = None
_face_landmarker = None

if _models_ready:
    try:
        _face_detector = mp_vision.FaceDetector.create_from_options(
            mp_vision.FaceDetectorOptions(
                base_options=mp_python.BaseOptions(model_asset_path=_FACE_DETECTOR_PATH),
                min_detection_confidence=0.5,
            )
        )
        _face_landmarker = mp_vision.FaceLandmarker.create_from_options(
            mp_vision.FaceLandmarkerOptions(
                base_options=mp_python.BaseOptions(model_asset_path=_FACE_LANDMARKER_PATH),
                num_faces=1,
                min_face_detection_confidence=0.5,
                min_face_presence_confidence=0.5,
            )
        )
        logger.info("MediaPipe Tasks proctoring models loaded.")
    except Exception as exc:
        logger.error("Failed to initialise MediaPipe models: %s", exc)
        _face_detector = None
        _face_landmarker = None


class ProctoringAnalyzer:
    """Per-session proctoring state. Processes video frames and browser events."""

    # Penalty rates (points per second of bad behaviour)
    PENALTY_NO_FACE = 5.0
    PENALTY_CROWD = 10.0
    PENALTY_LOOKING_AWAY = 5.0
    PENALTY_BACKGROUND = 10.0
    TAB_SWITCH_PENALTY = 5.0
    WINDOW_BLUR_PENALTY = 5.0
    DECAY_GOOD_BEHAVIOR = 0.5

    # Detection thresholds
    HEAD_YAW_THRESHOLD = 7.0

    # Minimum seconds between two flags of the same type
    FLAG_COOLDOWN = 10.0

    def __init__(self):
        self.risk_score: float = 0.0
        self.is_in_background: bool = False
        self.flags: list[dict] = []
        self._last_flag_time: dict[str, float] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _add_flag(self, flag_type: str, severity: str):
        now = time.time()
        if now - self._last_flag_time.get(flag_type, 0) < self.FLAG_COOLDOWN:
            return
        self._last_flag_time[flag_type] = now
        self.flags.append({"type": flag_type, "timestamp": now, "severity": severity})

    # ------------------------------------------------------------------
    # Browser event handler
    # ------------------------------------------------------------------

    def process_event(self, event_type: str) -> dict:
        if event_type == "tab_switch":
            self.is_in_background = True
            self.risk_score = min(100.0, self.risk_score + self.TAB_SWITCH_PENALTY)
            self._add_flag("TAB_SWITCH", "high")
            return {"risk_score": self.risk_score, "message": "Tab switch detected"}

        if event_type == "window_blur":
            self.is_in_background = True
            self.risk_score = min(100.0, self.risk_score + self.WINDOW_BLUR_PENALTY)
            self._add_flag("WINDOW_BLUR", "medium")
            return {"risk_score": self.risk_score, "message": "Window lost focus"}

        if event_type in ("tab_focus", "window_focus"):
            self.is_in_background = False
            return {"risk_score": self.risk_score, "message": "Candidate returned"}

        return {"risk_score": self.risk_score, "message": "Unknown event"}

    # ------------------------------------------------------------------
    # Frame processor
    # ------------------------------------------------------------------

    def process_frame(self, base64_image: str, frame_interval: int = 1000) -> dict:
        """Analyse a webcam frame. Returns current risk assessment dict."""
        time_scale = frame_interval / 1000.0

        if _face_detector is None:
            return {"risk_score": self.risk_score, "message": "Proctoring unavailable"}

        # --- Decode image ---
        try:
            raw = base64_image.split(",", 1)[1] if "," in base64_image else base64_image
            img_bytes = base64.b64decode(raw)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                return {"risk_score": self.risk_score, "message": "Invalid frame"}
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        except Exception as exc:
            logger.debug("Frame decode error: %s", exc)
            return {"risk_score": self.risk_score, "message": "Frame error"}

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        # --- Stage 1: face count ---
        try:
            det_result = _face_detector.detect(mp_image)
            face_count = len(det_result.detections) if det_result.detections else 0
        except Exception as exc:
            logger.debug("Face detection error: %s", exc)
            return {"risk_score": self.risk_score, "message": "Detection error"}

        msg = "Normal behaviour."

        if face_count == 0:
            self.risk_score = min(100.0, self.risk_score + self.PENALTY_NO_FACE * time_scale)
            self._add_flag("NO_FACE", "high")
            msg = "Candidate not visible"

        elif face_count == 1 and _face_landmarker is not None:
            # --- Stage 2: landmarks for gaze + lip analysis ---
            try:
                lm_result = _face_landmarker.detect(mp_image)
            except Exception as exc:
                logger.debug("Landmark error: %s", exc)
                lm_result = None

            if lm_result and lm_result.face_landmarks:
                lm = lm_result.face_landmarks[0]  # list of NormalizedLandmark

                # Head yaw (nose relative to face edges)
                nose_x = lm[1].x
                left_x = lm[234].x
                right_x = lm[454].x
                dist_left = abs(nose_x - left_x)
                dist_right = abs(right_x - nose_x)
                yaw_ratio = dist_left / max(dist_right, 0.001)
                is_looking_away = (
                    yaw_ratio > self.HEAD_YAW_THRESHOLD
                    or yaw_ratio < (1 / self.HEAD_YAW_THRESHOLD)
                )

                # State hierarchy
                if self.is_in_background:
                    self.risk_score = min(100.0, self.risk_score + self.PENALTY_BACKGROUND * time_scale)
                    msg = "Candidate is on another tab"
                elif is_looking_away:
                    self.risk_score = min(100.0, self.risk_score + self.PENALTY_LOOKING_AWAY * time_scale)
                    self._add_flag("LOOKING_AWAY", "medium")
                    msg = f"Looking away (yaw={yaw_ratio:.2f})"
                elif self.risk_score > 0:
                    self.risk_score = max(0.0, self.risk_score - self.DECAY_GOOD_BEHAVIOR * time_scale)
                    msg = "Normal behaviour."
            else:
                self.risk_score = min(100.0, self.risk_score + self.PENALTY_NO_FACE * time_scale)
                msg = "Face landmarks unavailable"

        elif face_count > 1:
            self.risk_score = min(100.0, self.risk_score + self.PENALTY_CROWD * time_scale)
            self._add_flag("MULTIPLE_FACES", "high")
            msg = f"{face_count} faces detected"

        return {"risk_score": round(self.risk_score, 1), "message": msg}

    # ------------------------------------------------------------------
    # Score / flags accessors
    # ------------------------------------------------------------------

    def get_proctoring_score(self) -> float:
        """100 = clean session, 0 = worst."""
        return round(max(0.0, 100.0 - self.risk_score), 1)

    def get_flags_for_report(self) -> list[dict]:
        from datetime import datetime, timezone
        return [
            {
                "type": f["type"],
                "timestamp": datetime.fromtimestamp(f["timestamp"], tz=timezone.utc).isoformat(),
                "severity": f["severity"],
            }
            for f in self.flags
        ]
