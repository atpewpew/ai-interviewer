import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Brain, Mic, Shield, BarChart3, Zap, Clock,
  ArrowRight, ChevronRight, Sparkles,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="grid-pattern" />

      {/* ── Navbar ── */}
      <nav
        className="d-flex align-items-center justify-content-between px-4 py-3"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 100,
          background: 'rgba(13,13,18,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <img src={logoImg} alt="InterviewOS" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.4rem',
            color: 'var(--text-primary)', letterSpacing: '2px',
          }}>
            INTERVIEW<span style={{ color: '#00C0FF', textShadow: '0 0 10px rgba(0,192,255,0.4)' }}>OS</span>
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Link to="/pricing" className="btn-ghost">Pricing</Link>
          {user ? (
            <Link to="/recruiter/dashboard" className="btn-gradient" style={{ padding: '0.5rem 1.5rem' }}>
              Dashboard <ChevronRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign In</Link>
              <Link to="/login" className="btn-gradient" style={{ padding: '0.5rem 1.5rem' }}>
                Get Started <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="hero-bg">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <div className="hero-content">
          <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
            <span
              className="chip"
              style={{
                background: 'rgba(115,83,246,0.1)',
                border: '1px solid rgba(115,83,246,0.2)',
                color: 'var(--lavender)',
                padding: '0.4rem 1.2rem',
                fontSize: '0.8rem',
              }}
            >
              <Sparkles size={14} style={{ marginRight: 6 }} />
              AI-Powered Interview Platform
            </span>
          </div>

          <h1 className="hero-title fade-in-delay-1">
            <span className="gradient-text">INTERVIEW</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>REIMAGINED</span>
          </h1>

          <p className="hero-subtitle fade-in-delay-2">
            The AI interviewer that adapts in real-time. Evaluate candidates with
            voice-powered conversations, live proctoring, and instant analytics.
          </p>

          <div className="hero-cta-group fade-in-delay-3">
            <Link to="/login" className="btn-gradient" style={{ padding: '0.85rem 2.5rem', fontSize: '1rem' }}>
              Start Free <ArrowRight size={18} />
            </Link>
            <a href="#features" className="btn-outline-purple" style={{ padding: '0.85rem 2.5rem' }}>
              See How It Works
            </a>
          </div>
        </div>

        {/* Floating animated ring */}
        <div
          style={{
            position: 'absolute', bottom: '8%', left: '50%',
            transform: 'translateX(-50%)',
            width: 400, height: 400,
            border: '1px solid rgba(115,83,246,0.1)',
            borderRadius: '50%',
            animation: 'counter-spin 30s linear infinite',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
            width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-purple)',
            boxShadow: '0 0 15px rgba(115,83,246,0.6)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, right: 0, transform: 'translate(50%, 50%)',
            width: 6, height: 6, borderRadius: '50%', background: 'var(--sky-blue)',
            boxShadow: '0 0 15px rgba(92,201,245,0.6)',
          }} />
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div className="stats-row">
          <div className="stat-item fade-in">
            <div className="stat-value gradient-text">50+</div>
            <div className="stat-label">Interview Dimensions</div>
          </div>
          <div className="stat-item fade-in-delay-1">
            <div className="stat-value gradient-text">&lt;2s</div>
            <div className="stat-label">Response Latency</div>
          </div>
          <div className="stat-item fade-in-delay-2">
            <div className="stat-value gradient-text">99%</div>
            <div className="stat-label">Accuracy Rate</div>
          </div>
          <div className="stat-item fade-in-delay-3">
            <div className="stat-value gradient-text">24/7</div>
            <div className="stat-label">Always Available</div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="landing-section">
        <h2 className="section-title gradient-text">BUILT DIFFERENT</h2>
        <p className="section-subtitle">
          Every feature engineered for the future of hiring
        </p>

        <div className="features-grid">
          <FeatureCard
            icon={<Brain size={24} />}
            title="Adaptive AI Engine"
            desc="Questions adapt in real-time based on candidate responses. Deeper follow-ups for strong answers, easier pivots for weak ones."
          />
          <FeatureCard
            icon={<Mic size={24} />}
            title="Voice-First Interface"
            desc="Natural conversation flow with live speech-to-text powered by Deepgram Nova-2. No typing, just talking."
          />
          <FeatureCard
            icon={<Shield size={24} />}
            title="AI Proctoring"
            desc="Face detection, gaze tracking, tab-switch monitoring. Real-time integrity scoring with detailed flag timeline."
          />
          <FeatureCard
            icon={<BarChart3 size={24} />}
            title="Instant Reports"
            desc="Multi-dimensional scoring across Technical, Communication, and Depth. AI-generated hiring recommendations."
          />
          <FeatureCard
            icon={<Zap size={24} />}
            title="Zero Setup"
            desc="Share a link, candidates join instantly. No downloads, no accounts needed. Just click and interview."
          />
          <FeatureCard
            icon={<Clock size={24} />}
            title="10x Faster Hiring"
            desc="Screen hundreds of candidates simultaneously. Each interview generates a comprehensive, actionable report."
          />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-section" style={{ textAlign: 'center' }}>
        <div
          className="card-glass-static mx-auto"
          style={{
            maxWidth: 600,
            padding: '3.5rem 2.5rem',
            border: '1px solid rgba(115,83,246,0.15)',
            background: 'var(--gradient-subtle)',
          }}
        >
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: '2.5rem',
            letterSpacing: 3, marginBottom: '1rem',
          }}>
            READY TO <span className="gradient-text">TRANSFORM</span> HIRING?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Join the next generation of recruiters using AI-powered interviews
            to find the best talent faster.
          </p>
          <Link to="/login" className="btn-gradient" style={{ padding: '0.9rem 3rem', fontSize: '1rem' }}>
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}
      >
        <div className="d-flex align-items-center justify-content-center gap-2">
          <img src={logoImg} alt="InterviewOS" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: 1.5, color: 'var(--text-secondary)' }}>
            INTERVIEW<span style={{ color: '#00C0FF', textShadow: '0 0 10px rgba(0,192,255,0.4)' }}>OS</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h4 style={{
        fontFamily: 'var(--font-heading)', fontSize: '1.3rem',
        letterSpacing: 1.5, marginBottom: '0.5rem',
        color: 'var(--text-primary)',
      }}>
        {title.toUpperCase()}
      </h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}
