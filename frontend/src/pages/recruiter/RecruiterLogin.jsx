import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import '../../styles/auth.css';

export default function RecruiterLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name, 'recruiter');
      } else {
        await login(email, password);
      }
      navigate('/recruiter/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left Pane: Brand Canvas (desktop only) ── */}
      <div className="auth-brand-pane">
        <div className="fluid-mesh" />
        <div className="grid-overlay" />

        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <img src={logoImg} alt="InterviewOS" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span className="logo-text">
              INTERVIEW<span className="cyan">OS</span>
            </span>
          </div>

          <h1 className="auth-brand-headline">
            Hire <span className="gradient-word">Smarter</span>,
            <br />
            Not Harder.
          </h1>

          <p className="auth-brand-subtext">
            Replace disjointed technical screening with an AI-driven
            environment that conducts real-time, high-signal technical
            interviews.
          </p>

          <div className="auth-brand-footer">
            <div className="line line-short" />
            <span>System Ready</span>
            <div className="line line-grow" />
          </div>
        </div>
      </div>

      {/* ── Right Pane: Form Area ── */}
      <div className="auth-form-pane">
        {/* Mobile header */}
        <div className="auth-mobile-header">
          <img src={logoImg} alt="InterviewOS" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span className="logo-text-sm">
            INTERVIEW<span className="cyan">OS</span>
          </span>
        </div>

        <div className="auth-form-container">
          {/* Back link */}
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} />
            Back
          </Link>

          <h2 className="auth-form-title">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="auth-form-subtitle">
            {isRegister
              ? 'Start your free trial. No credit card required.'
              : 'Sign in to your recruiter portal.'}
          </p>

          {error && <div className="auth-error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Name field (register only) */}
            {isRegister && (
              <div className="auth-input-group">
                <input
                  type="text"
                  className="auth-floating-input"
                  id="auth-name"
                  placeholder=" "
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <label className="auth-floating-label" htmlFor="auth-name">
                  Full Name
                </label>
              </div>
            )}

            {/* Email field */}
            <div className="auth-input-group">
              <input
                type="email"
                className="auth-floating-input"
                id="auth-email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="auth-floating-label" htmlFor="auth-email">
                Work Email
              </label>
            </div>

            {/* Password field */}
            <div className="auth-input-group">
              <input
                type="password"
                className="auth-floating-input"
                id="auth-password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <label className="auth-floating-label" htmlFor="auth-password">
                Password (min. 6 characters)
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <div className="auth-spinner" />
              ) : (
                <>
                  {isRegister ? 'Start Free Trial' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Toggle between login/register */}
          <div className="auth-toggle-text">
            {isRegister
              ? 'Already have an account?'
              : "Don't have an account?"}
            <button
              className="auth-toggle-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
            >
              {isRegister ? 'Log in' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
