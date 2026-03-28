import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard, Briefcase } from 'lucide-react';
import logo from '../../assets/logo.png';

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
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
        <img
          src={logo}
          alt="InterviewOS Logo"
          style={{ width: 32, height: 32, objectFit: 'contain' }}
        />
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: '1.3rem',
          color: 'var(--text-primary)', letterSpacing: '2px',
        }}>
          INTERVIEW<span style={{ color: '#00C0FF', textShadow: '0 0 10px rgba(0,192,255,0.4)' }}>OS</span>
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
