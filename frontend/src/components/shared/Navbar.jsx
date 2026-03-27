import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard, Briefcase } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar-dark d-flex align-items-center justify-content-between px-4 py-3">
      <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
        <div
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: 'var(--gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-heading)', fontSize: '1rem',
          }}
        >IO</div>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: '1.3rem',
          color: 'var(--text-primary)', letterSpacing: '2px',
        }}>
          INTERVIEWOS
        </span>
      </Link>

      {user && (
        <div className="d-flex align-items-center gap-3">
          {user.role === 'recruiter' && (
            <>
              <Link to="/recruiter/dashboard" className="btn-outline-purple d-flex align-items-center gap-1" style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}>
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <Link to="/recruiter/jobs" className="btn-outline-purple d-flex align-items-center gap-1" style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}>
                <Briefcase size={14} /> Jobs
              </Link>
            </>
          )}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {user.name}
          </span>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ padding: '0.4rem' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
