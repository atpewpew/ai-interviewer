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
  Code, Sparkles, Clipboard,
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
    <>
      <style>{`
        .pipeline-container {
          background-color: #0A0A0F;
          min-height: 100vh;
          font-family: 'Montserrat', sans-serif;
        }
        .pipeline-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          color: white;
          margin: 0;
          text-transform: uppercase;
        }
        .pipeline-subtitle {
          color: #6B7280;
          font-size: 0.9rem;
          margin: 0;
        }
        .btn-copy-apply {
          background: linear-gradient(to right, #7353F6, #00C0FF);
          border: none;
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(115,83,246,0.4);
          font-family: 'Montserrat', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s;
        }
        .btn-copy-apply:hover {
          filter: brightness(1.1);
        }
        .kanban-col {
          background: #12121A;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          border-top: 3px solid #7353F6;
          min-width: 300px;
          max-width: 320px;
          flex: 0 0 300px;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .kanban-col-header {
          padding: 1rem 1rem 0.5rem 1rem;
        }
        .kanban-col-title {
          font-family: 'Bebas Neue', sans-serif;
          color: white;
          text-transform: uppercase;
          font-size: 1.1rem;
          margin: 0;
        }
        .kanban-badge {
          background: rgba(115,83,246,0.2);
          border: 1px solid rgba(115,83,246,0.4);
          color: #A88BFF;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.75rem;
          border-radius: 100px;
          padding: 2px 8px;
        }
        .kanban-subtext {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.75rem;
          color: #6B7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .kanban-col-body {
          padding: 0.5rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }
        .card-candidate {
          background: #1A1A2E;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 1rem;
          transition: border-color 0.2s, transform 0.2s;
        }
        .card-candidate:hover {
          border-color: rgba(115,83,246,0.3);
          transform: translateY(-1px);
        }
        .cand-name {
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
          color: white;
          font-size: 0.9rem;
          margin-bottom: 2px;
        }
        .cand-email {
          font-family: 'Montserrat', sans-serif;
          color: #6B7280;
          font-size: 0.75rem;
          margin-bottom: 8px;
        }
        .status-badge-pending {
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          color: #F59E0B;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 0.7rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .status-badge-completed {
          background: rgba(34,197,94,0.15);
          border: 1px solid rgba(34,197,94,0.3);
          color: #22C55E;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 0.7rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .action-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.75rem;
          border-radius: 8px;
          padding: 4px 10px;
          column-gap: 4px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          height: 28px;
          text-decoration: none;
        }
        .btn-start {
          background: rgba(115,83,246,0.2);
          border: 1px solid rgba(115,83,246,0.4);
          color: #A88BFF;
          transition: background 0.2s;
        }
        .btn-start:hover { background: rgba(115,83,246,0.4); }
        .btn-scorecard {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          transition: border-color 0.2s;
        }
        .btn-scorecard:hover { border-color: #7353F6; }
        .btn-reject {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #EF4444;
          transition: background 0.2s;
        }
        .btn-reject:hover { background: rgba(239,68,68,0.2); }
        .empty-col {
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }
        .empty-text {
          font-family: 'Montserrat', sans-serif;
          color: #4B5563;
          font-size: 0.85rem;
        }
      `}</style>
      <div className="pipeline-container">
        <Navbar />
        <div className="container-fluid py-4">
          <div className="d-flex justify-content-between align-items-center mb-4 px-3">
            <div>
              <h1 className="pipeline-title">{job.title}</h1>
              <p className="pipeline-subtitle">
                {job.department}{job.department && job.location ? ' · ' : ''}{job.location} · {applications.length} applicants
              </p>
            </div>
            <button className="btn-copy-apply"
              onClick={() => {
                const link = `${window.location.origin}/jobs/${job.id}/apply`;
                navigator.clipboard.writeText(link);
                alert('Application link copied!');
              }}>
              Copy Apply Link
            </button>
          </div>

          <div className="d-flex gap-4 px-3" style={{ overflowX: 'auto', paddingBottom: '1rem', alignItems: 'stretch' }}>
            {columns.map((col) => {
              const isSpecial = col.round_number === -1 || col.round_number === 999;
              return (
                <div key={col.round_number} className="kanban-col" style={{
                  borderTopColor: col.round_type === 'rejected' ? '#EF4444' : col.round_type === 'hired' ? '#F59E0B' : '#7353F6'
                }}>
                  <div className="kanban-col-header">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h3 className="kanban-col-title">
                        {!isSpecial && `R${col.round_number}: `}{col.name}
                      </h3>
                      <span className="kanban-badge">{col.candidates.length}</span>
                    </div>
                    {!isSpecial && (
                      <div className="kanban-subtext">
                        {col.round_type === 'dsa_coding' && <Code size={12} />}
                        {col.round_type === 'ai_interview' && <Sparkles size={12} />}
                        {col.round_type === 'live_1on1' && <Video size={12} />}
                        {col.round_type === 'manual_review' && <Clipboard size={12} />}
                        {col.round_type.replace('_', ' ')}
                      </div>
                    )}
                  </div>

                  <div className="kanban-col-body">
                    {col.candidates.length === 0 ? (
                      <div className="empty-col">
                        <span className="empty-text">No candidates yet</span>
                      </div>
                    ) : (
                      col.candidates.map((app) => {
                        const roundResult = getLastRoundResult(app);
                        const isActing = actionLoading === app.id;
                        return (
                          <div key={app.id} className="card-candidate">
                            <div className="cand-name">{app.candidate_name}</div>
                            <div className="cand-email">{app.candidate_email}</div>

                            {roundResult && (
                              <div className={roundResult.status === 'completed' ? 'status-badge-completed' : 'status-badge-pending'}>
                                {roundResult.status === 'completed' ? (
                                  <><CheckCircle size={10} /> Completed</>
                                ) : roundResult.status === 'pending' ? (
                                  <><Clock size={10} /> Pending</>
                                ) : (
                                  <><Play size={10} /> {roundResult.status}</>
                                )}
                              </div>
                            )}

                            {!isSpecial && app.stage !== 'rejected' && app.stage !== 'hired' && (
                              <div className="card-actions">
                                {(!roundResult || roundResult.status === 'pending') && !roundResult?.session_id && (
                                  <button className="action-btn btn-start" disabled={isActing} onClick={() => handleStartRound(app.id)}>
                                    <Play size={12} /> Start
                                  </button>
                                )}

                                {roundResult?.status === 'completed' && roundResult?.report_id && (
                                  <button className="action-btn btn-scorecard" disabled={isActing} onClick={() => {
                                    const candId = roundResult.candidate_id;
                                    if (candId) navigate(`/recruiter/candidates/${candId}/report`);
                                  }}>
                                    <FileText size={12} /> Report
                                  </button>
                                )}

                                {roundResult?.live_room_id && roundResult?.status !== 'completed' && (
                                  <button className="action-btn btn-scorecard" disabled={isActing} onClick={() => navigate(`/recruiter/live-room/${roundResult.live_room_id}`)}>
                                    <Video size={12} /> Join Call
                                  </button>
                                )}

                                <button className="action-btn btn-scorecard" disabled={isActing} onClick={() => navigate(`/recruiter/scorecard/${app.id}`)}>
                                  <BarChart3 size={12} /> Scorecard
                                </button>

                                {roundResult?.status === 'completed' && (
                                  <button className="action-btn btn-scorecard" style={{borderColor: 'rgba(16,185,129,0.3)', color: '#10b981'}} disabled={isActing} onClick={() => handleAdvance(app.id)}>
                                    <ChevronRight size={12} /> Advance
                                  </button>
                                )}

                                <button className="action-btn btn-reject" disabled={isActing} onClick={() => handleReject(app.id)}>
                                  <XCircle size={12} /> Reject
                                </button>
                              </div>
                            )}

                            {app.stage === 'hired' && (
                              <div className="d-flex align-items-center gap-1 mt-2" style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
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
    </>
  );
}
