import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav
      className="d-flex align-items-center justify-content-between px-4 py-3"
      style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        to="/"
        className="d-flex align-items-center gap-2 text-decoration-none"
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
          }}
        >
          IO
        </div>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.4rem',
            color: 'var(--graphite-black)',
            letterSpacing: '1.5px',
          }}
        >
          INTERVIEWOS
        </span>
      </Link>

      {user && (
        <div className="d-flex align-items-center gap-3">
          {user.role === 'recruiter' && (
            <Link
              to="/recruiter/dashboard"
              className="btn btn-sm btn-outline-purple d-flex align-items-center gap-1"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {user.name}
          </span>
          <button
            onClick={handleLogout}
            className="btn btn-sm"
            style={{ color: 'var(--text-muted)' }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}
