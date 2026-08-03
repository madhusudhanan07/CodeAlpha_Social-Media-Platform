import { useState } from 'react';
import { BASE_URL } from '../../config/api';
import { X, ExternalLink } from 'lucide-react';

interface BubbleProps {
  content: string;
  isOwn: boolean;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function MessageBubble({ content, isOwn, time, status }: BubbleProps) {
  const [showLightbox, setShowLightbox] = useState(false);

  const isImageUrl = (str: string) => {
    if (!str) return false;
    const trimmed = str.trim();
    return (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('[IMAGE] ') ||
      trimmed.startsWith('📷 Image:') ||
      trimmed.startsWith('/uploads/') ||
      /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(trimmed)
    );
  };

  const getFormattedImageUrl = (str: string) => {
    let clean = str.replace('[IMAGE] ', '').replace('📷 Image: ', '').trim();
    if (clean.startsWith('/uploads/')) {
      clean = `${BASE_URL}${clean}`;
    }
    return clean;
  };

  const imageUrl = isImageUrl(content) ? getFormattedImageUrl(content) : '';

  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
      <div 
        style={{ 
          maxWidth: '75%', 
          backgroundColor: isOwn ? '#0a66c2' : '#ffffff', 
          color: isOwn ? '#fff' : '#1e293b', 
          padding: isImageUrl(content) ? '0.5rem' : '0.75rem 1rem', 
          borderRadius: '16px',
          borderBottomRightRadius: isOwn ? '4px' : '16px',
          borderBottomLeftRadius: isOwn ? '16px' : '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          position: 'relative'
        }}
      >
        {isImageUrl(content) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <img 
              src={imageUrl} 
              alt="Attachment" 
              onClick={() => setShowLightbox(true)}
              title="Click to view full image"
              style={{
                maxWidth: '100%',
                maxHeight: '320px',
                borderRadius: '12px',
                objectFit: 'cover',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }} 
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div style={{ fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: 1.4 }}>{content}</div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '4px',
          marginTop: isImageUrl(content) ? '2px' : '6px',
          paddingRight: isImageUrl(content) ? '0.25rem' : 0,
          fontSize: '0.7rem',
          color: isOwn ? '#d1e6fa' : '#64748b'
        }}>
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

      {/* ================= Fullscreen Image Lightbox Modal ================= */}
      {showLightbox && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '2rem'
        }}>
          {/* Top Bar Action Buttons */}
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '1rem', zIndex: 1000000 }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full resolution in new tab"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={20} />
            </a>
            <button
              onClick={() => setShowLightbox(false)}
              title="Close viewer"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={22} />
            </button>
          </div>

          {/* Image Display */}
          <img
            src={imageUrl}
            alt="Full resolution attachment"
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              borderRadius: '12px',
              objectFit: 'contain',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
            }}
          />
        </div>
      )}
    </div>
  );
}
