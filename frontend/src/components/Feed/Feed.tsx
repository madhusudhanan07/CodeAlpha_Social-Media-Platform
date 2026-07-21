import { useEffect, useState, useCallback } from 'react';
import CreatePostCard from '../CreatePost/CreatePostCard';
import PostCard from '../PostCard/PostCard';
import type { PostProps } from '../PostCard/PostCard';
import { fetchPosts } from '../../services/postService';
import styles from './Feed.module.css';

export default function Feed() {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const loadInitialPosts = async () => {
      try {
        const data = await fetchPosts(10, 0);
        
        // Map backend data to frontend PostProps structure
        const mappedPosts: PostProps[] = data.map((post: any) => ({
          id: post.id,
          user_id: post.user_id,
          userAvatar: post.userAvatar ? (post.userAvatar.startsWith('http') ? post.userAvatar : `http://localhost:5000${post.userAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.displayName || post.username || 'User')}`,
          username: post.displayName || post.username || 'User',
          time: new Date(post.created_at).toLocaleString(),
          content: post.content,
          image: post.image_url,
          images: post.images || (post.image_url ? [post.image_url] : []),
          likes: post.likesCount || 0,
          comments: post.commentsCount || 0,
          isLikedByCurrentUser: post.isLikedByCurrentUser || false
        }));
        
        setPosts(mappedPosts);
        if (mappedPosts.length < 10) setHasMore(false);
      } catch (err: any) {
        if (err.message === 'Network Error') {
          setError('Server is offline or database connection failed.');
        } else {
          setError('Failed to fetch posts. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialPosts();
  }, []);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPosts(10, nextPage * 10);
      
      const mappedPosts: PostProps[] = data.map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        userAvatar: post.userAvatar ? (post.userAvatar.startsWith('http') ? post.userAvatar : `http://localhost:5000${post.userAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.displayName || post.username || 'User')}`,
        username: post.displayName || post.username || 'User',
        time: new Date(post.created_at).toLocaleString(),
        content: post.content,
        image: post.image_url,
        images: post.images || (post.image_url ? [post.image_url] : []),
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        isLikedByCurrentUser: post.isLikedByCurrentUser || false
      }));

      if (mappedPosts.length < 10) setHasMore(false);
      setPosts(prev => [...prev, ...mappedPosts]);
      setPage(nextPage);
    } catch (error) {
      console.error('Error fetching more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );
    
    const sentinel = document.getElementById('feed-sentinel');
    if (sentinel) observer.observe(sentinel);
    
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page]);

  const handlePostCreated = (newPost: PostProps) => {
    // Append the successfully created post to the top of the feed
    setPosts([newPost, ...posts]);
  };

  const handleDeletePost = useCallback((id: number) => {
    setPosts(prev => prev.filter(post => post.id !== id));
  }, []);

  const handleUpdatePost = useCallback((id: number, content: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === id) {
        return { ...post, content };
      }
      return post;
    }));
  }, []);

  return (
    <div className={`${styles.feedContainer} animate-fade-in`}>
      <CreatePostCard onPostCreated={handlePostCreated} />
      
      {error && (
        <div style={{ padding: '16px', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        // Loading Skeleton
        Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} style={{ padding: '16px', background: '#fff', borderRadius: '12px', marginBottom: '20px', height: '150px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eee' }}></div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}>
                 <div style={{ width: '100px', height: '15px', background: '#eee', borderRadius: '4px' }}></div>
                 <div style={{ width: '60px', height: '10px', background: '#eee', borderRadius: '4px' }}></div>
               </div>
            </div>
            <div style={{ width: '90%', height: '20px', background: '#eee', borderRadius: '4px' }}></div>
            <div style={{ width: '60%', height: '20px', background: '#eee', borderRadius: '4px' }}></div>
          </div>
        ))
      ) : (
        posts.length > 0 ? (
          posts.map(post => (
            <PostCard key={post.id} post={post} onDelete={handleDeletePost} onUpdate={handleUpdatePost} />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No posts yet. Be the first to share something!
          </div>
        )
      )}

      {/* Sentinel for IntersectionObserver */}
      <div id="feed-sentinel" style={{ height: '20px', margin: '20px 0' }}>
        {loadingMore && <div style={{ textAlign: 'center', color: '#666' }}>Loading more...</div>}
        {!hasMore && posts.length > 0 && <div style={{ textAlign: 'center', color: '#999', marginTop: '10px' }}>You're all caught up!</div>}
      </div>
    </div>
  );
}
