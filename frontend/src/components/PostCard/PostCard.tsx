import { useState } from 'react';
import { ThumbsUp, MessageSquare, Share2, MoreVertical, Trash2, Edit2, Check, X } from 'lucide-react';
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

export default function PostCard({ post, onDelete, onUpdate }: { post: PostProps; onDelete?: (id: number) => void; onUpdate?: (id: number, content: string) => void }) {
  const { user } = useAuth();
  
  const [liked, setLiked] = useState(post.isLikedByCurrentUser);
  const [likesCount, setLikesCount] = useState(post.likes);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.comments);

  const isAuthor = user?.uid === post.user_id;

  const handleLike = async () => {
    // Optimistic UI Update
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(c => prevLiked ? c - 1 : c + 1);
    
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
      setCommentsCount(c => c + 1);
    } catch (err) {
      console.error('Failed to post comment');
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
      
      {post.image && !isEditing && (
        <img src={post.image} alt="Post content" className={styles.postImage} />
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
                 <img src={c.userAvatar || 'https://i.pravatar.cc/150'} alt={c.displayName} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
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
}
