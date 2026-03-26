import { useCallback, useEffect, useRef, useState } from 'react';
import { submitProctoringFlag } from '../api';

export function useProctoring(sessionId, videoRef) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [flags, setFlags] = useState([]);
  const intervalRef = useRef(null);
  const noFaceCountRef = useRef(0);
  const faceApiRef = useRef(null);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      const faceapi = await import('face-api.js');
      faceApiRef.current = faceapi;

      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);
      setIsLoaded(true);
    } catch (err) {
      console.error('Failed to load face-api models:', err);
      // Still allow interview to proceed without proctoring
      setIsLoaded(true);
    }
  }, []);

  // Submit a flag
  const addFlag = useCallback(async (type, severity) => {
    const flag = {
      type,
      timestamp: new Date().toISOString(),
      severity,
    };
    setFlags((prev) => [...prev, flag]);
    if (sessionId) {
      try {
        await submitProctoringFlag(sessionId, flag);
      } catch (err) {
        console.error('Failed to submit proctoring flag:', err);
      }
    }
  }, [sessionId]);

  // Start detection loop
  const startDetection = useCallback(() => {
    if (!faceApiRef.current || !videoRef?.current) return;
    const faceapi = faceApiRef.current;

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);

        if (detections.length === 0) {
          noFaceCountRef.current++;
          if (noFaceCountRef.current >= 2) { // 3+ seconds (every 2s check)
            addFlag('NO_FACE', 'high');
            noFaceCountRef.current = 0;
          }
        } else {
          noFaceCountRef.current = 0;

          if (detections.length > 1) {
            addFlag('MULTIPLE_FACES', 'high');
          }

          // Basic gaze check using nose position relative to face box
          const face = detections[0];
          const nose = face.landmarks.getNose();
          const box = face.detection.box;
          const noseTip = nose[3]; // tip of nose
          const centerX = box.x + box.width / 2;
          const deviation = Math.abs(noseTip.x - centerX) / box.width;
          if (deviation > 0.25) {
            addFlag('LOOKING_AWAY', 'medium');
          }
        }
      } catch {
        // Detection can fail occasionally, just skip
      }
    }, 2000);
  }, [videoRef, addFlag]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tab switch / window blur detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        addFlag('TAB_SWITCH', 'high');
      }
    };
    const handleBlur = () => {
      addFlag('WINDOW_BLUR', 'medium');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [addFlag]);

  return {
    isLoaded,
    flags,
    loadModels,
    startDetection,
    stopDetection,
  };
}
