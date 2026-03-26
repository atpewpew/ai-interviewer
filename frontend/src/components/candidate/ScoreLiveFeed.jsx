export default function ScoreLiveFeed({ scores }) {
  if (!scores || scores.length === 0) return null;

  const latest = scores[scores.length - 1];

  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
        LAST RESPONSE SCORES
      </div>
      <div className="d-flex gap-2 score-entry">
        <ScoreBar label="Technical" value={latest.technical} max={10} />
        <ScoreBar label="Communication" value={latest.communication} max={10} />
        <ScoreBar label="Depth" value={latest.depth} max={10} />
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max }) {
  const pct = (value / max) * 100;
  const color = pct >= 70 ? '#2e7d32' : pct >= 50 ? '#e65100' : '#c62828';

  return (
    <div style={{ flex: 1 }}>
      <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem', marginBottom: 2 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--light-gray)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            background: color,
            width: `${pct}%`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}
