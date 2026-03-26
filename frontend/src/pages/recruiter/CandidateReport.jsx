import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReportBySession, getSessionByCandidate, getCandidate, getSessionMessages } from '../../api';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ScoreRadarChart from '../../components/recruiter/ScoreRadarChart';
import ProctoringTimeline from '../../components/recruiter/ProctoringTimeline';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Star, Shield,
} from 'lucide-react';

export default function CandidateReport() {
  const { candidateId } = useParams();
  const [report, setReport] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const candRes = await getCandidate(candidateId);
        setCandidate(candRes.data);

        const sessRes = await getSessionByCandidate(candidateId);
        const sessionId = sessRes.data.id;

        const [reportRes, msgRes] = await Promise.all([
          getReportBySession(sessionId),
          getSessionMessages(sessionId),
        ]);
        setReport(reportRes.data);
        setMessages(msgRes.data);
      } catch (err) {
        setError('Report not yet available. The interview may still be in progress.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [candidateId]);

  if (loading) return <><Navbar /><LoadingSpinner text="Loading report..." /></>;

  const recColor = report?.recommendation === 'Hire'
    ? 'var(--success)'
    : report?.recommendation === 'Reject'
    ? 'var(--error)'
    : 'var(--warn)';

  const RecIcon = report?.recommendation === 'Hire'
    ? CheckCircle
    : report?.recommendation === 'Reject'
    ? XCircle
    : AlertTriangle;

  return (
    <div className="page-container">
      <Navbar />
      <div className="container py-4 page-content" style={{ maxWidth: 900 }}>
        <Link
          to={-1}
          className="d-flex align-items-center gap-1 mb-3"
          style={{ color: 'var(--primary-purple)', textDecoration: 'none', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {error ? (
          <div className="card-glass text-center py-5">
            <AlertTriangle size={48} color="var(--text-muted)" className="mb-3" />
            <h4 style={{ fontFamily: 'var(--font-heading)' }}>REPORT PENDING</h4>
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        ) : report && (
          <>
            {/* Header */}
            <div className="card-glass mb-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)' }}>
                    {candidate?.name}
                  </h1>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>{candidate?.email}</p>
                </div>
                <div className="text-center">
                  <div className="score-badge" style={{ width: '4rem', height: '4rem', fontSize: '1.3rem' }}>
                    {Math.round(report.overall_score)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Overall
                  </div>
                </div>
              </div>

              <div
                className="d-flex align-items-center gap-2 mt-3 p-2 rounded"
                style={{ background: `${recColor}10`, color: recColor }}
              >
                <RecIcon size={20} />
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '1.2rem', letterSpacing: 1 }}>
                  {report.recommendation}
                </span>
              </div>
            </div>

            {/* Radar Chart & Proctoring */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="card-glass h-100">
                  <h5 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>
                    DIMENSION SCORES
                  </h5>
                  <ScoreRadarChart scores={report.dimension_scores} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="card-glass h-100">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Shield size={18} color="var(--primary-purple)" />
                    <h5 style={{ fontFamily: 'var(--font-heading)', margin: 0 }}>
                      PROCTORING SCORE: {report.proctoring_score}
                    </h5>
                  </div>
                  <ProctoringTimeline flags={[]} score={report.proctoring_score} />
                </div>
              </div>
            </div>

            {/* Strengths & Red Flags */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="card-glass h-100">
                  <h5 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>
                    <Star size={16} color="var(--success)" className="me-1" /> STRENGTHS
                  </h5>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {report.strengths.map((s, i) => (
                      <li key={i} style={{ fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--success)' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card-glass h-100">
                  <h5 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>
                    <AlertTriangle size={16} color="var(--error)" className="me-1" /> RED FLAGS
                  </h5>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {report.red_flags.length === 0 ? (
                      <li style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>None detected</li>
                    ) : report.red_flags.map((f, i) => (
                      <li key={i} style={{ fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--error)' }}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="card-glass mb-4">
              <h5 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>SUMMARY</h5>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {report.full_summary}
              </p>
            </div>

            {/* Q&A Log */}
            <div className="card-glass">
              <h5 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>
                INTERVIEW LOG ({messages.length} questions)
              </h5>
              {messages.map((m, i) => (
                <div
                  key={m.id}
                  className="mb-3 p-3 rounded"
                  style={{ background: i % 2 === 0 ? 'var(--bg-elevated)' : 'transparent', border: '1px solid var(--border-color)' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="chip">{m.topic}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Turn {m.turn_number}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                    Q: {m.question}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    A: {m.answer_transcript}
                  </p>
                  <div className="d-flex gap-3" style={{ fontSize: '0.8rem' }}>
                    <span>Tech: {m.scores?.technical}/10</span>
                    <span>Comm: {m.scores?.communication}/10</span>
                    <span>Depth: {m.scores?.depth}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
