interface BubbleProps {
  content: string;
  isOwn: boolean;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function MessageBubble({ content, isOwn, time, status }: BubbleProps) {
  const isImageUrl = (str: string) => {
    if (!str) return false;
    const trimmed = str.trim();
    return (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('[IMAGE] ') ||
      trimmed.startsWith('📷 Image:') ||
      /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(trimmed)
    );
  };

  const getImageUrl = (str: string) => {
    return str.replace('[IMAGE] ', '').replace('📷 Image: ', '').trim();
  };

  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
      <div 
        style={{ 
          maxWidth: '70%', 
          backgroundColor: isOwn ? '#0a66c2' : '#ffffff', 
          color: isOwn ? '#fff' : '#1e293b', 
          padding: '0.75rem 1rem', 
          borderRadius: '16px',
          borderBottomRightRadius: isOwn ? '4px' : '16px',
          borderBottomLeftRadius: isOwn ? '16px' : '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          position: 'relative'
        }}
      >
        {isImageUrl(content) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <img 
              src={getImageUrl(content)} 
              alt="Attachment" 
              style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '12px', objectFit: 'cover' }} 
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div style={{ fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: 1.4 }}>{content}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '6px', fontSize: '0.7rem', color: isOwn ? '#d1e6fa' : '#64748b' }}>
          <span>{time}</span>
          {isOwn && status && (
            <span>
              {status === 'sent' && '✓'}
              {status === 'delivered' && '✓✓'}
              {status === 'read' && <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>✓✓</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
