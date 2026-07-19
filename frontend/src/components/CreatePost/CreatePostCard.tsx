import { useState } from 'react';
import { Image as ImageIcon, Smile, Loader2 } from 'lucide-react';
import { createPost } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages } from '../../services/uploadService';
import styles from './CreatePostCard.module.css';
import type { PostProps } from '../PostCard/PostCard'; // Reuse interface

interface CreatePostCardProps {
  onPostCreated: (post: PostProps) => void;
}

export default function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        uploadedUrls = await uploadMultipleImages(images);
      }

      const newPost = await createPost(content, '', uploadedUrls);
      
      // Map API response to PostProps UI format
      const formattedPost: PostProps = {
        id: newPost.id,
        user_id: newPost.user_id,
        userAvatar: newPost.userAvatar || 'https://i.pravatar.cc/150',
        username: newPost.displayName || newPost.username || 'User',
        time: new Date(newPost.created_at).toLocaleString(),
        content: newPost.content,
        image: newPost.image_url,
        images: newPost.images || (newPost.image_url ? [newPost.image_url] : []),
        likes: newPost.likesCount || 0,
        comments: newPost.commentsCount || 0,
        isLikedByCurrentUser: newPost.isLikedByCurrentUser || false
      };

      setContent('');
      setImages([]);
      setImagePreviews([]);
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
      const validFiles = filesArray.filter(file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024);
      
      if (validFiles.length !== filesArray.length) {
        setError('Some files were rejected. Only images under 5MB are allowed.');
      }

      setImages(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 images
      
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

      {imagePreviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', margin: '12px 0' }}>
          {imagePreviews.map((src, index) => (
            <div key={index} style={{ position: 'relative', paddingTop: '100%' }}>
              <img src={src} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} alt={`preview ${index}`} />
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
          <label className={styles.actionBtn} style={{ cursor: 'pointer' }}>
            <input type="file" multiple accept="image/*" style={{ display: 'none' }} disabled={isSubmitting} onChange={handleImageChange} />
            <ImageIcon className={styles.icon} color="#4fb64a" />
            <span>Photo</span>
          </label>
          <button className={styles.actionBtn} type="button" disabled={isSubmitting}>
            <Smile className={styles.icon} color="#f5c33b" />
            <span>Activity</span>
          </button>
        </div>
        
        <button 
          className={styles.postBtn} 
          onClick={handlePost} 
          disabled={isSubmitting || (!content.trim() && images.length === 0)}
          style={{ opacity: isSubmitting || (!content.trim() && images.length === 0) ? 0.6 : 1 }}
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
