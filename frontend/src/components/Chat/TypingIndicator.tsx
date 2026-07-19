export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem 1rem', fontStyle: 'italic', color: '#888', fontSize: '0.85rem' }}>
      <span>Typing</span>
      <span style={{ animation: 'bounce 1s infinite' }}>.</span>
      <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.2s' }}>.</span>
      <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.4s' }}>.</span>
    </div>
  );
}
