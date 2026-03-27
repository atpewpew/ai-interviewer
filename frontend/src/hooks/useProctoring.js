import { useCallback, useEffect, useRef } from 'react';

/**
 * Server-side proctoring via MediaPipe.
 * Captures webcam frames at ~1 FPS and sends them to the backend
 * through the interview WebSocket. Also sends tab/window events.
 *
 * @param {Function} sendJSON - sends JSON over the interview WS
 * @param {React.RefObject} videoRef - ref to the Webcam component
 */
export function useProctoring(sendJSON, videoRef) {
  const intervalRef = useRef(null);

  const captureFrame = useCallback(() => {
    // react-webcam exposes .video on the ref
    const video = videoRef?.current?.video || videoRef?.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 320, 240);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    const base64 = dataUrl.split(',')[1];

    sendJSON({ event: 'frame', image: base64, frame_interval: 1000 });
  }, [sendJSON, videoRef]);

  const startDetection = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(captureFrame, 1000);
  }, [captureFrame]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tab switch / window blur events sent via WS
  useEffect(() => {
    const handleVisibility = () => {
      sendJSON({ event: document.hidden ? 'tab_switch' : 'tab_focus' });
    };
    const handleBlur = () => sendJSON({ event: 'window_blur' });
    const handleFocus = () => sendJSON({ event: 'window_focus' });

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sendJSON]);

  return {
    isLoaded: true, // no client-side model loading needed
    startDetection,
    stopDetection,
  };
}
