import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInterviews, deleteInterview } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  PlusCircle, Briefcase, Trash2, Users, ClipboardList, ChevronRight,
} from 'lucide-react';

export default function RecruiterDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
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
    <div style={{ minHeight: '100vh', background: '#f8f8fc' }}>
      <Navbar />

      <div className="container py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.2rem',
                color: 'var(--graphite-black)',
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
          <div className="col-md-4">
            <div className="card-ios d-flex align-items-center gap-3">
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
                  {interviews.length}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Interviews</div>
              </div>
            </div>
          </div>
        </div>

        {/* Interview List */}
        {loading ? (
          <LoadingSpinner />
        ) : interviews.length === 0 ? (
          <div className="card-ios text-center py-5">
            <Briefcase size={48} color="var(--light-gray)" className="mb-3" />
            <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--graphite-black)' }}>
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
                <div className="card-ios h-100">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.3rem',
                          color: 'var(--graphite-black)',
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
                      background: interview.difficulty === 'hard' ? '#ffe0e0' : interview.difficulty === 'medium' ? '#fff3e0' : '#e0ffe0',
                      color: interview.difficulty === 'hard' ? '#c62828' : interview.difficulty === 'medium' ? '#e65100' : '#2e7d32',
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
