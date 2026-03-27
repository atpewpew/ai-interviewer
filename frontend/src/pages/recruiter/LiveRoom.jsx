import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getLiveRoom, addHRNote, endLiveRoom } from '../../api';
import { Video, VideoOff, Mic, MicOff, MessageSquare, Send, ClipboardList, PhoneOff, Bot } from 'lucide-react';

export default function LiveRoom() {
  const { roomId } = useParams();

  const [room, setRoom] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [ended, setEnded] = useState(false);
  const [activePanel, setActivePanel] = useState('transcript'); // transcript | notes
  const [error, setError] = useState('');

  // WebRTC refs
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [candidateJoined, setCandidateJoined] = useState(false);

  const transcriptEndRef = useRef(null);

  // Fetch room data
  useEffect(() => {
    (async () => {
      try {
        const res = await getLiveRoom(roomId);
        setRoom(res.data);
        setTranscript(res.data.transcript || []);
        setNotes(res.data.hr_notes || []);
        if (res.data.status === 'completed') {
          setEnded(true);
          setAiSummary(res.data.ai_summary || '');
        }
      } catch (err) {
        setError('Failed to load room');
      }
    })();
  }, [roomId]);

  // WebSocket + WebRTC
  useEffect(() => {
    if (!room || ended) return;

    const wsUrl = `ws://localhost:8000/live-room/ws/${roomId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', role: 'hr' }));
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'peer_joined':
          if (msg.role === 'candidate') {
            setCandidateJoined(true);
            await startWebRTC(ws);
          }
          break;

        case 'offer':
          await handleOffer(msg.data, ws);
          break;

        case 'answer':
          if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(msg.data));
            // Flush any ICE candidates that arrived before the answer
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

        case 'note_saved':
          setNotes(prev => [...prev, { text: msg.text, timestamp: msg.timestamp }]);
          break;

        case 'peer_left':
          if (msg.role === 'candidate') setCandidateJoined(false);
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

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const startWebRTC = async (ws) => {
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

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: 'offer', data: offer }));
    } catch (err) {
      console.error('WebRTC setup failed:', err);
    }
  };

  const handleOffer = async (offer, ws) => {
    try {
      const stream = localStreamRef.current || await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!localStreamRef.current) {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }

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
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', data: answer }));
      // Flush any ICE candidates that arrived while setting up
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
      }
      pendingCandidatesRef.current = [];
    } catch (err) {
      console.error('Handle offer failed:', err);
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

  // Add transcript entry from HR typing
  const [transcriptInput, setTranscriptInput] = useState('');
  const sendTranscript = () => {
    if (!transcriptInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'transcript', speaker: 'HR', text: transcriptInput.trim() }));
    setTranscriptInput('');
  };

  const sendNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addHRNote(roomId, { text: noteText.trim() });
      setNoteText('');
    } catch (err) {
      // Note sending via WebSocket as fallback
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'note', text: noteText.trim() }));
        setNoteText('');
      }
    }
  };

  const handleEndCall = async () => {
    try {
      const res = await endLiveRoom(roomId);
      setAiSummary(res.data.ai_summary || '');
      setEnded(true);
      wsRef.current?.send(JSON.stringify({ type: 'end' }));
    } catch (err) {
      setError('Failed to end room');
    }
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Bar */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)' }}>
        <Video size={20} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          Live Interview — {room.candidate_name}
        </span>
        <span className={`badge ${candidateJoined ? 'bg-success' : 'bg-warning'}`} style={{ marginLeft: 'auto' }}>
          {candidateJoined ? 'Candidate Connected' : 'Waiting for Candidate'}
        </span>
      </div>

      {ended && aiSummary ? (
        /* Post-call Summary View */
        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          <div className="card-glass" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Bot size={24} style={{ color: 'var(--accent)' }} />
              <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>AI Interview Summary</h4>
            </div>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {aiSummary}
            </p>
            <hr style={{ borderColor: 'var(--border-color)' }} />
            <h6 style={{ color: 'var(--accent)', marginTop: '16px' }}>HR Notes ({notes.length})</h6>
            {notes.map((n, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)', padding: '4px 0', fontSize: '0.9rem' }}>
                • {n.text}
              </div>
            ))}
            <h6 style={{ color: 'var(--accent)', marginTop: '16px' }}>Transcript ({transcript.length} entries)</h6>
            {transcript.slice(-20).map((t, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)', padding: '2px 0', fontSize: '0.85rem' }}>
                <strong style={{ color: t.speaker === 'HR' ? 'var(--accent)' : '#22c55e' }}>[{t.speaker}]</strong> {t.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Live Call View */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Video Area (left) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
            {/* Remote Video */}
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', background: '#111', position: 'relative' }}>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {!candidateJoined && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Waiting for candidate to join...</p>
                </div>
              )}
              {/* Local video pip */}
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
              <button onClick={handleEndCall} style={{
                borderRadius: '24px', padding: '0 24px', height: '48px',
                background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600,
              }}>
                <PhoneOff size={18} /> End & Get AI Summary
              </button>
            </div>
          </div>

          {/* Side Panel — Transcript / Notes */}
          <div style={{ width: '340px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            {/* Panel Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setActivePanel('transcript')}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                  background: activePanel === 'transcript' ? 'var(--bg-card)' : 'transparent',
                  color: activePanel === 'transcript' ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: activePanel === 'transcript' ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                }}
              >
                <MessageSquare size={14} /> Transcript
              </button>
              <button
                onClick={() => setActivePanel('notes')}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                  background: activePanel === 'notes' ? 'var(--bg-card)' : 'transparent',
                  color: activePanel === 'notes' ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: activePanel === 'notes' ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                }}
              >
                <ClipboardList size={14} /> Notes ({notes.length})
              </button>
            </div>

            {/* Panel Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
              {activePanel === 'transcript' ? (
                <div>
                  {transcript.map((t, i) => (
                    <div key={i} style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                      <strong style={{ color: t.speaker === 'HR' ? 'var(--accent)' : '#22c55e' }}>{t.speaker}</strong>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{t.text}</span>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              ) : (
                <div>
                  {notes.map((n, i) => (
                    <div key={i} className="card-glass" style={{ padding: '8px', marginBottom: '6px' }}>
                      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px', borderTop: '1px solid var(--border-color)' }}>
              {activePanel === 'transcript' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
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
                  <button onClick={sendTranscript} className="btn-ghost" style={{ padding: '8px' }}>
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendNote()}
                    placeholder="Private note..."
                    style={{
                      flex: 1, background: 'var(--bg-input)', color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem',
                    }}
                  />
                  <button onClick={sendNote} className="btn-ghost" style={{ padding: '8px' }}>
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
