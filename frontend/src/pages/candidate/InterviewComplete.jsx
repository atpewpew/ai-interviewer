import { CheckCircle } from 'lucide-react';

export default function InterviewComplete() {
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(135deg, #f8f8fc 0%, #EBE4FF 100%)' }}
    >
      <div className="card-ios text-center" style={{ maxWidth: 500, padding: '3rem' }}>
        <div
          className="mx-auto mb-3"
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-full)',
            background: '#e0ffe0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={32} color="#2e7d32" />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2.2rem',
            color: 'var(--graphite-black)',
            marginBottom: '0.5rem',
          }}
        >
          INTERVIEW COMPLETE
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Thank you for completing the interview. Your responses have been recorded
          and a detailed report is being generated for the recruiter.
        </p>

        <p style={{ color: 'var(--primary-purple)', fontWeight: 600, fontSize: '0.9rem', marginTop: '1.5rem' }}>
          You may now close this tab.
        </p>
      </div>
    </div>
  );
}
