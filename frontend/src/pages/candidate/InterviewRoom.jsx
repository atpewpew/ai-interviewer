import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { useInterview, InterviewProvider } from '../../context/InterviewContext';
import { useMicrophone } from '../../hooks/useMicrophone';
import { useSpeech } from '../../hooks/useSpeech';
import { useProctoring } from '../../hooks/useProctoring';
import TranscriptPanel from '../../components/candidate/TranscriptPanel';
import ScoreLiveFeed from '../../components/candidate/ScoreLiveFeed';
import QuestionDisplay from '../../components/candidate/QuestionDisplay';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

function InterviewRoomInner() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const sessionId = sessionStorage.getItem('sessionId');

  const {
    interviewState, setInterviewState,
    currentQuestion, currentTopic, turnNumber, totalQuestions,
    transcript, interimTranscript, turnScores, isComplete,
    connectWS, sendAudio, sendCommand, disconnectWS,
  } = useInterview();

  const { isSpeaking, speak } = useSpeech();
  const { isLoaded: proctoringLoaded, loadModels, startDetection, stopDetection } = useProctoring(sessionId, webcamRef);

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

  // Load proctoring models
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Start proctoring when loaded
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

  // Start mic when entering LISTENING state
  useEffect(() => {
    if (interviewState === 'LISTENING' && !isRecording) {
      startRecording();
    }
  }, [interviewState, isRecording, startRecording]);

  // Handle candidate submitting their answer (stop recording)
  const handleSubmitAnswer = () => {
    stopRecording();
    sendCommand('stop_recording');
    setInterviewState('PROCESSING');
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

        {/* Proctoring status */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 12px',
            borderRadius: 20,
            color: '#5CC9F5',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#5CC9F5',
            }}
          />
          Proctored
        </div>
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
          </div>
        )}

        {/* Live Transcript */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem' }}>
          <TranscriptPanel
            transcript={transcript}
            interimTranscript={interimTranscript}
          />
        </div>

        {/* Per-turn Scores */}
        {turnScores.length > 0 && (
          <div className="mt-2">
            <ScoreLiveFeed scores={turnScores} />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          {interviewState === 'LISTENING' && (
            <button
              className="btn-gradient w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={handleSubmitAnswer}
            >
              <MicOff size={18} />
              Submit Answer
            </button>
          )}

          {interviewState === 'PROCESSING' && (
            <div className="text-center py-3">
              <div className="spinner-border" style={{ color: 'var(--primary-purple)' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Evaluating your response...
              </p>
            </div>
          )}

          {interviewState === 'SCORING' && (
            <div className="text-center py-2">
              <p style={{ fontSize: '0.85rem', color: 'var(--primary-purple)', fontWeight: 600 }}>
                Preparing next question...
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
