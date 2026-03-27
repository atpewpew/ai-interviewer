import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getScorecard } from '../../api';
import Navbar from '../../components/shared/Navbar';
import { Award, CheckCircle, XCircle, Clock, AlertTriangle, BarChart3, User, Mail } from 'lucide-react';

const ROUND_ICONS = {
  ai_interview: '🤖',
  dsa_coding: '💻',
  live_1on1: '🎥',
  manual_review: '📋',
};

const STATUS_COLORS = {
  completed: '#22c55e',
  pending: '#eab308',
  not_started: '#6b7280',
  failed: '#ef4444',
};

export default function Scorecard() {
  const { appId } = useParams();
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getScorecard(appId);
        setScorecard(res.data);
      } catch (err) {
        setError('Failed to load scorecard');
      }
      setLoading(false);
    })();
  }, [appId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="spinner-border" style={{ color: 'var(--accent)' }} />
        </div>
      </>
    );
  }

  if (error || !scorecard) {
    return (
      <>
        <Navbar />
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="card-glass p-4 text-center">
            <AlertTriangle size={48} style={{ color: '#eab308', marginBottom: '12px' }} />
            <h5 style={{ color: 'var(--text-primary)' }}>{error || 'Scorecard not available'}</h5>
          </div>
        </div>
      </>
    );
  }

  const recColor =
    scorecard.overall_recommendation === 'Strong Hire' || scorecard.overall_recommendation === 'Hired' ? '#22c55e' :
    scorecard.overall_recommendation === 'Lean Hire' ? '#eab308' :
    scorecard.overall_recommendation === 'Rejected' || scorecard.overall_recommendation === 'No Hire' ? '#ef4444' : 'var(--text-muted)';

  return (
    <>
      <Navbar />
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingTop: '80px' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          {/* Header */}
          <div className="card-glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gradient)',
                display: 'grid', placeItems: 'center',
              }}>
                <User size={28} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{scorecard.candidate_name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  <Mail size={14} /> {scorecard.candidate_email}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                  {scorecard.job_title}
                </div>
              </div>

              {/* Overall Score + Recommendation */}
              <div style={{ textAlign: 'center' }}>
                {scorecard.overall_score !== null && (
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    border: `3px solid ${recColor}`, display: 'grid', placeItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: recColor }}>{scorecard.overall_score}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>/ 100</div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '8px', fontWeight: 600, color: recColor, fontSize: '0.85rem' }}>
                  {scorecard.overall_recommendation}
                </div>
              </div>
            </div>
          </div>

          {/* Rounds */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scorecard.rounds.map((round, i) => (
              <div key={i} className="card-glass" style={{ padding: '16px', borderLeft: `3px solid ${STATUS_COLORS[round.status] || 'var(--border-color)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.3rem' }}>{ROUND_ICONS[round.type] || '📌'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      Round {round.round_number}: {round.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                      {round.type.replace('_', ' ')}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                    background: `${STATUS_COLORS[round.status] || '#6b7280'}20`,
                    color: STATUS_COLORS[round.status] || '#6b7280',
                  }}>
                    {round.status === 'completed' && <CheckCircle size={12} style={{ marginRight: '4px', verticalAlign: -1 }} />}
                    {round.status === 'pending' && <Clock size={12} style={{ marginRight: '4px', verticalAlign: -1 }} />}
                    {round.status === 'not_started' && <XCircle size={12} style={{ marginRight: '4px', verticalAlign: -1 }} />}
                    {round.status.replace('_', ' ')}
                  </span>

                  {/* Score */}
                  {round.score !== null && round.score !== undefined && (
                    <div style={{
                      padding: '4px 12px', borderRadius: '8px',
                      background: round.score >= 75 ? '#22c55e20' : round.score >= 50 ? '#eab30820' : '#ef444420',
                      color: round.score >= 75 ? '#22c55e' : round.score >= 50 ? '#eab308' : '#ef4444',
                      fontWeight: 700, fontSize: '0.9rem',
                    }}>
                      {Math.round(round.score)}%
                    </div>
                  )}
                </div>

                {/* Summary */}
                {round.summary && (
                  <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {round.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
