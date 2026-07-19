import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface InputProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export default function MessageInput({ onSend, onTyping }: InputProps) {
  const [content, setContent] = useState('');
  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
    onTyping(true);
    
    if (typingTimer) clearTimeout(typingTimer);
    const timer = setTimeout(() => {
      onTyping(false);
    }, 2000);
    setTypingTimer(timer);
  };

  const handleSend = () => {
    if (content.trim() === '') return;
    onSend(content.trim());
    setContent('');
    onTyping(false);
    if (typingTimer) clearTimeout(typingTimer);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderTop: '1px solid #ccc', background: '#fff' }}>
      <input
        type="text"
        placeholder="Type a message..."
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', border: '1px solid #ccc', outline: 'none', background: '#f9f9f9', fontSize: '0.95rem' }}
      />
      <button 
        onClick={handleSend}
        style={{ marginLeft: '0.75rem', background: '#0a66c2', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <Send size={18} />
      </button>
    </div>
  );
}
