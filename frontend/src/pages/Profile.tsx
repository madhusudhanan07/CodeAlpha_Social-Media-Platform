import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import type { UserProfile } from '../types/Profile';
import ProfileCard from '../components/ProfileCard';
import PostCard from '../components/PostCard/PostCard';
import type { PostProps } from '../components/PostCard/PostCard';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const targetUid = id || user?.uid;
  const isOwnProfile = !id || id === user?.uid;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCounter, setFollowersCounter] = useState(0);
  const [followingCounter, setFollowingCounter] = useState(0);
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !targetUid) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        
        const [profileRes, postsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/profile/${targetUid}`, { headers }),
          axios.get(`http://localhost:5000/api/profile/posts?limit=10&offset=0${id ? `&userId=${id}` : ''}`, { headers })
        ]);
        
        setProfile(profileRes.data.profile);
        setFollowingCounter(profileRes.data.profile.following);
        setFollowersCounter(profileRes.data.profile.followers);
        setIsFollowing(profileRes.data.profile.is_following_current || false); // Backend should return this if we add it, else we fetch individually. Wait, we can fetch follows/suggestions later, or assume backend modifies.
        
        // Transform posts to match PostProps
        const fetchedPosts: PostProps[] = postsRes.data.posts.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          userAvatar: p.user_avatar ? `http://localhost:5000${p.user_avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}`,
          username: p.username,
          time: new Date(p.created_at).toLocaleString(),
          content: p.content,
          image: p.image_url ? `http://localhost:5000${p.image_url}` : undefined,
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          isLikedByCurrentUser: p.is_liked_by_current_user || false
        }));

        setPosts(fetchedPosts);
        if (fetchedPosts.length < 10) setHasMore(false);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          navigate('/profile/edit');
        } else {
          setError(err.response?.data?.message || err.message || 'Failed to fetch profile data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, navigate]);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || !user || !targetUid) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const token = await auth.currentUser?.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`http://localhost:5000/api/profile/posts?limit=10&offset=${nextPage * 10}${id ? `&userId=${id}` : ''}`, { headers });
      
      const morePosts: PostProps[] = res.data.posts.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          userAvatar: p.user_avatar ? `http://localhost:5000${p.user_avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}`,
          username: p.username,
          time: new Date(p.created_at).toLocaleString(),
          content: p.content,
          image: p.image_url ? `http://localhost:5000${p.image_url}` : undefined,
          images: p.images || (p.image_url ? [p.image_url] : []),
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          isLikedByCurrentUser: p.is_liked_by_current_user || false
      }));

      if (morePosts.length < 10) {
        setHasMore(false);
      }

      setPosts(prev => [...prev, ...morePosts]);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more posts', error);
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
    
    const sentinel = document.getElementById('profile-feed-sentinel');
    if (sentinel) observer.observe(sentinel);
    
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, targetUid, user]);

  const handleDelete = useCallback((id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleUpdate = useCallback((id: number, newContent: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content: newContent } : p));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading Profile...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }} className="animate-fade-in">
      {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
      
      {profile && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
          <ProfileCard profile={{ ...profile, followers: followersCounter, following: followingCounter }} />
          
          {isOwnProfile ? (
            <button 
              onClick={() => navigate('/profile/edit')}
              style={{ padding: '0.75rem 2rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={async () => {
                  try {
                    const token = await auth.currentUser?.getIdToken();
                    const res = await axios.post(`http://localhost:5000/api/follows/${targetUid}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setIsFollowing(res.data.followed);
                    setFollowersCounter(prev => res.data.followed ? prev + 1 : Math.max(0, prev - 1));
                  } catch (e) {
                    console.error('Follow toggle error', e);
                  }
                }}
                style={{ padding: '0.75rem 2rem', backgroundColor: isFollowing ? '#fff' : '#0a66c2', color: isFollowing ? '#0a66c2' : '#fff', border: isFollowing ? '1px solid #0a66c2' : 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <button 
                onClick={() => navigate(`/messages?userId=${targetUid}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                <MessageSquare size={18} /> Message
              </button>
            </div>
          )}

          <div style={{ width: '100%', maxWidth: '600px', marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>Your Posts</h3>
            {posts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#777' }}>No posts yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            )}
            {/* Sentinel for IntersectionObserver */}
            <div id="profile-feed-sentinel" style={{ height: '20px', margin: '20px 0' }}>
              {loadingMore && <div style={{ textAlign: 'center', color: '#666' }}>Loading more...</div>}
              {!hasMore && posts.length > 0 && <div style={{ textAlign: 'center', color: '#999', marginTop: '10px' }}>You're all caught up!</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
