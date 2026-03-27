import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { useInterview, InterviewProvider } from '../../context/InterviewContext';
import { useMicrophone } from '../../hooks/useMicrophone';
import { useSpeech } from '../../hooks/useSpeech';
import { useProctoring } from '../../hooks/useProctoring';
import TranscriptPanel from '../../components/candidate/TranscriptPanel';
import QuestionDisplay from '../../components/candidate/QuestionDisplay';
import { Mic, MicOff, AlertCircle, Keyboard } from 'lucide-react';

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

  return (
    <div className="interview-room">
      {/* Left — Video Feed */}
      <div className="video-section">
        <Webcam
          ref={webcamRef}
          audio={false}
          width="100%"
          height="100%"
          videoConstraints={{ facingMode: 'user' }}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />

        {/* Recording indicator overlay */}
        {interviewState === 'LISTENING' && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(46,125,50,0.85)',
              padding: '8px 16px',
              borderRadius: 20,
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <div className="recording-dot" />
            Recording
            {/* Mini volume bar */}
            <div style={{ width: 50, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
              <div style={{ height: '100%', borderRadius: 2, background: 'var(--text-primary)', width: `${Math.max(5, volumeLevel * 100)}%`, transition: 'width 0.1s' }} />
            </div>
          </div>
        )}

        {interviewState === 'AI_SPEAKING' && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(98,0,234,0.85)',
              padding: '8px 16px',
              borderRadius: 20,
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <div className="ai-speaking-indicator" style={{ height: 16, gap: 2 }}>
              {[1, 2, 3].map(i => <div key={i} className="bar" style={{ height: 4, width: 3 }} />)}
            </div>
            AI Speaking...
          </div>
        )}

        {/* Live proctoring risk overlay */}
        {(() => {
          const risk = proctoringRisk.score;
          const gaugeColor = risk < 30 ? '#22c55e' : risk < 70 ? '#eab308' : '#ef4444';
          const label = risk < 30 ? 'Low Risk' : risk < 70 ? 'Med Risk' : 'High Risk';
          const CIRC = 94.25; // 2π×15
          const offset = CIRC - (risk / 100) * CIRC;
          return (
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'rgba(0,0,0,0.72)',
                borderRadius: 12,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backdropFilter: 'blur(6px)',
                border: `1px solid ${gaugeColor}44`,
              }}
            >
              {/* Mini SVG ring gauge */}
              <svg width={36} height={36} viewBox="0 0 36 36">
                <circle cx={18} cy={18} r={15} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3} />
                <circle
                  cx={18} cy={18} r={15}
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth={3}
                  strokeDasharray={CIRC}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
                />
                <text x={18} y={22} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
                  {Math.round(risk)}
                </text>
              </svg>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: gaugeColor }}>{label}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', maxWidth: 110, lineHeight: 1.3 }}>
                  {proctoringRisk.message}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Right — Interview Panel */}
      <div className="interview-panel">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Question {turnNumber} of {totalQuestions}
            </span>
            {currentTopic && (
              <span className="chip">{currentTopic}</span>
            )}
          </div>
          <div className="progress-bar-ios">
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Display */}
        <QuestionDisplay question={currentQuestion} />

        {/* State Banner */}
        {interviewState === 'AI_SPEAKING' && (
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-purple), var(--deep-violet))',
            color: 'white',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: '0.75rem',
          }}>
            <div className="ai-speaking-indicator" style={{ height: 22 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="bar" style={{ height: 6 }} />)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI is speaking</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Listen carefully — your mic will activate when done</div>
            </div>
          </div>
        )}

        {interviewState === 'LISTENING' && (
          <div style={{
            background: 'linear-gradient(135deg, #2e7d32, #43a047)',
            color: 'white',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginTop: '0.75rem',
          }}>
            {inputMode === 'voice' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Mic size={20} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>YOUR TURN — Speak now</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Click "Submit Answer" when finished</div>
                  </div>
                </div>
                {/* Volume level bar */}
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.25)' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 3,
                    background: 'var(--text-primary)',
                    width: `${Math.max(3, volumeLevel * 100)}%`,
                    transition: 'width 0.1s ease',
                  }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Keyboard size={20} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>YOUR TURN — Type your answer</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Press Enter to submit, Shift+Enter for new line</div>
                  </div>
                </div>
                <textarea
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
                  style={{
                    width: '100%',
                    background: '#2C2C2C',
                    border: '1px solid rgba(115,83,246,0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    resize: 'none',
                    maxHeight: 150,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </>
            )}
          </div>
        )}
        {/* Live Transcript */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem' }}>
          <TranscriptPanel
            transcript={transcript}
            interimTranscript={interimTranscript}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          {interviewState === 'LISTENING' && (
            <div className="d-flex gap-2">
              <button
                className="btn-outline-purple d-flex align-items-center gap-1"
                style={{ fontSize: '0.85rem' }}
                onClick={toggleInputMode}
              >
                {inputMode === 'voice' ? <Keyboard size={16} /> : <Mic size={16} />}
                {inputMode === 'voice' ? 'Type' : 'Speak'}
              </button>
              <button
                className="btn-gradient flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                onClick={inputMode === 'voice' ? handleSubmitAnswer : handleTextSubmit}
              >
                {inputMode === 'voice' && <MicOff size={18} />}
                Submit Answer
              </button>
            </div>
          )}

          {interviewState === 'PROCESSING' && (
            <div className="text-center py-3">
              <div className="spinner-border" style={{ color: 'var(--primary-purple)' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Evaluating your response...
              </p>
            </div>
          )}

          {interviewState === 'COMPLETED' && (
            <div className="text-center py-3">
              <AlertCircle size={32} color="var(--primary-purple)" className="mb-2" />
              <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                INTERVIEW COMPLETE
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your report is being generated. Redirecting...
              </p>
            </div>
          )}

          {interviewState === 'AI_SPEAKING' && (
            <div className="text-center py-2">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                <Mic size={14} className="me-1" />
                Mic will activate after AI finishes speaking
              </p>
            </div>
          )}

          {interviewState === 'IDLE' && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm" style={{ color: 'var(--primary-purple)' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Connecting to interview...
              </p>
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
