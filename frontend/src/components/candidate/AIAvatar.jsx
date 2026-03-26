export default function AIAvatar() {
  return (
    <div className="d-flex align-items-center gap-3 py-3">
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-full)',
          background: 'var(--gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'var(--font-heading)',
          fontSize: '0.9rem',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}
      >
        AI
      </div>

      <div className="ai-speaking-indicator" style={{ height: 28 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bar"
            style={{ height: 8 }}
          />
        ))}
      </div>

      <span style={{ fontSize: '0.85rem', color: 'var(--primary-purple)', fontWeight: 600 }}>
        AI is speaking...
      </span>
    </div>
  );
}
