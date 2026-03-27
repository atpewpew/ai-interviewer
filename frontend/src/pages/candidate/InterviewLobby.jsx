import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Mic, CheckCircle, Loader, ArrowRight } from 'lucide-react';

export default function InterviewLobby() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const webcamRef = useRef(null);
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [ready, setReady] = useState(false);

  // Support ATS flow: read sessionId from URL query param (?sid=xxx) as fallback
  useEffect(() => {
    const urlSid = searchParams.get('sid');
    if (urlSid && !sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', urlSid);
    }
  }, [searchParams]);

  // Check camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setCameraOk(true))
      .catch(() => setCameraOk(false));
  }, []);

  // Check mic
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        setMicOk(true);
        s.getTracks().forEach((t) => t.stop());
      })
      .catch(() => setMicOk(false));
  }, []);

  // Simulate model loading (face-api models)
  useEffect(() => {
    const timer = setTimeout(() => {
      setModelsLoading(false);
      setReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const sessionId = sessionStorage.getItem('sessionId') || searchParams.get('sid');
  const candidateName = sessionStorage.getItem('candidateName') || 'Candidate';

  const startInterview = () => {
    if (!sessionId) {
      alert('Session not found. Please go back and register.');
      return;
    }
    navigate(`/interview/${interviewId}/room`);
  };

  return (
    <div className="page-container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="card-glass fade-in" style={{ width: '100%', maxWidth: 600, padding: '2.5rem' }}>
        <div className="text-center mb-4">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)' }}>
            INTERVIEW LOBBY
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Welcome, {candidateName}. Let's make sure everything is set up.
          </p>
        </div>

        {/* Camera Preview */}
        <div
          className="mb-4 rounded overflow-hidden mx-auto"
          style={{
            width: 320,
            height: 240,
            background: '#1a1a1a',
            border: '2px solid var(--border-color)',
          }}
        >
          {cameraOk ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              width={320}
              height={240}
              videoConstraints={{ facingMode: 'user' }}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Camera not available</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="mb-4">
          <CheckItem ok={cameraOk} label="Camera access" icon={Camera} />
          <CheckItem ok={micOk} label="Microphone access" icon={Mic} />
          <CheckItem
            ok={!modelsLoading}
            label={modelsLoading ? 'Setting up proctoring...' : 'Proctoring ready'}
            icon={modelsLoading ? Loader : CheckCircle}
            loading={modelsLoading}
          />
        </div>

        {/* Consent */}
        <div
          className="p-3 rounded mb-4"
          style={{ background: 'var(--pale-purple)', fontSize: '0.82rem', lineHeight: 1.6 }}
        >
          By starting the interview, you consent to:
          <ul className="mb-0 mt-1">
            <li>Video and audio recording during the session</li>
            <li>Proctoring monitoring (face detection, tab switching)</li>
            <li>AI-based evaluation of your responses</li>
          </ul>
        </div>

        <button
          className="btn-gradient w-100 d-flex align-items-center justify-content-center gap-2"
          disabled={!ready || !cameraOk || !micOk}
          onClick={startInterview}
          style={{ padding: '0.75rem' }}
        >
          Start Interview <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

function CheckItem({ ok, label, icon: Icon, loading }) {
  return (
    <div className="d-flex align-items-center gap-2 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-full)',
          background: ok ? 'var(--success-bg)' : 'var(--warn-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          size={14}
          color={ok ? 'var(--success)' : 'var(--warn)'}
          className={loading ? 'spinner-border spinner-border-sm' : ''}
          style={loading ? { width: 14, height: 14, borderWidth: 2 } : {}}
        />
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
