interface BubbleProps {
  content: string;
  isOwn: boolean;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function MessageBubble({ content, isOwn, time, status }: BubbleProps) {
  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
      <div 
        style={{ 
          maxWidth: '70%', 
          backgroundColor: isOwn ? '#0a66c2' : '#f0f2f5', 
          color: isOwn ? '#fff' : '#333', 
          padding: '0.75rem 1rem', 
          borderRadius: '16px',
          borderBottomRightRadius: isOwn ? '4px' : '16px',
          borderBottomLeftRadius: isOwn ? '16px' : '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          position: 'relative'
        }}
      >
        <div style={{ fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: 1.4 }}>{content}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', fontSize: '0.7rem', color: isOwn ? '#d1e6fa' : '#888' }}>
          <span>{time}</span>
          {isOwn && status && (
            <span>
              {status === 'sent' && '✓'}
              {status === 'delivered' && '✓✓'}
              {status === 'read' && <span style={{ color: '#00f' }}>✓✓</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
