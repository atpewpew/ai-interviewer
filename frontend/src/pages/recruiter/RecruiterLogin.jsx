import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

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
    <div className="page-container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="card-glass fade-in" style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}>
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
            {isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isRegister ? 'Set up your recruiter account' : 'Sign in to your recruiter portal'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Full Name
              </label>
              <input
                type="text"
                className="form-control-ios"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Email
            </label>
            <input
              type="email"
              className="form-control-ios"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="recruiter@company.com"
            />
          </div>

          <div className="mb-4">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Password
            </label>
            <input
              type="password"
              className="form-control-ios"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
            />
          </div>

          <button
            type="submit"
            className="btn-gradient w-100 d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
            style={{ padding: '0.75rem' }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : isRegister ? (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            className="btn btn-link"
            style={{ color: 'var(--lavender)', fontSize: '0.85rem', textDecoration: 'none' }}
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
