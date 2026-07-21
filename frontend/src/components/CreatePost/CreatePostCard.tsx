import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Smile, Loader2, X } from 'lucide-react';
import { createPost } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages } from '../../services/uploadService';
import styles from './CreatePostCard.module.css';
import type { PostProps } from '../PostCard/PostCard';

interface CreatePostCardProps {
  onPostCreated: (post: PostProps) => void;
}

// ── Activity / Feeling picker data ────────────────────────────────────────
const ACTIVITIES = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😍', label: 'In Love' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '🥳', label: 'Celebrating' },
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '😇', label: 'Grateful' },
  { emoji: '🤩', label: 'Excited' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😶', label: 'Speechless' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '🥺', label: 'Emotional' },
  { emoji: '💪', label: 'Motivated' },
  { emoji: '🙏', label: 'Thankful' },
  { emoji: '🎉', label: 'Excited' },
  { emoji: '😌', label: 'Peaceful' },
];

export default function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Activity picker state
  const [showPicker, setShowPicker] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<{ emoji: string; label: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleSelectActivity = (act: { emoji: string; label: string }) => {
    setSelectedActivity(act);
    setShowPicker(false);
  };

  const clearActivity = () => setSelectedActivity(null);

  const handlePost = async () => {
    setError('');
    if (!content.trim() && images.length === 0) {
      setError('Post cannot be empty.');
      return;
    }
    if (content.length > 500) {
      setError('Post cannot exceed 500 characters.');
      return;
    }

    // Append feeling tag to content
    const finalContent = selectedActivity
      ? `${content.trim()} — feeling ${selectedActivity.emoji} ${selectedActivity.label}`
      : content;

    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        uploadedUrls = await uploadMultipleImages(images);
      }

      const newPost = await createPost(finalContent, '', uploadedUrls);

      const formattedPost: PostProps = {
        id: newPost.id,
        user_id: newPost.user_id,
        userAvatar: newPost.userAvatar ? (newPost.userAvatar.startsWith('http') ? newPost.userAvatar : `http://localhost:5000${newPost.userAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(newPost.displayName || newPost.username || 'User')}`,
        username: newPost.displayName || newPost.username || 'User',
        time: new Date(newPost.created_at).toLocaleString(),
        content: newPost.content,
        image: newPost.image_url,
        images: newPost.images || (newPost.image_url ? [newPost.image_url] : []),
        likes: newPost.likesCount || 0,
        comments: newPost.commentsCount || 0,
        isLikedByCurrentUser: newPost.isLikedByCurrentUser || false,
      };

      setContent('');
      setImages([]);
      setImagePreviews([]);
      setSelectedActivity(null);
      onPostCreated(formattedPost);
    } catch (err: any) {
      if (err.message === 'Network Error') {
        setError('Server is offline or unreachable.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create post.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter(
        file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
      );
      if (validFiles.length !== filesArray.length) {
        setError('Some files were rejected. Only images under 5MB are allowed.');
      }
      setImages(prev => [...prev, ...validFiles].slice(0, 10));
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.createPostCard}>
      {error && (
        <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{error}</div>
      )}

      <div className={styles.topSection}>
        <img
          src={user?.photoURL || 'https://i.pravatar.cc/150'}
          alt="My Avatar"
          className={styles.avatar}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={selectedActivity
              ? `What's on your mind? (feeling ${selectedActivity.emoji} ${selectedActivity.label})`
              : "What's on your mind?"}
            className={styles.inputField}
            disabled={isSubmitting}
          />
          {/* Selected Activity Tag */}
          {selectedActivity && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(245,195,59,0.15)', border: '1px solid rgba(245,195,59,0.4)',
              borderRadius: '20px', padding: '3px 10px', fontSize: '0.85rem',
              color: 'var(--text-primary)', alignSelf: 'flex-start'
            }}>
              <span>{selectedActivity.emoji}</span>
              <span>feeling {selectedActivity.label}</span>
              <button
                onClick={clearActivity}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0, marginLeft: '2px' }}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', margin: '12px 0' }}>
          {imagePreviews.map((src, index) => (
            <div key={index} style={{ position: 'relative', paddingTop: '100%' }}>
              <img
                src={src}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                alt={`preview ${index}`}
              />
              <button
                onClick={() => removeImage(index)}
                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.divider}></div>

      <div className={styles.bottomSection}>
        <div className={styles.actions}>
          {/* Photo Button */}
          <label className={styles.actionBtn} style={{ cursor: 'pointer' }}>
            <input type="file" multiple accept="image/*" style={{ display: 'none' }} disabled={isSubmitting} onChange={handleImageChange} />
            <ImageIcon className={styles.icon} color="#4fb64a" />
            <span>Photo</span>
          </label>

          {/* Activity Button + Picker */}
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              className={styles.actionBtn}
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowPicker(v => !v)}
              style={{ color: selectedActivity ? '#f5c33b' : undefined }}
            >
              <Smile className={styles.icon} color={selectedActivity ? '#f5c33b' : '#f5c33b'} />
              <span>{selectedActivity ? `${selectedActivity.emoji} ${selectedActivity.label}` : 'Activity'}</span>
            </button>

            {/* Emoji Picker Dropdown */}
            {showPicker && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                padding: '12px', width: '260px', zIndex: 999,
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px',
                animation: 'fadeUp 0.18s ease-out'
              }}>
                <div style={{ gridColumn: '1/-1', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  😊 How are you feeling?
                </div>
                {ACTIVITIES.map(act => (
                  <button
                    key={act.label}
                    onClick={() => handleSelectActivity(act)}
                    title={act.label}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                      padding: '8px 4px', borderRadius: '10px', border: 'none',
                      background: selectedActivity?.label === act.label ? 'rgba(245,195,59,0.18)' : 'transparent',
                      cursor: 'pointer', fontSize: '1.4rem', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,195,59,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = selectedActivity?.label === act.label ? 'rgba(245,195,59,0.18)' : 'transparent')}
                  >
                    <span>{act.emoji}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{act.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className={styles.postBtn}
          onClick={handlePost}
          disabled={isSubmitting || (!content.trim() && images.length === 0)}
          style={{ opacity: isSubmitting || (!content.trim() && images.length === 0) ? 0.6 : 1 }}
        >
          {isSubmitting ? <Loader2 className={`${styles.icon} spin`} /> : 'Post'}
        </button>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
