import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getLiveRoom } from '../../api';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare } from 'lucide-react';

export default function LiveRoomCandidate() {
  const { roomId } = useParams();

  const [room, setRoom] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');

  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [hrJoined, setHrJoined] = useState(false);

  const transcriptEndRef = useRef(null);
  const [transcriptInput, setTranscriptInput] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getLiveRoom(roomId);
        setRoom(res.data);
        setTranscript(res.data.transcript || []);
        if (res.data.status === 'completed') setEnded(true);
      } catch (err) {
        setError('Failed to load room');
      }
    })();
  }, [roomId]);

  useEffect(() => {
    if (!room || ended) return;

    const ws = new WebSocket(`ws://localhost:8000/live-room/ws/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', role: 'candidate' }));
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'peer_joined':
          if (msg.role === 'hr') setHrJoined(true);
          break;

        case 'offer':
          await handleOffer(msg.data, ws);
          break;

        case 'answer':
          if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(msg.data));
            for (const c of pendingCandidatesRef.current) {
              try { await peerRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
            }
            pendingCandidatesRef.current = [];
          }
          break;

        case 'ice-candidate':
          if (peerRef.current && peerRef.current.remoteDescription && msg.data) {
            try { await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.data)); } catch (_) {}
          } else if (msg.data) {
            pendingCandidatesRef.current.push(msg.data);
          }
          break;

        case 'transcript':
          setTranscript(prev => [...prev, { speaker: msg.speaker, text: msg.text, timestamp: msg.timestamp }]);
          break;

        case 'peer_left':
          if (msg.role === 'hr') setHrJoined(false);
          break;

        case 'room_ended':
          setEnded(true);
          break;
      }
    };

    return () => {
      ws.close();
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [room, ended]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleOffer = async (offer, ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          ws.send(JSON.stringify({ type: 'ice-candidate', data: e.candidate.toJSON() }));
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Flush any ICE candidates that arrived while setting up
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
      }
      pendingCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', data: answer }));
    } catch (err) {
      console.error('WebRTC error:', err);
    }
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !videoOn; });
    setVideoOn(!videoOn);
  };

  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !audioOn; });
    setAudioOn(!audioOn);
  };

  const sendTranscript = () => {
    if (!transcriptInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'transcript', speaker: 'Candidate', text: transcriptInput.trim() }));
    setTranscriptInput('');
  };

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="card-glass p-4 text-center">
          <h4 style={{ color: 'var(--text-primary)' }}>{error}</h4>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="spinner-border" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (ended) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="card-glass p-5 text-center" style={{ maxWidth: '500px' }}>
          <PhoneOff size={48} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
          <h4 style={{ color: 'var(--text-primary)' }}>Interview Ended</h4>
          <p style={{ color: 'var(--text-secondary)' }}>Thank you for your time! The interviewer has ended the session. You will hear back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Bar */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)' }}>
        <Video size={20} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Live Interview</span>
        <span className={`badge ${hrJoined ? 'bg-success' : 'bg-warning'}`} style={{ marginLeft: 'auto' }}>
          {hrJoined ? 'Interviewer Connected' : 'Waiting for Interviewer'}
        </span>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
          <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', background: '#111', position: 'relative' }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!hrJoined && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Waiting for interviewer...</p>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '160px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border-color)' }}>
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '8px' }}>
            <button onClick={toggleAudio} className="btn-ghost" style={{ borderRadius: '50%', width: '48px', height: '48px', display: 'grid', placeItems: 'center' }}>
              {audioOn ? <Mic size={20} /> : <MicOff size={20} color="#ef4444" />}
            </button>
            <button onClick={toggleVideo} className="btn-ghost" style={{ borderRadius: '50%', width: '48px', height: '48px', display: 'grid', placeItems: 'center' }}>
              {videoOn ? <Video size={20} /> : <VideoOff size={20} color="#ef4444" />}
            </button>
          </div>
        </div>

        {/* Transcript Panel */}
        <div style={{ width: '300px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>Transcript</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {transcript.map((t, i) => (
              <div key={i} style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                <strong style={{ color: t.speaker === 'HR' ? 'var(--accent)' : '#22c55e' }}>{t.speaker}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{t.text}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
          <div style={{ padding: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px' }}>
            <input
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTranscript()}
              placeholder="Type transcript..."
              style={{
                flex: 1, background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
