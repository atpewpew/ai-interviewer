export default function TranscriptPanel({ transcript, interimTranscript }) {
  const hasContent = transcript || interimTranscript;

  if (!hasContent) {
    return (
      <div
        className="p-3 rounded text-center"
        style={{ background: 'var(--bg-elevated)', minHeight: 80 }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Your response will appear here...
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded"
      style={{
        background: 'var(--bg-elevated)',
        minHeight: 80,
        maxHeight: 200,
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
        YOUR RESPONSE
      </div>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: 0, color: 'var(--text-primary)' }}>
        {transcript}
        {interimTranscript && (
          <span style={{ color: 'var(--lavender)' }}> {interimTranscript}</span>
        )}
      </p>
    </div>
  );
}
