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
    <div className="page-container">
      <Navbar />

      <div className="container py-4 page-content">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.2rem',
                color: 'var(--text-primary)',
              }}
            >
              DASHBOARD
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Welcome back, {user?.name}
            </p>
          </div>
          <Link to="/recruiter/create" className="btn-gradient d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            New Interview
          </Link>
        </div>

        {/* Stats */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card-glass d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--pale-purple)',
                }}
              >
                <ClipboardList size={22} color="var(--primary-purple)" />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {stats?.total_interviews ?? interviews.length}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Interviews</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card-glass d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(59,130,246,0.1)',
                }}
              >
                <Users size={22} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {stats?.total_candidates ?? '—'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Candidates</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card-glass d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16,185,129,0.1)',
                }}
              >
                <CheckCircle size={22} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {stats?.completed_sessions ?? '—'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card-glass d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245,158,11,0.1)',
                }}
              >
                <BarChart3 size={22} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {stats?.avg_score != null ? stats.avg_score : '—'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Interview List */}
        {loading ? (
          <LoadingSpinner />
        ) : interviews.length === 0 ? (
          <div className="card-glass text-center py-5">
            <Briefcase size={48} color="var(--text-muted)" className="mb-3" />
            <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              NO INTERVIEWS YET
            </h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Create your first interview to start evaluating candidates
            </p>
            <Link to="/recruiter/create" className="btn-primary-ios">
              Create Interview
            </Link>
          </div>
        ) : (
          <div className="row g-3">
            {interviews.map((interview) => (
              <div key={interview.id} className="col-md-6 col-lg-4">
                <div className="card-glass h-100">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.3rem',
                          color: 'var(--text-primary)',
                          margin: 0,
                        }}
                      >
                        {interview.title}
                      </h5>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {interview.job_role}
                      </span>
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => handleDelete(interview.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {interview.topics.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{interview.total_questions} questions</span>
                    <span className="chip" style={{
                      background: interview.difficulty === 'hard' ? 'var(--error-bg)' : interview.difficulty === 'medium' ? 'var(--warn-bg)' : 'var(--success-bg)',
                      color: interview.difficulty === 'hard' ? 'var(--error)' : interview.difficulty === 'medium' ? 'var(--warn)' : 'var(--success)',
                    }}>
                      {interview.difficulty}
                    </span>
                  </div>

                  <div className="d-flex gap-2">
                    <Link
                      to={`/recruiter/interviews/${interview.id}/candidates`}
                      className="btn-outline-purple flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <Users size={14} />
                      Candidates
                    </Link>
                    <button
                      className="btn-primary-ios d-flex align-items-center gap-1"
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
  );
}
