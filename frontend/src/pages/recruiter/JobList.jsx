import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJobs, deleteJob } from '../../api';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  PlusCircle, Briefcase, Trash2, Users, MapPin, ChevronRight,
  Building2, Eye, Layers,
} from 'lucide-react';

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getJobs();
        setJobs(data);
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this job opening? This cannot be undone.')) return;
    try {
      await deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case 'active': return { bg: 'var(--success-bg)', color: 'var(--success)' };
      case 'paused': return { bg: 'var(--warn-bg)', color: 'var(--warn)' };
      case 'closed': return { bg: 'var(--error-bg)', color: 'var(--error)' };
      default: return { bg: 'var(--pale-purple)', color: 'var(--primary-purple)' };
    }
  };

  return (
    <>
      <style>{`
        .job-list-container {
          background-color: #0A0A0F;
          min-height: 100vh;
          font-family: 'Montserrat', sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        .job-list-orb {
          position: absolute;
          top: -10%;
          right: -5%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, #7353F6 0%, transparent 70%);
          opacity: 0.08;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .job-list-content {
          position: relative;
          z-index: 1;
        }
        .page-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          color: white;
          margin: 0;
        }
        .page-subtitle {
          color: #6B7280;
          font-family: 'Montserrat', sans-serif;
          margin: 0;
        }
        .btn-new-job {
          background: linear-gradient(to right, #7353F6, #00C0FF);
          border: none;
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(115,83,246,0.4);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: filter 0.2s;
        }
        .btn-new-job:hover {
          filter: brightness(1.1);
          color: white;
        }
        .job-card {
          background: #12121A;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          border-left: 3px solid #7353F6;
          padding: 1.5rem;
          transition: border-color 0.2s, transform 0.2s;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .job-card:hover {
          border-color: rgba(115,83,246,0.25);
          transform: translateY(-2px);
        }
        .job-card-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.3rem;
          color: white;
          margin: 0;
        }
        .badge-active {
          background: rgba(34,197,94,0.15);
          border: 1px solid rgba(34,197,94,0.3);
          color: #22C55E;
          border-radius: 100px;
          padding: 2px 10px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.7rem;
        }
        .badge-paused {
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          color: #F59E0B;
          border-radius: 100px;
          padding: 2px 10px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.7rem;
        }
        .badge-closed {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          color: #EF4444;
          border-radius: 100px;
          padding: 2px 10px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.7rem;
        }
        .btn-delete {
          background: transparent;
          border: none;
          color: #6B7280;
          cursor: pointer;
          transition: color 0.2s;
          padding: 0;
        }
        .btn-delete:hover {
          color: #EF4444;
        }
        .job-card-meta {
          color: #6B7280;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          margin-bottom: 16px;
        }
        .job-card-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .round-tag {
          background: rgba(115,83,246,0.12);
          border: 1px solid rgba(115,83,246,0.25);
          color: #A88BFF;
          border-radius: 100px;
          padding: 3px 10px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.7rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .dot-1 { background-color: #A88BFF; width: 6px; height: 6px; border-radius: 50%; }
        .dot-2 { background-color: #00C0FF; width: 6px; height: 6px; border-radius: 50%; }
        .dot-3 { background-color: #22C55E; width: 6px; height: 6px; border-radius: 50%; }
        .dot-4 { background-color: #F59E0B; width: 6px; height: 6px; border-radius: 50%; }
        .dot-default { background-color: #6B7280; width: 6px; height: 6px; border-radius: 50%; }

        .job-card-stats {
          display: flex;
          gap: 16px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.8rem;
          color: #6B7280;
          margin-top: auto;
          margin-bottom: 16px;
        }
        .job-card-stats div {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-pipeline {
          background: rgba(115,83,246,0.15);
          border: 1px solid rgba(115,83,246,0.35);
          color: #A88BFF;
          border-radius: 8px;
          padding: 0.5rem;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          transition: background 0.2s;
        }
        .btn-pipeline:hover {
          background: rgba(115,83,246,0.3);
          color: #A88BFF;
        }
        .btn-copy-link {
          background: #1E1E2E;
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.85rem;
          transition: border-color 0.2s;
        }
        .btn-copy-link:hover {
          border-color: #7353F6;
        }
        .empty-state-card {
          background: transparent;
          border: 1px dashed rgba(115,83,246,0.3);
          border-radius: 16px;
          padding: 4rem 2rem;
          text-align: center;
          max-width: 500px;
          margin: 0 auto;
        }
      `}</style>
      <div className="job-list-container">
        <div className="job-list-orb"></div>
        <div className="job-list-content">
          <Navbar />
          <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-5">
              <div>
                <h1 className="page-title">JOB OPENINGS</h1>
                <p className="page-subtitle">Manage positions and hiring pipelines</p>
              </div>
              <Link to="/recruiter/jobs/create" className="btn-new-job">
                <PlusCircle size={18} />
                New Job
              </Link>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : jobs.length === 0 ? (
              <div className="empty-state-card mt-5">
                <div className="mb-3 d-flex justify-content-center">
                  <Briefcase size={48} color="#7353F6" />
                </div>
                <h4 style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
                  No job openings yet
                </h4>
                <p style={{ color: '#6B7280', fontFamily: "'Montserrat', sans-serif", margin: 0 }}>
                  Create your first job opening
                </p>
                <Link to="/recruiter/jobs/create" className="btn-new-job d-inline-flex mt-4 mx-auto">
                  New Job
                </Link>
              </div>
            ) : (
              <div className="row g-4">
                {jobs.map((job) => {
                  return (
                    <div key={job.id} className="col-md-6">
                      <div className="job-card">
                        <div className="d-flex justify-content-between align-items-start">
                          <h5 className="job-card-title">{job.title}</h5>
                          <div className="d-flex align-items-center gap-2">
                            <span className={job.status === 'active' ? 'badge-active' : job.status === 'paused' ? 'badge-paused' : 'badge-closed'}>
                              {job.status}
                            </span>
                            <button className="btn-delete" onClick={() => handleDelete(job.id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="job-card-meta">
                          {job.department && (
                            <span><Building2 size={12} /> {job.department.toLowerCase()}</span>
                          )}
                          {job.location && (
                            <span><MapPin size={12} /> {job.location.toLowerCase()}</span>
                          )}
                        </div>

                        <div className="d-flex flex-wrap gap-2 mb-4">
                          {job.pipeline.map((r, i) => {
                            let dotClass = 'dot-default';
                            if (r.round_number === 1) dotClass = 'dot-1';
                            else if (r.round_number === 2) dotClass = 'dot-2';
                            else if (r.round_number === 3) dotClass = 'dot-3';
                            else if (r.round_number === 4) dotClass = 'dot-4';
                            
                            return (
                              <span key={i} className="round-tag">
                                <div className={dotClass}></div>
                                R{r.round_number}: {r.round_type.replace('_', ' ')}
                              </span>
                            );
                          })}
                        </div>

                        <div className="job-card-stats">
                          <div>
                            <Users size={14} />
                            <span>{job.applicant_count} applicants</span>
                          </div>
                          <div>
                            <Layers size={14} />
                            <span>{job.pipeline.length} rounds</span>
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          <button
                            className="btn-pipeline"
                            onClick={() => navigate(`/recruiter/jobs/${job.id}/pipeline`)}
                          >
                            <Eye size={16} /> Pipeline
                          </button>
                          <button
                            className="btn-copy-link"
                            onClick={() => {
                              const link = `${window.location.origin}/jobs/${job.id}/apply`;
                              navigator.clipboard.writeText(link);
                              alert('Application link copied!');
                            }}
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
