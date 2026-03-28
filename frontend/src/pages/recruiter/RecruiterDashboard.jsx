import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInterviews, deleteInterview, getDashboardStats } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  PlusCircle, Briefcase, Trash2, Users, ClipboardList, ChevronRight,
  CheckCircle, BarChart3,
} from 'lucide-react';

export default function RecruiterDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
    fetchStats();
  }, []);

  const fetchInterviews = async () => {
    try {
      const { data } = await getInterviews();
      setInterviews(data);
    } catch (err) {
      console.error('Failed to load interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this interview? This cannot be undone.')) return;
    try {
      await deleteInterview(id);
      setInterviews((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <>
      <style>{`
        .dashboard-container {
          background-color: #0A0A0F;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }
        .dashboard-orb {
          position: absolute;
          top: -10%;
          right: -5%;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, #7353F6 0%, transparent 70%);
          opacity: 0.08;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .content-wrapper {
          position: relative;
          z-index: 1;
        }
        .stat-card {
          background: #12121A;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
          height: 100%;
          transition: border-color 0.2s ease;
          position: relative;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .stat-card:hover {
          border-color: rgba(115, 83, 246, 0.3);
        }
        .stat-icon-wrapper {
          position: relative;
          width: 44px;
          height: 44px;
        }
        .stat-icon-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          z-index: 1;
        }
        .stat-icon-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          filter: blur(14px);
          opacity: 0.4;
          z-index: 0;
        }
        .stat-number {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.5rem;
          color: white;
          line-height: 1;
        }
        .stat-label {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.75rem;
          color: #6B7280;
          margin-top: 4px;
        }
        
        .job-card {
          background: #12121A;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
          height: 100%;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .job-card:hover {
          border-color: rgba(115, 83, 246, 0.25);
          transform: translateY(-2px);
        }
        .job-card-topic {
          background: rgba(115, 83, 246, 0.15);
          border: 1px solid rgba(115, 83, 246, 0.3);
          color: #A88BFF;
          border-radius: 100px;
          padding: 2px 10px;
          font-size: 0.7rem;
        }
        .job-card-difficulty-medium {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #F59E0B;
          border-radius: 100px;
          padding: 2px 10px;
          font-size: 0.7rem;
        }
        .job-card-difficulty-hard {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #EF4444;
          border-radius: 100px;
          padding: 2px 10px;
          font-size: 0.7rem;
        }
        .job-card-difficulty-easy {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22C55E;
          border-radius: 100px;
          padding: 2px 10px;
          font-size: 0.7rem;
        }
        .job-card-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 1rem 0;
          width: 100%;
        }
        .btn-candidates {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: white;
          transition: border-color 0.2s ease;
          flex: 1;
        }
        .btn-candidates:hover {
          border-color: #7353F6;
          color: white;
        }
        .btn-copy-link {
          background: rgba(115, 83, 246, 0.2);
          border: 1px solid rgba(115, 83, 246, 0.4);
          color: #A88BFF;
          transition: background 0.2s ease;
        }
        .btn-copy-link:hover {
          background: rgba(115, 83, 246, 0.35);
          color: #A88BFF;
        }
        .btn-new-interview {
          background: linear-gradient(to right, #7353F6, #00C0FF);
          border: none;
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(115, 83, 246, 0.4);
          text-decoration: none;
          transition: filter 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-new-interview:hover {
          filter: brightness(1.1);
          color: white;
        }
        .empty-state-card {
          background: #12121A;
          border: 1px dashed rgba(115, 83, 246, 0.3);
          border-radius: 16px;
          padding: 4rem 2rem;
          text-align: center;
          max-width: 500px;
          margin: 0 auto;
        }
      `}</style>

      <div className="dashboard-container">
        <div className="dashboard-orb"></div>
        <div className="content-wrapper">
          <Navbar />

          <div className="container py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-5">
              <div>
                <h1
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '2.5rem',
                    color: 'white',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  DASHBOARD
                </h1>
                <p style={{ color: '#A0A0B0', margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Welcome back, {user?.name}
                </p>
              </div>
              <Link to="/recruiter/create" className="btn-new-interview">
                <PlusCircle size={18} />
                New Interview
              </Link>
            </div>

            {/* Stats */}
            <div className="row g-3 mb-5">
              <div className="col-md-3 col-6">
                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon-glow" style={{ background: '#7353F6' }}></div>
                    <div className="stat-icon-container" style={{ background: 'rgba(115, 83, 246, 0.15)' }}>
                      <ClipboardList size={22} color="#7353F6" />
                    </div>
                  </div>
                  <div>
                    <div className="stat-number">
                      {stats?.total_interviews ?? interviews.length}
                    </div>
                    <div className="stat-label">Total Interviews</div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3 col-6">
                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon-glow" style={{ background: '#5CC9F5' }}></div>
                    <div className="stat-icon-container" style={{ background: 'rgba(92, 201, 245, 0.15)' }}>
                      <Users size={22} color="#5CC9F5" />
                    </div>
                  </div>
                  <div>
                    <div className="stat-number">
                      {stats?.total_candidates ?? '—'}
                    </div>
                    <div className="stat-label">Total Candidates</div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 col-6">
                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon-glow" style={{ background: '#22C55E' }}></div>
                    <div className="stat-icon-container" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                      <CheckCircle size={22} color="#22C55E" />
                    </div>
                  </div>
                  <div>
                    <div className="stat-number">
                      {stats?.completed_sessions ?? '—'}
                    </div>
                    <div className="stat-label">Completed</div>
                  </div>
                </div>
              </div>

              <div className="col-md-3 col-6">
                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon-glow" style={{ background: '#F59E0B' }}></div>
                    <div className="stat-icon-container" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                      <BarChart3 size={22} color="#F59E0B" />
                    </div>
                  </div>
                  <div>
                    <div className="stat-number">
                      {stats?.avg_score != null ? stats.avg_score : '—'}
                    </div>
                    <div className="stat-label">Avg Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interview List */}
            {loading ? (
              <LoadingSpinner />
            ) : interviews.length === 0 ? (
              <div className="empty-state-card">
                <div className="mb-3 d-flex justify-content-center">
                  <Briefcase size={48} color="#7353F6" />
                </div>
                <h4 style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
                  No interviews yet
                </h4>
                <p style={{ color: '#6B7280', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>
                  Create your first interview
                </p>
                <Link to="/recruiter/create" className="btn-new-interview d-inline-flex mt-4 mx-auto">
                  Create Interview
                </Link>
              </div>
            ) : (
              <div className="row g-3">
                {interviews.map((interview) => (
                  <div key={interview.id} className="col-md-6 col-lg-4">
                    <div className="job-card">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: '1.2rem',
                              color: 'white',
                              margin: 0,
                              lineHeight: 1.2
                            }}
                          >
                            {interview.title}
                          </h5>
                          <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: "'Montserrat', sans-serif" }}>
                            {interview.job_role}
                          </span>
                        </div>
                        <button
                          className="btn btn-sm"
                          style={{ color: '#6B7280' }}
                          onClick={() => handleDelete(interview.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {interview.topics.map((t) => (
                          <span key={t} className="job-card-topic">{t}</span>
                        ))}
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-auto">
                        <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: "'Montserrat', sans-serif" }}>
                          {interview.total_questions} questions
                        </span>
                        <span className={
                          interview.difficulty === 'hard' ? 'job-card-difficulty-hard' :
                          interview.difficulty === 'medium' ? 'job-card-difficulty-medium' :
                          'job-card-difficulty-easy'
                        }>
                          {interview.difficulty}
                        </span>
                      </div>

                      <div className="job-card-divider"></div>

                      <div className="d-flex gap-2">
                        <Link
                          to={`/recruiter/interviews/${interview.id}/candidates`}
                          className="btn btn-candidates d-flex align-items-center justify-content-center gap-2"
                          style={{ fontSize: '0.85rem' }}
                        >
                          <Users size={14} />
                          Candidates
                        </Link>
                        <button
                          className="btn btn-copy-link d-flex align-items-center justify-content-center gap-1"
                          style={{ fontSize: '0.85rem' }}
                          onClick={() => {
                            const link = `${window.location.origin}/interview/${interview.id}/join`;
                            navigator.clipboard.writeText(link);
                            alert('Candidate link copied to clipboard!');
                          }}
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
