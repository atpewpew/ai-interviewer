import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import {
  Brain, Mic, Shield, BarChart3, Zap, Clock,
  ArrowRight, ChevronRight, Sparkles, UserCheck, 
  Play, Bot, Code, Cpu, LineChart, Target
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const FADE_UP = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9] } }
};

const STAGGER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function LandingPage() {
  const { user } = useAuth();
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="page-container" style={{ overflowX: 'hidden' }}>
      <div className="grid-pattern" style={{ opacity: 0.6 }} />

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="navbar-dark d-flex align-items-center justify-content-between px-4 py-3"
        style={{ position: 'fixed', width: '100%', zIndex: 100 }}
      >
        <div className="d-flex align-items-center gap-2">
          <img src={logoImg} alt="InterviewOS" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.5rem',
            color: 'var(--text-primary)', letterSpacing: '2.5px',
          }}>
            INTERVIEW<span style={{ color: '#00C0FF', textShadow: '0 0 15px rgba(0,192,255,0.6)' }}>OS</span>
          </span>
        </div>
        <div className="d-flex align-items-center gap-4">
          <Link to="/pricing" className="btn-ghost" style={{ fontSize: '1rem', letterSpacing: '1px' }}>Pricing</Link>
          {user ? (
            <Link to="/recruiter/dashboard" className="btn-gradient" style={{ padding: '0.6rem 1.8rem' }}>
              Dashboard <ChevronRight size={18} />
            </Link>
          ) : (
            <div className="d-flex gap-3">
              <Link to="/login" className="btn-ghost">Sign In</Link>
              <Link to="/login" className="btn-gradient" style={{ padding: '0.6rem 1.8rem', letterSpacing: '0.5px' }}>
                Start Free <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>
      </motion.nav>

      {/* ── Hero Section ── */}
      <section className="landing-hero" style={{ paddingTop: '8rem', minHeight: '100vh', position: 'relative' }}>
        {/* Animated Orbs */}
        <div className="hero-bg" style={{ zIndex: 0 }}>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="orb orb-1" 
          />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="orb orb-2" 
          />
        </div>

        <motion.div 
          className="hero-content" 
          style={{ zIndex: 2, y: yParallax, opacity: opacityFade }}
          initial="hidden"
          animate="visible"
          variants={STAGGER}
        >
          <motion.div variants={FADE_UP} style={{ marginBottom: '2rem' }}>
            <span
              className="chip hover-glow"
              style={{
                background: 'rgba(115,83,246,0.15)',
                border: '1px solid rgba(115,83,246,0.4)',
                color: '#fff',
                padding: '0.5rem 1.5rem',
                fontSize: '0.9rem',
                boxShadow: '0 0 20px rgba(115,83,246,0.2)',
                borderRadius: '30px',
                letterSpacing: '1px'
              }}
            >
              <Sparkles size={16} style={{ marginRight: 8, color: 'var(--sky-blue)' }} />
              Eliminate Manual Screening Forever
            </span>
          </motion.div>

          <motion.h1 variants={FADE_UP} style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(4rem, 10vw, 8.5rem)',
            lineHeight: 0.9,
            letterSpacing: '4px',
            marginBottom: '1.5rem',
            textShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            HIRE <span className="gradient-text">FASTER.</span><br />
            ZERO <span style={{ color: 'var(--text-muted)' }}>COMPROMISES.</span>
          </motion.h1>

          <motion.p variants={FADE_UP} style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            maxWidth: '700px',
            margin: '0 auto 3rem',
            fontWeight: 400
          }}>
            Stop wasting hundreds of hours on first-round interviews. 
            Deploy our autonomous AI recruiter to conduct lifelike, adaptive interviews 
            and instantly deliver a ranked shortlist of top candidates.
          </motion.p>

          <motion.div variants={FADE_UP} className="d-flex justify-content-center gap-4 flex-wrap">
            <Link to="/login" className="btn-gradient" style={{ 
              padding: '1rem 3rem', 
              fontSize: '1.1rem',
              boxShadow: '0 10px 30px rgba(115,83,246,0.4)',
              borderRadius: '50px'
            }}>
              Deploy AI Agent <Zap size={20} />
            </Link>
            <a href="#how-it-works" className="btn-outline-purple" style={{ 
              padding: '1rem 3rem', 
              fontSize: '1.1rem',
              background: 'rgba(13,13,18,0.5)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50px'
            }}>
              Watch Demo <Play size={20} />
            </a>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Mockup */}
        <motion.div
          initial={{ y: 150, opacity: 0, rotateX: 20 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
          style={{
            marginTop: '5rem',
            width: '100%',
            maxWidth: '1000px',
            perspective: '1000px',
            zIndex: 3
          }}
        >
          <div className="card-glass" style={{ 
            padding: '1rem', 
            border: '1px solid rgba(115,83,246,0.3)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 60px rgba(115,83,246,0.2)',
            position: 'relative'
          }}>
            <div className="d-flex align-items-center gap-2 mb-3 px-2">
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
              <div style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ai-interviewer-dashboard • Live Candidate Ranking
              </div>
            </div>
            
            <div style={{ 
                width: '100%', 
                borderRadius: '8px',
                height: '400px',
                background: 'linear-gradient(180deg, rgba(30, 30, 42, 0.4) 0%, rgba(13, 13, 18, 0.9) 100%)',
                position: 'relative',
                overflow: 'hidden'
              }} 
            >
              {/* Overlay UI elements to make it look like our app */}
              <div style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '85%',
                background: 'rgba(30,30,42,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                border: '1px solid rgba(115, 83, 246, 0.4)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }}>
                 <div className="d-flex justify-content-between align-items-center border-bottom pb-3" style={{ borderColor: 'rgba(255,255,255,0.05) !important'}}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>Top Candidates <span style={{color: 'var(--text-muted)'}}>(Frontend Role)</span></h3>
                    <span className="chip" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>AI Screening Complete</span>
                 </div>
                 {[98, 94, 87].map((score, i) => (
                   <div key={i} className="d-flex align-items-center justify-content-between" style={{ 
                     padding: '1.2rem', 
                     background: 'rgba(13,13,18,0.5)',
                     borderRadius: '12px',
                     border: '1px solid var(--border-color)',
                     transition: 'all 0.2s',
                     cursor: 'pointer'
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.borderColor = 'var(--border-glow)';
                     e.currentTarget.style.background = 'rgba(115, 83, 246, 0.05)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.borderColor = 'var(--border-color)';
                     e.currentTarget.style.background = 'rgba(13,13,18,0.5)';
                   }}
                   >
                      <div className="d-flex align-items-center gap-4">
                        <div className="score-badge" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>{score}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>Candidate_{i+102}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Technical: Strong • Communication: Excellent</div>
                        </div>
                      </div>
                      <div className="btn-ghost" style={{ padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>View Details</div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Social Proof / Stats ── */}
      <section style={{ 
        position: 'relative',
        borderTop: '1px solid rgba(115,83,246,0.2)', 
        borderBottom: '1px solid rgba(115,83,246,0.2)', 
        background: 'linear-gradient(90deg, var(--bg-primary), rgba(30, 30, 42, 0.4), var(--bg-primary))',
        padding: '5rem 0',
        marginTop: '6rem'
      }}>
        <div className="stats-row" style={{ padding: 0 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={STAGGER} className="d-flex flex-wrap justify-content-center w-100 gap-5">
            <StatCard value="2.5M+" label="Interviews Conducted" />
            <StatCard value="85%" label="Time Saved Screening" />
            <StatCard value="10x" label="Faster Time-to-Hire" />
            <StatCard value="99.9%" label="AI Proctoring Accuracy" />
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="landing-section" style={{ padding: '8rem 2rem' }}>
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={STAGGER}
          className="text-center"
        >
          <motion.span variants={FADE_UP} style={{ color: 'var(--sky-blue)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
            The Workflow
          </motion.span>
          <motion.h2 variants={FADE_UP} className="section-title mt-2 mb-4">
            FROM <span className="gradient-text">JOB POST</span> TO <span className="gradient-text">SHORTLIST</span>
          </motion.h2>
          <motion.p variants={FADE_UP} className="section-title-sub" style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 4rem', fontSize: '1.2rem', lineHeight: 1.6 }}>
            Fully automate your top-of-funnel screening. Let the AI handle the repetitive work while you focus on closing the best talent.
          </motion.p>
        </motion.div>

        <div className="d-flex flex-column gap-5 mx-auto" style={{ maxWidth: '900px' }}>
          <WorkflowStep 
            number="01"
            title="Define the Role"
            desc="Input your job description and skills required. The AI instantly generates a customized interview matrix spanning technical knowledge, soft skills, and scenario-based problem solving."
            icon={<Target size={32} />}
          />
          <WorkflowStep 
            number="02"
            title="AI Conducts Interviews"
            desc="Candidates interact via realistic two-way voice. Our adaptive engine adjusts question difficulty in real-time, digging deeper into weak areas and exploring strengths seamlessly."
            icon={<Mic size={32} />}
          />
          <WorkflowStep 
            number="03"
            title="Review the Ranked Shortlist"
            desc="Access a dashboard with perfectly calibrated candidate rankings. Dive into detailed scorecards, read transcripts, and watch crucial highlights without sitting through hours of video."
            icon={<LineChart size={32} />}
          />
        </div>
      </section>

      {/* ── Core Features ── */}
      <section id="features" className="landing-section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '8rem 2rem' }}>
        <div className="text-center mb-5 pb-4">
          <motion.span 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ color: 'var(--lavender)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Capabilities
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="section-title mt-2">
            ENGINEERED FOR <span className="gradient-text">PRECISION</span>
          </motion.h2>
        </div>

        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="features-grid"
        >
          <FeatureCard
            icon={<Brain size={28} />}
            title="Dynamic Follow-ups"
            desc="No rigid scripts. The AI comprehends answers and spontaneously asks probing follow-up questions to test true depth of knowledge."
          />
          <FeatureCard
            icon={<Shield size={28} />}
            title="Military-Grade Proctoring"
            desc="Multi-modal anti-cheating system tracks eye movement, background voices, and tab switching to ensure absolute integrity."
          />
          <FeatureCard
            icon={<Cpu size={28} />}
            title="Zero-Latency Voice"
            desc="Powered by advanced STT/TTS pipelines. Candidates experience completely natural, sub-second conversational latency."
          />
          <FeatureCard
            icon={<Code size={28} />}
            title="Live Code Evaluation"
            desc="Integrated code editor allows the AI to watch candidates code in real-time, ask about their logic, and evaluate algorithmic efficiency."
          />
          <FeatureCard
            icon={<Bot size={28} />}
            title="Unbiased Scoring"
            desc="Standardize your hiring bar. The AI evaluates every candidate against the exact same rubric, eliminating human fatigue and bias."
          />
          <FeatureCard
            icon={<UserCheck size={28} />}
            title="Frictionless Candidate UX"
            desc="No app downloads or accounts required for candidates. They just click a link, grant mic access, and start their interview on any device."
          />
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-section d-flex align-items-center justify-content-center" style={{ minHeight: '80vh', padding: '8rem 2rem' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(115,83,246,0.15) 0%, transparent 60%)', zIndex: 0 }} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="card-glass w-100"
          style={{
            maxWidth: 1000,
            padding: '6rem 4rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(30,30,42,0.8), rgba(13,13,18,0.95))',
            border: '1px solid rgba(115,83,246,0.3)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 40px rgba(115,83,246,0.2)',
            zIndex: 1
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--gradient)', width: '80px', height: '80px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(115,83,246,0.6)'
          }}>
            <Sparkles size={36} color="white" />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(3rem, 6vw, 5rem)',
            letterSpacing: '4px', marginBottom: '1.5rem', marginTop: '1rem',
            textShadow: '0 0 20px rgba(255,255,255,0.1)'
          }}>
            STOP SCREENING.<br/>
            <span className="gradient-text">START CLOSING.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', marginBottom: '4rem', maxWidth: '650px', margin: '0 auto 4rem', lineHeight: 1.6 }}>
            Join forward-thinking talent teams who have transformed their hiring funnel. Get unparalleled candidate insight at a fraction of the time.
          </p>
          <div className="d-flex justify-content-center gap-4 flex-wrap mt-5">
            <Link to="/login" className="btn-gradient" style={{ padding: '1.2rem 4rem', fontSize: '1.2rem', borderRadius: '50px' }}>
              Create Free Account <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '4rem 2rem 2rem',
          background: 'var(--bg-primary)',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between mx-auto" style={{ maxWidth: '1200px' }}>
          <div className="d-flex align-items-center gap-3 mb-4 mb-md-0">
            <img src={logoImg} alt="InterviewOS" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: 2, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              INTERVIEW<span style={{ color: '#00C0FF' }}>OS</span>
            </span>
          </div>
          <div className="d-flex gap-5" style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            <Link to="/pricing" className="btn-ghost px-0 hover-glow">Pricing</Link>
            <Link to="/privacy" className="btn-ghost px-0 hover-glow">Privacy</Link>
            <Link to="/terms" className="btn-ghost px-0 hover-glow">Terms</Link>
          </div>
        </div>
        <div className="text-center mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          © {new Date().getFullYear()} InterviewOS. All rights reserved. Built for modern recruiters.
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <motion.div 
      variants={FADE_UP}
      className="stat-item px-4"
    >
      <div className="stat-value gradient-text mb-2" style={{ fontSize: '4rem', textShadow: '0 0 30px rgba(115,83,246,0.3)', lineHeight: 1 }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '2px' }}>{label}</div>
    </motion.div>
  );
}

function WorkflowStep({ number, title, desc, icon }) {
  return (
    <motion.div 
      variants={FADE_UP}
      className="card-glass w-100" 
      style={{ 
        padding: '3rem 4rem', 
        position: 'relative', 
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(30, 30, 42, 0.4)'
      }}
    >
      <div style={{ position: 'absolute', top: '-15%', right: '-5%', opacity: 0.03, pointerEvents: 'none' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20rem', lineHeight: 1 }}>{number}</span>
      </div>
      <div className="d-flex align-items-center gap-4 mb-4" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '70px', height: '70px', borderRadius: '18px',
          background: 'var(--gradient-subtle)', border: '1px solid rgba(115,83,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sky-blue)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
        }}>
          {icon}
        </div>
        <div>
          <div style={{ color: 'var(--lavender)', fontSize: '1rem', fontWeight: 600, letterSpacing: '2.5px', marginBottom: '0.4rem' }}>PHASE {number}</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', margin: 0, letterSpacing: '2px' }}>{title}</h3>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', lineHeight: 1.8, margin: 0, position: 'relative', zIndex: 1, maxWidth: '90%' }}>
        {desc}
      </p>
    </motion.div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <motion.div variants={FADE_UP} className="feature-card" style={{ padding: '3rem 2.5rem' }}>
      <div className="feature-icon" style={{ 
        width: '64px', height: '64px', borderRadius: '18px',
        boxShadow: '0 15px 30px rgba(0,0,0,0.3)',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(115,83,246,0.2), rgba(0,192,255,0.1))',
        border: '1px solid rgba(115,83,246,0.3)'
      }}>
        {icon}
      </div>
      <h4 style={{
        fontFamily: 'var(--font-heading)', fontSize: '1.8rem',
        letterSpacing: '1.5px', marginBottom: '1.2rem',
        color: 'var(--text-primary)',
      }}>
        {title.toUpperCase()}
      </h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7, margin: 0 }}>
        {desc}
      </p>
    </motion.div>
  );
}
