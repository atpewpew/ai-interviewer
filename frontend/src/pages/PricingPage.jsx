import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import '../styles/pricing.css';

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams hiring occasionally.',
    price: { monthly: 49, annual: 39 },
    features: [
      { text: 'Up to 10 AI Interviews/mo', highlight: false },
      { text: 'Standard Coding Environments', highlight: false },
      { text: 'Basic Capability Reports', highlight: false },
      { text: 'Email Support', highlight: false },
    ],
    cta: 'Get Started',
    variant: 'outline',
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For fast-growing engineering organizations.',
    price: { monthly: 299, annual: 239 },
    features: [
      { text: 'Unlimited AI Interviews', highlight: true },
      { text: 'Advanced System Design Scenarios', highlight: false },
      { text: 'Deep Actionable Analytics', highlight: false },
      { text: 'ATS Integrations (Greenhouse, Lever)', highlight: false },
      { text: 'Priority Support', highlight: false },
    ],
    cta: 'Start Free Trial',
    variant: 'gradient',
    popular: true,
    icon: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Custom models and dedicated infrastructure.',
    price: null,
    features: [
      { text: 'Custom AI Model Fine-tuning', highlight: false },
      { text: 'Dedicated Infrastructure', highlight: false },
      { text: 'Custom Security Compliance', highlight: false },
      { text: 'Dedicated Account Manager', highlight: false },
    ],
    cta: 'Contact Sales',
    variant: 'outline',
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="pricing-page">
      <div className="pricing-ambient-glow" />
      <div className="pricing-grid-bg" />

      {/* ── Navbar (same style as landing page) ── */}
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
        <Link to="/" className="d-flex align-items-center gap-2" style={{ textDecoration: 'none' }}>
          <img src={logoImg} alt="InterviewOS" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.4rem',
            color: 'var(--text-primary)', letterSpacing: '2px',
          }}>
            INTERVIEWOS
          </span>
        </Link>
        <div className="d-flex align-items-center gap-3">
          <Link to="/" className="btn-ghost">Home</Link>
          <Link to="/pricing" className="btn-ghost" style={{ color: 'var(--text-primary)' }}>Pricing</Link>
          <Link to="/login" className="btn-ghost">Sign In</Link>
          <Link to="/login" className="btn-gradient" style={{ padding: '0.5rem 1.5rem' }}>
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="pricing-hero">
        <h1>
          Simple, Transparent{' '}
          <span className="pricing-gradient-text">Pricing</span>
        </h1>
        <p>
          High-signal technical evaluations without burning countless
          engineering hours. Choose the plan that fits your hiring velocity.
        </p>
      </div>

      {/* ── Billing Toggle ── */}
      <div className="billing-toggle">
        <div className="billing-toggle-inner">
          <button
            className={`billing-toggle-btn ${billing === 'monthly' ? 'active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            className={`billing-toggle-btn ${billing === 'annual' ? 'active' : ''}`}
            onClick={() => setBilling('annual')}
          >
            Annual (Save 20%)
          </button>
        </div>
      </div>

      {/* ── Pricing Cards ── */}
      <div className="pricing-cards">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`pricing-card ${plan.popular ? 'pro' : ''}`}
          >
            {plan.popular && (
              <div className="pricing-badge">Most Popular</div>
            )}

            <div className="pricing-card-header">
              <div className="pricing-card-title">
                {plan.name}
                {plan.icon && <Zap size={18} className="bolt-icon" />}
              </div>
              <div className="pricing-card-desc">{plan.description}</div>
            </div>

            <div className="pricing-card-price">
              {plan.price ? (
                <>
                  <span className="dollar">$</span>
                  <span className="amount">
                    {billing === 'monthly'
                      ? plan.price.monthly
                      : plan.price.annual}
                  </span>
                  <span className="period">/month</span>
                </>
              ) : (
                <span className="amount custom">Custom</span>
              )}
            </div>

            <ul className="pricing-features">
              {plan.features.map((feat, i) => (
                <li key={i}>
                  <Check size={18} className="check-icon" />
                  <span
                    className={`feature-text ${feat.highlight ? 'highlight' : ''}`}
                  >
                    {feat.text}
                  </span>
                </li>
              ))}
            </ul>

            {plan.variant === 'gradient' ? (
              <button className="pricing-btn-gradient">
                {plan.cta} <ArrowRight size={14} style={{ marginLeft: 4 }} />
              </button>
            ) : (
              <button className="pricing-btn-outline">{plan.cta}</button>
            )}
          </div>
        ))}
      </div>

      {/* ── Trust Indicators ── */}
      <div className="pricing-trust">
        <p>Trusted by engineering teams at</p>
        <div className="pricing-trust-logos">
          <div className="pricing-trust-logo">Acme Corp</div>
          <div className="pricing-trust-logo">Globex</div>
          <div className="pricing-trust-logo">Soylent</div>
          <div className="pricing-trust-logo">Initech</div>
        </div>
      </div>
    </div>
  );
}
