import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getJob, getApplicationsForJob, advanceApplication, startRound,
} from '../../api';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  ChevronRight, ChevronLeft, UserCheck, UserX, Play, FileText,
  Users, Clock, CheckCircle, XCircle, Award, BarChart3, Video,
} from 'lucide-react';

const STAGE_COLORS = {
  applied: '#6366f1',
  in_progress: '#3b82f6',
  advanced: '#10b981',
  rejected: '#ef4444',
  hired: '#f59e0b',
};

export default function JobPipeline() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // app_id being acted on

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    try {
      const [jobRes, appsRes] = await Promise.all([
        getJob(jobId),
        getApplicationsForJob(jobId),
      ]);
      setJob(jobRes.data);
      setApplications(appsRes.data);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group applications into Kanban columns by current_round + special columns for rejected/hired
  const columns = useMemo(() => {
    if (!job) return [];

    const cols = job.pipeline.map((round) => ({
      round_number: round.round_number,
      name: round.name,
      round_type: round.round_type,
      candidates: [],
    }));

    // Special columns
    const rejectedCol = { round_number: -1, name: 'Rejected', round_type: 'rejected', candidates: [] };
    const hiredCol = { round_number: 999, name: 'Hired', round_type: 'hired', candidates: [] };

    for (const app of applications) {
      if (app.stage === 'rejected') {
        rejectedCol.candidates.push(app);
      } else if (app.stage === 'hired') {
        hiredCol.candidates.push(app);
      } else {
        const col = cols.find((c) => c.round_number === app.current_round);
        if (col) col.candidates.push(app);
      }
    }

    return [...cols, hiredCol, rejectedCol];
  }, [job, applications]);

  const handleAdvance = async (appId) => {
    setActionLoading(appId);
    try {
      await advanceApplication(appId, { action: 'advance' });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to advance');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (appId) => {
    if (!confirm('Reject this candidate?')) return;
    setActionLoading(appId);
    try {
      await advanceApplication(appId, { action: 'reject' });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartRound = async (appId) => {
    setActionLoading(appId);
    try {
      const { data } = await startRound(appId);
      if (data.round_type === 'ai_interview' && data.session_id) {
        const interviewId = data.interview_id;
        const link = `${window.location.origin}/interview/${interviewId}/lobby?sid=${data.session_id}`;
        navigator.clipboard.writeText(link);
        alert(`AI Interview session created! Candidate link copied:\n${link}`);
      } else if (data.round_type === 'dsa_coding' && data.dsa_session_id) {
        const link = `${window.location.origin}/dsa/${data.dsa_session_id}`;
        navigator.clipboard.writeText(link);
        alert(`DSA session created! Candidate link copied:\n${link}`);
      } else if (data.round_type === 'live_1on1' && data.live_room_id) {
        const link = `${window.location.origin}/live-room/${data.live_room_id}/candidate`;
        navigator.clipboard.writeText(link);
        alert(`Live room created! Candidate link copied:\n${link}\n\nHR link: /recruiter/live-room/${data.live_room_id}`);
      } else {
        alert(data.message || 'Round started');
      }
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start round');
    } finally {
      setActionLoading(null);
    }
  };

  const getLastRoundResult = (app) => {
    if (!app.round_results || app.round_results.length === 0) return null;
    return app.round_results.find((r) => r.round_number === app.current_round) || null;
  };

  if (loading) return <div className="page-container"><Navbar /><div className="container py-4 page-content"><LoadingSpinner /></div></div>;
  if (!job) return <div className="page-container"><Navbar /><div className="container py-4 page-content"><p>Job not found</p></div></div>;

  return (
    <div className="page-container">
      <Navbar />
      <div className="container-fluid py-4 page-content">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 px-3">
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
              {job.title}
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
              {job.department}{job.department && job.location ? ' · ' : ''}{job.location} — {applications.length} applicants
            </p>
          </div>
          <button className="btn-outline-purple" style={{ fontSize: '0.85rem' }}
            onClick={() => {
              const link = `${window.location.origin}/jobs/${job.id}/apply`;
              navigator.clipboard.writeText(link);
              alert('Application link copied!');
            }}>
            Copy Apply Link
          </button>
        </div>

        {/* Kanban Board */}
        <div className="d-flex gap-3 px-3" style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
          {columns.map((col) => {
            const isSpecial = col.round_number === -1 || col.round_number === 999;
            const borderColor = col.round_type === 'rejected' ? '#ef4444'
              : col.round_type === 'hired' ? '#f59e0b'
              : 'var(--primary-purple)';

            return (
              <div key={col.round_number} style={{
                minWidth: 300, maxWidth: 320, flex: '0 0 300px',
              }}>
                {/* Column Header */}
                <div style={{
                  borderTop: `3px solid ${borderColor}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(12px)',
                }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {!isSpecial && `R${col.round_number}: `}{col.name}
                    </span>
                    <span className="chip" style={{ fontSize: '0.7rem', background: `${borderColor}22`, color: borderColor }}>
                      {col.candidates.length}
                    </span>
                  </div>
                  {!isSpecial && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {col.round_type.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {col.candidates.length === 0 ? (
                    <div style={{
                      padding: '2rem 1rem', textAlign: 'center',
                      color: 'var(--text-muted)', fontSize: '0.8rem',
                      border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
                    }}>
                      No candidates
                    </div>
                  ) : (
                    col.candidates.map((app) => {
                      const roundResult = getLastRoundResult(app);
                      const isActing = actionLoading === app.id;
                      return (
                        <div key={app.id} className="card-glass" style={{ padding: '0.75rem' }}>
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {app.candidate_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {app.candidate_email}
                              </div>
                            </div>
                            {roundResult?.score != null && (
                              <span className="chip" style={{
                                fontSize: '0.7rem', fontWeight: 700,
                                background: roundResult.score >= 70 ? 'var(--success-bg)' : roundResult.score >= 40 ? 'var(--warn-bg)' : 'var(--error-bg)',
                                color: roundResult.score >= 70 ? 'var(--success)' : roundResult.score >= 40 ? 'var(--warn)' : 'var(--error)',
                              }}>
                                {Math.round(roundResult.score)}
                              </span>
                            )}
                          </div>

                          {/* Round status badge */}
                          {roundResult && (
                            <div className="d-flex align-items-center gap-1 mb-2" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {roundResult.status === 'completed' ? (
                                <><CheckCircle size={12} color="var(--success)" /> Completed</>
                              ) : roundResult.status === 'pending' ? (
                                <><Clock size={12} color="var(--warn)" /> Pending</>
                              ) : (
                                <><Play size={12} /> {roundResult.status}</>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          {!isSpecial && app.stage !== 'rejected' && app.stage !== 'hired' && (
                            <div className="d-flex gap-1 flex-wrap">
                              {/* Start round if not started yet */}
                              {(!roundResult || roundResult.status === 'pending') && !roundResult?.session_id && (
                                <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.7rem' }} disabled={isActing}
                                  onClick={() => handleStartRound(app.id)}>
                                  <Play size={12} /> Start
                                </button>
                              )}

                              {/* View report if completed */}
                              {roundResult?.status === 'completed' && roundResult?.report_id && (
                                <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={() => {
                                    const candId = roundResult.candidate_id;
                                    if (candId) navigate(`/recruiter/candidates/${candId}/report`);
                                  }}>
                                  <FileText size={12} /> Report
                                </button>
                              )}

                              {/* Open live room for HR */}
                              {roundResult?.live_room_id && roundResult?.status !== 'completed' && (
                                <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={() => navigate(`/recruiter/live-room/${roundResult.live_room_id}`)}>
                                  <Video size={12} /> Join Call
                                </button>
                              )}

                              {/* Scorecard link */}
                              <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                style={{ fontSize: '0.7rem' }}
                                onClick={() => navigate(`/recruiter/scorecard/${app.id}`)}>
                                <BarChart3 size={12} /> Scorecard
                              </button>

                              {/* Advance */}
                              {roundResult?.status === 'completed' && (
                                <button className="btn btn-sm d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.7rem', background: 'var(--success-bg)', color: 'var(--success)', border: 'none' }}
                                  disabled={isActing} onClick={() => handleAdvance(app.id)}>
                                  <ChevronRight size={12} /> Advance
                                </button>
                              )}

                              {/* Reject */}
                              <button className="btn btn-sm d-flex align-items-center gap-1"
                                style={{ fontSize: '0.7rem', background: 'var(--error-bg)', color: 'var(--error)', border: 'none' }}
                                disabled={isActing} onClick={() => handleReject(app.id)}>
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          )}

                          {app.stage === 'hired' && (
                            <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                              <Award size={14} /> Hired
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
