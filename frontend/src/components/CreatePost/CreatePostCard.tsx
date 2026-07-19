import { useState } from 'react';
import { Image as ImageIcon, Smile, Loader2 } from 'lucide-react';
import { createPost } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';
import styles from './CreatePostCard.module.css';
import type { PostProps } from '../PostCard/PostCard'; // Reuse interface

interface CreatePostCardProps {
  onPostCreated: (post: PostProps) => void;
}

export default function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePost = async () => {
    setError('');
    
    if (!content.trim()) {
      setError('Post cannot be empty.');
      return;
    }
    if (content.length > 500) {
      setError('Post cannot exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPost = await createPost(content);
      
      // Map API response to PostProps UI format
      const formattedPost: PostProps = {
        id: newPost.id,
        user_id: newPost.user_id,
        userAvatar: newPost.userAvatar || 'https://i.pravatar.cc/150',
        username: newPost.displayName || newPost.username || 'User',
        time: new Date(newPost.created_at).toLocaleString(),
        content: newPost.content,
        image: newPost.image_url,
        likes: newPost.likesCount || 0,
        comments: newPost.commentsCount || 0,
        isLikedByCurrentUser: newPost.isLikedByCurrentUser || false
      };

      setContent('');
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

  return (
    <div className={styles.createPostCard}>
      {error && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{error}</div>}
      
      <div className={styles.topSection}>
        <img 
          src={user?.photoURL || 'https://i.pravatar.cc/150'} 
          alt="My Avatar" 
          className={styles.avatar} 
        />
        <input 
          type="text" 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?" 
          className={styles.inputField}
          disabled={isSubmitting}
        />
      </div>
      
      <div className={styles.divider}></div>
      
      <div className={styles.bottomSection}>
        <div className={styles.actions}>
          <button className={styles.actionBtn} type="button" disabled={isSubmitting}>
            <ImageIcon className={styles.icon} color="#4fb64a" />
            <span>Photo</span>
          </button>
          <button className={styles.actionBtn} type="button" disabled={isSubmitting}>
            <Smile className={styles.icon} color="#f5c33b" />
            <span>Activity</span>
          </button>
        </div>
        
        <button 
          className={styles.postBtn} 
          onClick={handlePost} 
          disabled={isSubmitting || !content.trim()}
          style={{ opacity: isSubmitting || !content.trim() ? 0.6 : 1 }}
        >
          {isSubmitting ? (
            <Loader2 className={`${styles.icon} spin`} />
          ) : (
            'Post'
          )}
        </button>
      </div>
    </div>
  );
}
