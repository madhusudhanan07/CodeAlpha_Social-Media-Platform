import React, { useState, memo } from 'react';
import toast from 'react-hot-toast';
import { ThumbsUp, MessageSquare, Share2, MoreVertical, Trash2, Edit2, Check, X, Bookmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toggleLike, deletePost, updatePost, fetchComments, createComment } from '../../services/postService';
import styles from './PostCard.module.css';

export interface PostProps {
  id: number;
  user_id: string;
  userAvatar: string;
  username: string;
  time: string;
  content: string;
  image?: string;
  images?: string[];
  likes: number;
  comments: number;
  isLikedByCurrentUser: boolean;
}

interface CommentProps {
  id: number;
  userAvatar: string;
  displayName: string;
  content: string;
  created_at: string;
}

const PostCard = memo(({ post, onDelete, onUpdate, overrideSavedRemoval }: { post: PostProps; onDelete?: (id: number) => void; onUpdate?: (id: number, content: string) => void; overrideSavedRemoval?: (id: number) => void; }) => {
  const { user, savedPostIds, toggleSavedPost } = useAuth();
  
  const [liked, setLiked] = useState(post.isLikedByCurrentUser);
  const [likesCount, setLikesCount] = useState(post.likes);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.comments);

  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  const isAuthor = user?.uid === post.user_id;
  const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);

  const handleLike = async () => {
    // Optimistic UI Update
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount((c: number) => prevLiked ? c - 1 : c + 1);
    
    try {
      const serverLiked = await toggleLike(post.id);
      setLiked(serverLiked);
    } catch {
      // Revert on error
      setLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditing(false);
      return;
    }
    try {
      await updatePost(post.id, editContent);
      onUpdate?.(post.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
    } catch (error) {
      console.error('Failed to delete post');
    }
  };

  const loadComments = async () => {
    if (!showComments) {
      try {
        const data = await fetchComments(post.id);
        setComments(data);
      } catch (err) {
        console.error(err);
      }
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const created = await createComment(post.id, newComment);
      setComments([...comments, created]);
      setNewComment('');
      setCommentsCount((c: number) => c + 1);
    } catch (err) {
      console.error('Failed to post comment');
    }
  };

  const isSaved = savedPostIds?.has(post.id) || false;

  const handleSaveToggle = async () => {
    try {
      if (overrideSavedRemoval && isSaved) {
        // If we are on Saved page, we optimistically remove it visually immediately
        overrideSavedRemoval(post.id);
        await toggleSavedPost(post.id);
        toast.success('Removed from saved');
        return;
      }
      
      const newlySaved = await toggleSavedPost(post.id);
      if (newlySaved) {
        toast.success('Post saved');
      } else {
        toast.success('Removed from saved');
      }
    } catch {
      toast.error('Could not update save status');
    }
  };

  return (
    <div className={styles.postCard}>
      <div className={styles.header}>
        <img src={post.userAvatar} alt={post.username} className={styles.avatar} />
        <div className={styles.userInfo}>
          <span className={styles.username}>{post.username}</span>
          <span className={styles.time}>{post.time}</span>
        </div>
        
        {isAuthor && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button className={styles.dropdownBtn} onClick={() => setShowDropdown(!showDropdown)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <MoreVertical size={20} />
            </button>
            {showDropdown && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #ddd', borderRadius: '8px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <button onClick={() => { setIsEditing(true); setShowDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={() => { handleDelete(); setShowDropdown(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'red' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div style={{ margin: '15px 0' }}>
           <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit' }} />
           <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
             <button onClick={handleSaveEdit} style={{ background: '#0a66c2', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={16} /> Save</button>
             <button onClick={() => setIsEditing(false)} style={{ background: '#eee', color: '#333', padding: '6px 12px', border: 'none', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={16} /> Cancel</button>
           </div>
        </div>
      ) : (
        <p className={styles.content}>{post.content}</p>
      )}
      
      {!isEditing && postImages.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: postImages.length === 1 ? '1fr' : postImages.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px',
          marginTop: '12px',
          marginBottom: '12px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {postImages.slice(0, 4).map((imgUrl, index) => (
            <div 
              key={index} 
              style={{ position: 'relative', cursor: 'pointer', height: postImages.length === 1 ? 'auto' : '200px' }}
              onClick={() => setActiveImageIndex(index)}
            >
              <img 
                src={imgUrl.startsWith('http') ? imgUrl : `http://localhost:5000${imgUrl}`}
                alt={`Post content ${index}`} 
                style={{ width: '100%', height: '100%', objectFit: postImages.length === 1 ? 'contain' : 'cover', maxHeight: postImages.length === 1 ? '500px' : 'none' }}
              />
              {index === 3 && postImages.length > 4 && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                  +{postImages.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full Screen Image Viewer Modal */}
      {activeImageIndex !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button 
            onClick={() => setActiveImageIndex(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', zIndex: 10000 }}
          >
            <X size={32} />
          </button>
          
          {postImages.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + postImages.length) % postImages.length); }}
              style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}
            >
              &#10094;
            </button>
          )}

          <img 
            src={postImages[activeImageIndex].startsWith('http') ? postImages[activeImageIndex] : `http://localhost:5000${postImages[activeImageIndex]}`}
            alt="Fullscreen viewer"
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />

          {postImages.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % postImages.length); }}
              style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}
            >
              &#10095;
            </button>
          )}
        </div>
      )}
      
      <div className={styles.stats}>
        <span>{likesCount} Likes</span>
        <span>{commentsCount} Comments</span>
      </div>
      
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={handleLike} style={{ color: liked ? '#0a66c2' : 'inherit' }}>
          <ThumbsUp className={styles.icon} fill={liked ? '#0a66c2' : 'none'} color={liked ? '#0a66c2' : 'currentColor'} />
          Like
        </button>
        <button className={styles.actionBtn} onClick={loadComments}>
          <MessageSquare className={styles.icon} />
          Comment
        </button>
        <button className={styles.actionBtn} onClick={handleSaveToggle} style={{ color: isSaved ? '#0a66c2' : 'inherit' }}>
          <Bookmark className={styles.icon} fill={isSaved ? '#0a66c2' : 'none'} color={isSaved ? '#0a66c2' : 'currentColor'} />
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button className={styles.actionBtn}>
          <Share2 className={styles.icon} />
          Share
        </button>
      </div>

      {showComments && (
         <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
           <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
             <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #ddd' }} />
             <button type="submit" disabled={!newComment.trim()} style={{ background: '#0a66c2', color: 'white', padding: '0 20px', borderRadius: '20px', border: 'none', cursor: newComment.trim() ? 'pointer' : 'not-allowed', opacity: newComment.trim() ? 1 : 0.5 }}>Post</button>
           </form>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
             {comments.map(c => (
               <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                 <img src={c.userAvatar ? (c.userAvatar.startsWith('http') ? c.userAvatar : `http://localhost:5000${c.userAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName || 'User')}`} alt={c.displayName} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                 <div style={{ background: '#f2f2f2', padding: '10px 15px', borderRadius: '12px', flex: 1 }}>
                   <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{c.displayName}</div>
                   <div style={{ fontSize: '14px', color: '#333' }}>{c.content}</div>
                 </div>
               </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
});

export default PostCard;
