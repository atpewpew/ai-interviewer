import { Link } from 'react-router-dom';
import { User, FileText, Clock, CheckCircle } from 'lucide-react';

export default function CandidateCard({ candidate }) {
  const isCompleted = candidate.status === 'completed';

  return (
    <div className="card-ios h-100">
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-full)',
            background: isCompleted ? 'var(--gradient)' : 'var(--pale-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isCompleted ? 'white' : 'var(--primary-purple)',
          }}
        >
          <User size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{candidate.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{candidate.email}</div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        {isCompleted ? (
          <span className="chip d-flex align-items-center gap-1" style={{ background: '#e0ffe0', color: '#2e7d32' }}>
            <CheckCircle size={12} /> Completed
          </span>
        ) : (
          <span className="chip d-flex align-items-center gap-1" style={{ background: '#fff3e0', color: '#e65100' }}>
            <Clock size={12} /> Pending
          </span>
        )}
      </div>

      {isCompleted && (
        <Link
          to={`/recruiter/candidates/${candidate.id}/report`}
          className="btn-primary-ios w-100 d-flex align-items-center justify-content-center gap-1"
          style={{ fontSize: '0.85rem' }}
        >
          <FileText size={14} /> View Report
        </Link>
      )}
    </div>
  );
}
