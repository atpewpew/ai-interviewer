import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { registerCandidate, getSessionByCandidate } from '../../api';
import { Upload, ArrowRight, Code2 } from 'lucide-react';

export default function CandidateEntry() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [resume, setResume] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume) {
      setError('Please upload your resume (PDF)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('interview_id', interviewId);
      formData.append('github_username', githubUsername);
      formData.append('resume', resume);

      const { data: candidate } = await registerCandidate(formData);
      const { data: session } = await getSessionByCandidate(candidate.id);

      // Store candidate info for the interview
      sessionStorage.setItem('candidateId', candidate.id);
      sessionStorage.setItem('sessionId', session.id);
      sessionStorage.setItem('candidateName', candidate.name);

      navigate(`/interview/${interviewId}/lobby`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="card-glass fade-in" style={{ width: '100%', maxWidth: 480, padding: '2.5rem' }}>
        <div className="text-center mb-4">
          <div
            className="mx-auto mb-3"
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.3rem',
            }}
          >
            IO
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)' }}>
            JOIN INTERVIEW
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your details and upload your resume to begin
          </p>
        </div>

        {error && <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Full Name</label>
            <input
              className="form-control-ios"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your full name"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Email</label>
            <input
              type="email"
              className="form-control-ios"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
              <Code2 size={14} /> GitHub Username <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="form-control-ios"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="e.g. octocat"
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Resume (PDF)</label>
            <div
              className="d-flex align-items-center justify-content-center p-4 rounded"
              style={{
                border: '2px dashed var(--border-color)',
                cursor: 'pointer',
                background: resume ? 'var(--pale-purple)' : 'transparent',
              }}
              onClick={() => document.getElementById('resume-input').click()}
            >
              <input
                id="resume-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => setResume(e.target.files[0])}
              />
              <div className="text-center">
                <Upload size={24} color="var(--primary-purple)" className="mb-2" />
                <div style={{ fontSize: '0.85rem', color: resume ? 'var(--primary-purple)' : 'var(--text-muted)' }}>
                  {resume ? resume.name : 'Click to upload your resume'}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-gradient w-100 d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
            style={{ padding: '0.75rem' }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <>
                Continue to Lobby <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
