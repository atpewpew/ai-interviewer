export default function QuestionDisplay({ question }) {
  if (!question) return null;

  return (
    <div
      className="p-3 rounded"
      style={{
        background: 'var(--pale-purple)',
        borderLeft: '4px solid var(--primary-purple)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.3rem',
          color: 'var(--graphite-black)',
          margin: 0,
          lineHeight: 1.3,
          letterSpacing: '0.5px',
        }}
      >
        {question}
      </p>
    </div>
  );
}
