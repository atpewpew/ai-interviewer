import { Shield, AlertTriangle, Eye, Users, MonitorOff, Minimize2 } from 'lucide-react';

const FLAG_ICONS = {
  NO_FACE: Eye,
  MULTIPLE_FACES: Users,
  LOOKING_AWAY: Eye,
  TAB_SWITCH: MonitorOff,
  WINDOW_BLUR: Minimize2,
};

const SEVERITY_COLORS = {
  low: 'var(--warn)',
  medium: 'var(--error)',
  high: '#ff4444',
};

export default function ProctoringTimeline({ flags = [], score }) {
  if (flags.length === 0) {
    return (
      <div className="text-center py-3">
        <Shield size={32} color="var(--success)" className="mb-2" />
        <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
          Clean session — no flags detected
        </p>
        <div
          className="progress-bar-ios mx-auto"
          style={{ width: '80%', marginTop: '0.5rem' }}
        >
          <div className="fill" style={{ width: `${score}%` }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {score}/100
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="progress-bar-ios mb-3">
        <div className="fill" style={{ width: `${score}%` }} />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {flags.map((flag, i) => {
          const Icon = FLAG_ICONS[flag.type] || AlertTriangle;
          return (
            <div
              key={i}
              className="d-flex align-items-center gap-2 py-1"
              style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}
            >
              <Icon size={14} color={SEVERITY_COLORS[flag.severity]} />
              <span style={{ fontWeight: 600 }}>{flag.type.replace(/_/g, ' ')}</span>
              <span
                style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}
              >
                {new Date(flag.timestamp).toLocaleTimeString()}
              </span>
              <span
                className="chip"
                style={{
                  background:
                    flag.severity === 'high' ? 'var(--error-bg)' : flag.severity === 'medium' ? 'var(--warn-bg)' : 'rgba(251,191,36,0.06)',
                  color: SEVERITY_COLORS[flag.severity],
                  fontSize: '0.7rem',
                }}
              >
                {flag.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
