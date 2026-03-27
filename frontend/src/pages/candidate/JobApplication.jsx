import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicJob, applyToJob } from '../../api';
import Navbar from '../../components/shared/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Briefcase, MapPin, Building2, Upload, CheckCircle } from 'lucide-react';

export default function JobApplication() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [github, setGithub] = useState('');
  const [resume, setResume] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getPublicJob(jobId);
        setJob(data);
      } catch {
        setError('Job not found or no longer accepting applications.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume) { setError('Please upload your resume'); return; }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('github_username', github);
      formData.append('resume', resume);
      await applyToJob(jobId, formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container"><Navbar /><div className="container py-5 page-content"><LoadingSpinner /></div></div>;

  if (submitted) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="container py-5 page-content d-flex flex-column align-items-center" style={{ maxWidth: 600 }}>
          <div className="card-glass text-center py-5 w-100">
            <CheckCircle size={64} color="var(--success)" className="mb-3" />
            <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>APPLICATION SUBMITTED</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Thank you for applying{job ? ` to ${job.title}` : ''}! The hiring team will review your application and reach out with next steps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      <div className="container py-4 page-content" style={{ maxWidth: 700 }}>
        {job ? (
          <>
            {/* Job Info */}
            <div className="card-glass mb-4">
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)' }}>
                {job.title}
              </h1>
              <div className="d-flex flex-wrap gap-3 mb-3" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {job.department && <span className="d-flex align-items-center gap-1"><Building2 size={14} /> {job.department}</span>}
                {job.location && <span className="d-flex align-items-center gap-1"><MapPin size={14} /> {job.location}</span>}
                <span className="d-flex align-items-center gap-1"><Briefcase size={14} /> {job.job_type.replace('_', ' ')}</span>
                <span>{job.total_rounds} interview round{job.total_rounds !== 1 ? 's' : ''}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {job.description}
              </p>
              {job.requirements.length > 0 && (
                <div>
                  <h6 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>REQUIREMENTS</h6>
                  <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem' }}>
                    {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Application Form */}
            <div className="card-glass">
              <h5 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                APPLY NOW
              </h5>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Full Name</label>
                  <input className="form-control-ios" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Email</label>
                  <input type="email" className="form-control-ios" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>GitHub Username (optional)</label>
                  <input className="form-control-ios" value={github} onChange={(e) => setGithub(e.target.value)}
                    placeholder="e.g. johndoe" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Resume (PDF)</label>
                  <div className="d-flex align-items-center gap-2">
                    <label className="btn-outline-purple d-flex align-items-center gap-1" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                      <Upload size={14} /> {resume ? resume.name : 'Choose file'}
                      <input type="file" accept=".pdf" hidden onChange={(e) => setResume(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn-gradient w-100" disabled={submitting} style={{ padding: '0.75rem' }}>
                  {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Submit Application'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="card-glass text-center py-5">
            <p style={{ color: 'var(--text-muted)' }}>{error || 'Job not found.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
