export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div
        className="spinner-border"
        role="status"
        style={{ color: 'var(--primary-purple)', width: '3rem', height: '3rem' }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
        {text}
      </p>
    </div>
  );
}
