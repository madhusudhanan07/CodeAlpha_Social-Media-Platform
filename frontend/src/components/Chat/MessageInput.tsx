import { useState, useRef } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { Send, Plus, X, Upload, Image, FileText, User, LayoutGrid } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { auth } from '../../config/firebase';

interface InputProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export default function MessageInput({ onSend, onTyping }: InputProps) {
  const [content, setContent] = useState('');
  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);

  // Sub-inputs inside attachment modal
  const [activeTab, setActiveTab] = useState<'menu' | 'imageUrl' | 'shareProfile' | 'sharePost'>('menu');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [profileInput, setProfileInput] = useState('');
  const [postInput, setPostInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const closeModal = () => {
    setShowAttachmentsModal(false);
    setActiveTab('menu');
    setImageUrlInput('');
    setProfileInput('');
    setPostInput('');
  };

  // 1. Device Image Upload
  const handleDeviceImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      try {
        const formData = new FormData();
        formData.append('image', file);
        const token = await auth.currentUser?.getIdToken();

        const res = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });

        if (res.data?.url) {
          onSend(`[IMAGE] ${res.data.url}`);
        } else {
          onSend(`[IMAGE] ${dataUrl}`);
        }
      } catch (err) {
        console.warn('Upload fallback to local DataURL:', err);
        onSend(`[IMAGE] ${dataUrl}`);
      } finally {
        setIsUploading(false);
        closeModal();
      }
    };

    reader.readAsDataURL(file);
  };

  // 2. Image URL Submit
  const handleSendImageUrl = () => {
    if (imageUrlInput.trim()) {
      onSend(`[IMAGE] ${imageUrlInput.trim()}`);
      closeModal();
    }
  };

  // 3. Document File Select
  const handleDocSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSend(`📄 Document: ${file.name}`);
    closeModal();
  };

  // 4. Share Profile Submit
  const handleShareProfile = () => {
    if (profileInput.trim()) {
      const formatted = profileInput.startsWith('@') ? profileInput : `@${profileInput}`;
      onSend(`👤 Shared Profile: ${formatted.trim()}`);
      closeModal();
    }
  };

  // 5. Share Post Submit
  const handleSharePost = () => {
    if (postInput.trim()) {
      onSend(`📌 Shared Post: ${postInput.trim()}`);
      closeModal();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid #ccc', background: '#fff', gap: '0.5rem', position: 'relative' }}>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageFileInputRef}
        onChange={handleDeviceImageSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={docFileInputRef}
        onChange={handleDocSelect}
        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
        style={{ display: 'none' }}
      />

      {/* Plus (+) Button */}
      <button
        onClick={() => setShowAttachmentsModal(true)}
        title="Message Attachments"
        style={{
          background: '#eef2f7',
          color: '#0a66c2',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0a66c2'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#eef2f7'; (e.currentTarget as HTMLElement).style.color = '#0a66c2'; }}
      >
        <Plus size={22} />
      </button>

      {/* Input Field */}
      <input
        type="text"
        placeholder="Type a message..."
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', border: '1px solid #ccc', outline: 'none', background: '#f9f9f9', fontSize: '0.95rem' }}
      />

      {/* Send Button */}
      <button 
        onClick={handleSend}
        style={{ background: '#0a66c2', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
      >
        <Send size={18} />
      </button>

      {/* ================= Attachment Modal ================= */}
      {showAttachmentsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a', // Sleek dark slate
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {activeTab === 'menu' && 'Message Attachments'}
                {activeTab === 'imageUrl' && 'Enter Image URL'}
                {activeTab === 'shareProfile' && 'Share User Profile'}
                {activeTab === 'sharePost' && 'Share Post'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1e293b')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu View */}
            {activeTab === 'menu' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* 1. Image from Device */}
                <div
                  onClick={() => imageFileInputRef.current?.click()}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.25rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#273549'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e293b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <Upload size={26} color="#38bdf8" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>
                    {isUploading ? 'Uploading...' : 'Image from Device'}
                  </span>
                </div>

                {/* 2. Image URL */}
                <div
                  onClick={() => setActiveTab('imageUrl')}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.25rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#273549'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e293b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <Image size={26} color="#c084fc" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>Image URL</span>
                </div>

                {/* 3. Document (PDF/DOC) */}
                <div
                  onClick={() => docFileInputRef.current?.click()}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.25rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#273549'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e293b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <FileText size={26} color="#34d399" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>Document (PDF/DOC)</span>
                </div>

                {/* 4. Share Profile */}
                <div
                  onClick={() => setActiveTab('shareProfile')}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.25rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#273549'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e293b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <User size={26} color="#f472b6" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>Share Profile</span>
                </div>

                {/* 5. Share Post */}
                <div
                  onClick={() => setActiveTab('sharePost')}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.25rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    gridColumn: '1 / -1'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#273549'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e293b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <LayoutGrid size={26} color="#fbbf24" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>Share Post</span>
                </div>
              </div>
            )}

            {/* Image URL Sub-View */}
            {activeTab === 'imageUrl' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setActiveTab('menu')} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleSendImageUrl} style={{ padding: '0.5rem 1.25rem', background: '#38bdf8', border: 'none', color: '#0f172a', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>Send Image</button>
                </div>
              </div>
            )}

            {/* Share Profile Sub-View */}
            {activeTab === 'shareProfile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Enter username (e.g. john_doe)"
                  value={profileInput}
                  onChange={(e) => setProfileInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setActiveTab('menu')} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleShareProfile} style={{ padding: '0.5rem 1.25rem', background: '#f472b6', border: 'none', color: '#0f172a', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>Share Profile</button>
                </div>
              </div>
            )}

            {/* Share Post Sub-View */}
            {activeTab === 'sharePost' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Enter Post URL or Title..."
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setActiveTab('menu')} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleSharePost} style={{ padding: '0.5rem 1.25rem', background: '#fbbf24', border: 'none', color: '#0f172a', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>Share Post</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
