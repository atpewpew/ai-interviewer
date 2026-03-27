import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJobs, deleteJob } from '../../api';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  PlusCircle, Briefcase, Trash2, Users, MapPin, ChevronRight,
  Building2, Eye,
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
    <div className="page-container">
      <Navbar />
      <div className="container py-4 page-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', color: 'var(--text-primary)' }}>
              JOB OPENINGS
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Manage positions and hiring pipelines
            </p>
          </div>
          <Link to="/recruiter/jobs/create" className="btn-gradient d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            New Job
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : jobs.length === 0 ? (
          <div className="card-glass text-center py-5">
            <Briefcase size={48} color="var(--text-muted)" className="mb-3" />
            <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              NO JOBS YET
            </h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Create your first job opening with a hiring pipeline
            </p>
            <Link to="/recruiter/jobs/create" className="btn-primary-ios">Create Job</Link>
          </div>
        ) : (
          <div className="row g-3">
            {jobs.map((job) => {
              const sc = statusColor(job.status);
              return (
                <div key={job.id} className="col-md-6 col-lg-4">
                  <div className="card-glass h-100">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h5 style={{
                          fontFamily: 'var(--font-heading)', fontSize: '1.2rem',
                          color: 'var(--text-primary)', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {job.title}
                        </h5>
                        <div className="d-flex flex-wrap gap-2 mt-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {job.department && (
                            <span className="d-flex align-items-center gap-1">
                              <Building2 size={12} /> {job.department}
                            </span>
                          )}
                          {job.location && (
                            <span className="d-flex align-items-center gap-1">
                              <MapPin size={12} /> {job.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <span className="chip" style={{ background: sc.bg, color: sc.color, fontSize: '0.7rem' }}>
                          {job.status}
                        </span>
                        <button
                          className="btn btn-sm" style={{ color: 'var(--text-muted)' }}
                          onClick={() => handleDelete(job.id)} title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Pipeline rounds preview */}
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {job.pipeline.map((r, i) => (
                        <span key={i} className="chip" style={{ fontSize: '0.7rem' }}>
                          R{r.round_number}: {r.round_type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span className="d-flex align-items-center gap-1">
                        <Users size={14} /> {job.applicant_count} applicants
                      </span>
                      <span>{job.pipeline.length} rounds</span>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn-outline-purple flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => navigate(`/recruiter/jobs/${job.id}/pipeline`)}
                      >
                        <Eye size={14} /> Pipeline
                      </button>
                      <button
                        className="btn-primary-ios d-flex align-items-center gap-1"
                        style={{ fontSize: '0.85rem' }}
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
  );
}
