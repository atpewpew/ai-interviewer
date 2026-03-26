import { useCallback, useRef, useState, useEffect } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const voicesRef = useRef([]);

  // Pre-load voices (Chrome loads them asynchronously)
  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis?.getVoices() || [];
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API not supported');
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const doSpeak = (voices) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const preferred = voices.find(
        (v) => v.lang === 'en-US' && v.name.includes('Google')
      ) || voices.find((v) => v.lang === 'en-US') || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        if (e.error !== 'canceled') onEnd?.();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet in Chrome
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      // Wait for voices to become available
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        doSpeak(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      // Fallback: if voiceschanged never fires, speak with no voice preference
      setTimeout(() => {
        if (!utteranceRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', handler);
          doSpeak([]);
        }
      }, 500);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
