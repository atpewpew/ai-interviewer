import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { useInterview, InterviewProvider } from '../../context/InterviewContext';
import { useMicrophone } from '../../hooks/useMicrophone';
import { useSpeech } from '../../hooks/useSpeech';
import { useProctoring } from '../../hooks/useProctoring';
import {
  Mic, MicOff, Camera, CameraOff,
  AlertCircle, Keyboard, PhoneOff, MessageSquare,
} from 'lucide-react';
import '../../styles/interview-room.css';

function InterviewRoomInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const webcamRef = useRef(null);
  const sessionId = sessionStorage.getItem('sessionId') || searchParams.get('sid');

  const {
    interviewState, setInterviewState,
    currentQuestion, currentTopic, turnNumber, totalQuestions,
    transcript, interimTranscript, isComplete,
    proctoringRisk,
    connectWS, sendAudio, sendCommand, sendJSON, disconnectWS,
  } = useInterview();

  const { isSpeaking, speak } = useSpeech();
  const { isLoaded: proctoringLoaded, startDetection, stopDetection } = useProctoring(sendJSON, webcamRef);

  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [textInput, setTextInput] = useState('');
  const [camOn, setCamOn] = useState(true);

  // Connect WebSocket on mount, clean up on unmount
  useEffect(() => {
    if (sessionId) {
      connectWS(sessionId);
    }
    return () => {
      disconnectWS();
      stopDetection();
    };
  }, [sessionId]);

  // Start proctoring when ready
  useEffect(() => {
    if (proctoringLoaded) {
      startDetection();
    }
  }, [proctoringLoaded, startDetection]);

  // When AI has a new question to speak (AI_SPEAKING state)
  useEffect(() => {
    if (interviewState === 'AI_SPEAKING' && currentQuestion) {
      speak(currentQuestion, () => {
        // TTS finished — now start listening
        setInterviewState('LISTENING');
      });
    }
  }, [interviewState, currentQuestion, speak, setInterviewState]);

  // Audio callback — send to WebSocket
  const handleAudioData = useCallback((audioBuffer) => {
    sendAudio(audioBuffer);
  }, [sendAudio]);

  const { isRecording, volumeLevel, startRecording, stopRecording } = useMicrophone(handleAudioData);

  // Start mic when entering LISTENING state (voice mode only)
  useEffect(() => {
    if (interviewState === 'LISTENING' && !isRecording && inputMode === 'voice') {
      startRecording();
    }
  }, [interviewState, isRecording, startRecording, inputMode]);

  // Handle candidate submitting their answer (voice mode — stop recording)
  const handleSubmitAnswer = () => {
    stopRecording();
    sendCommand('stop_recording');
    setInterviewState('PROCESSING');
  };

  // Handle text submission
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    sendJSON({ command: 'text_input', text: textInput.trim() });
    setTextInput('');
    setInterviewState('PROCESSING');
  };

  // Toggle between voice and text modes
  const toggleInputMode = () => {
    if (inputMode === 'voice') {
      if (isRecording) stopRecording();
      setInputMode('text');
    } else {
      setInputMode('voice');
      if (interviewState === 'LISTENING') startRecording();
    }
  };

  // Redirect when interview complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        navigate('/interview/complete');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, navigate]);

  const progress = totalQuestions > 0 ? ((turnNumber) / totalQuestions) * 100 : 0;

  // Proctoring risk helpers
  const risk = proctoringRisk.score;
  const gaugeColor = risk < 30 ? '#22c55e' : risk < 70 ? '#eab308' : '#ef4444';
  const riskLabel = risk < 30 ? 'Low Risk' : risk < 70 ? 'Med Risk' : 'High Risk';
  const CIRC = 94.25;
  const offset = CIRC - (risk / 100) * CIRC;

  // Transcript helpers
  const hasTranscript = transcript || interimTranscript;

  return (
    <div className="ir2-room">
      {/* ════════ TOP BAR ════════ */}
      <div className="ir2-topbar">
        <div className="ir2-topbar-left">
          {/* Recording pill */}
          {interviewState === 'LISTENING' && (
            <div className="ir2-rec-pill">
              <div className="ir2-rec-dot" />
              REC
              <div className="ir2-vol-bars">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(3, volumeLevel * 12 * (i * 0.6))}px` }}
                  />
                ))}
              </div>
            </div>
          )}

          {interviewState === 'AI_SPEAKING' && (
            <div className="ir2-rec-pill" style={{ background: 'rgba(115,83,246,0.15)', borderColor: 'rgba(115,83,246,0.3)', color: '#7353F6' }}>
              <div className="ir2-rec-dot" style={{ background: '#7353F6' }} />
              AI SPEAKING
            </div>
          )}

          {/* Risk pill */}
          <div className="ir2-risk-pill">
            <div className="ir2-risk-dot" style={{ backgroundColor: gaugeColor, boxShadow: `0 0 8px ${gaugeColor}` }} />
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>
                {riskLabel.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', maxWidth: 120, lineHeight: 1.2 }}>
                {proctoringRisk.message}
              </div>
            </div>
          </div>
        </div>

        <div className="ir2-topbar-right">
          <div className="ir2-timer">
            <div className="ir2-timer-dot" />
            LIVE
          </div>
        </div>
      </div>



      {/* ════════ LEFT PANEL — AI Avatar + Camera PiP ════════ */}
      <div className="ir2-left">
        {/* AI Orb */}
        <div className="ir2-orb-wrapper">
          <div className={`ir2-orb ${interviewState === 'AI_SPEAKING' ? 'speaking' : ''}`} />
        </div>

        {/* AI Speech Bubble */}
        {currentQuestion && (
          <div className="ir2-ai-bubble">
            {interviewState === 'AI_SPEAKING' && (
              <div className="bubble-prefix">
                <div className="bars">
                  <div style={{ height: 6 }} />
                  <div style={{ height: 10 }} />
                  <div style={{ height: 4 }} />
                </div>
              </div>
            )}
            "{currentQuestion}"
          </div>
        )}

        {/* Camera PiP */}
        <div className="ir2-pip" style={{ display: camOn ? 'block' : 'none' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{ facingMode: 'user' }}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
          <div className="ir2-pip-label">
            <div className="live-dot" />
            YOU
          </div>
        </div>

        {/* Overlay webcam still needed for proctoring when camera "off" visually */}
        {!camOn && (
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{ facingMode: 'user' }}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          />
        )}

        {/* Bottom Controls */}
        <div className="ir2-controls">
          <button
            className={`ir2-ctrl-btn ${isRecording ? 'active' : ''}`}
            onClick={() => {
              if (isRecording) stopRecording();
              else if (interviewState === 'LISTENING') startRecording();
            }}
            title={isRecording ? 'Mute' : 'Unmute'}
          >
            {isRecording ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button
            className="ir2-ctrl-btn"
            onClick={() => setCamOn(!camOn)}
            title={camOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {camOn ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>
          <button
            className="ir2-ctrl-btn"
            onClick={toggleInputMode}
            title={inputMode === 'voice' ? 'Switch to text' : 'Switch to voice'}
          >
            <MessageSquare size={18} />
          </button>
          <button
            className="ir2-ctrl-btn leave"
            onClick={() => navigate('/interview/complete')}
          >
            <PhoneOff size={14} />
            LEAVE
          </button>
        </div>
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div className="ir2-right">
        {/* Question Display */}
        {currentQuestion && (
          <div className="ir2-question">{currentQuestion}</div>
        )}

        {/* State Banners */}
        {interviewState === 'AI_SPEAKING' && (
          <div className="ir2-state-banner ai-speaking">
            <div className="banner-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <div className="banner-title">AI IS SPEAKING</div>
              <div className="banner-sub">Listen carefully — your mic will activate when done</div>
            </div>
          </div>
        )}

        {interviewState === 'LISTENING' && (
          <>
            <div className="ir2-state-banner listening">
              <div className="banner-icon">
                <Mic size={18} className={inputMode === 'voice' && isRecording ? 'ir2-pulsing-mic' : ''} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="banner-title">
                  {inputMode === 'voice' ? 'YOUR TURN — Speak now' : 'YOUR TURN — Type your answer'}
                </div>
                <div className="banner-sub">
                  {inputMode === 'voice'
                    ? 'Click "Submit Answer" when finished'
                    : 'Press Enter to submit, Shift+Enter for new line'}
                </div>
                {inputMode === 'voice' && (
                  <div className="ir2-vol-track">
                    <div
                      className="ir2-vol-fill"
                      style={{ width: `${Math.max(3, volumeLevel * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Text input area (text mode) */}
            {inputMode === 'text' && (
              <textarea
                className="ir2-text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
                rows={3}
                placeholder="Type your answer here..."
              />
            )}
          </>
        )}

        {/* Transcript Area */}
        <div className="ir2-transcript">
          {hasTranscript ? (
            <>
              <div className="ir2-transcript-label">Your Response</div>
              <p className="ir2-transcript-text">
                {transcript}
                {interimTranscript && (
                  <span className="interim"> {interimTranscript}</span>
                )}
              </p>
            </>
          ) : (
            <div className="ir2-transcript-empty">
              Your response will appear here...
            </div>
          )}
        </div>

        {/* Metadata Card below Transcript */}
        <div className="ir2-metadata-card" style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontFamily: 'Bebas Neue, var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '1px', fontSize: '1.2rem', marginTop: 4 }}>
              QUESTION {turnNumber} OF {totalQuestions}
            </span>
            {currentTopic && (
              <span className="ir2-topic-chip">{currentTopic}</span>
            )}
          </div>
          <div className="ir2-progress-track">
            <div className="ir2-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ir2-actions">
          {interviewState === 'LISTENING' && (
            <>
              <button className="ir2-btn-outline" onClick={toggleInputMode}>
                {inputMode === 'voice' ? <Keyboard size={16} /> : <Mic size={16} />}
                {inputMode === 'voice' ? 'Type' : 'Speak'}
              </button>
              <button
                className="ir2-btn-gradient"
                onClick={inputMode === 'voice' ? handleSubmitAnswer : handleTextSubmit}
              >
                {inputMode === 'voice' && <MicOff size={16} />}
                Submit Answer
              </button>
            </>
          )}

          {interviewState === 'PROCESSING' && (
            <div className="ir2-status" style={{ width: '100%' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p>Evaluating your response...</p>
            </div>
          )}

          {interviewState === 'COMPLETED' && (
            <div className="ir2-status" style={{ width: '100%' }}>
              <AlertCircle size={28} color="#7353F6" style={{ margin: '0 auto', display: 'block' }} />
              <h4>INTERVIEW COMPLETE</h4>
              <p>Your report is being generated. Redirecting...</p>
            </div>
          )}

          {interviewState === 'AI_SPEAKING' && (
            <div className="ir2-ai-speaking-pills" style={{ width: '100%' }}>
              <Mic size={14} />
              Mic will activate after AI finishes speaking
            </div>
          )}

          {interviewState === 'IDLE' && (
            <div className="ir2-status" style={{ width: '100%' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p>Connecting to interview...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap with InterviewProvider
export default function InterviewRoom() {
  return (
    <InterviewProvider>
      <InterviewRoomInner />
    </InterviewProvider>
  );
}
