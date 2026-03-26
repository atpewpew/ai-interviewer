import { useCallback, useRef, useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!text) {
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsSpeaking(false);
    }

    setIsSpeaking(true);

    try {
      const url = `${API_BASE}/tts/speak?text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error', e);
        setIsSpeaking(false);
        onEnd?.();
      };

      // Play the audio
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
        setIsSpeaking(false);
        onEnd?.();
      });
    } catch (e) {
      console.error('TTS execution error', e);
      setIsSpeaking(false);
      onEnd?.();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
