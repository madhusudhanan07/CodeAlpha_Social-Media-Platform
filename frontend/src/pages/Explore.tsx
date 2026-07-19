import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, UserPlus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard/PostCard';
import type { PostProps } from '../components/PostCard/PostCard';

interface UserPreview {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  isFollowing?: boolean;
}

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<UserPreview[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Trending Posts State
  const [trendingPosts, setTrendingPosts] = useState<PostProps[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState('');

  // Pagination for posts
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  const getToken = useCallback(async () => {
    return await user?.getIdToken();
  }, [user]);

  // Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await axios.get('http://localhost:5000/api/users/suggestions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const mapped: UserPreview[] = res.data.suggestions.map((u: any) => ({
          id: u.firebase_uid,
          username: u.username,
          displayName: u.full_name,
          avatar: u.profile_picture ? `http://localhost:5000${u.profile_picture}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`,
          bio: u.bio,
          isFollowing: false
        }));
        setSuggestions(mapped);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [getToken]);

  // Initial Fetch Trending Posts
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await axios.get('http://localhost:5000/api/explore/posts?limit=10&offset=0', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const mappedPosts = res.data.posts.map(mapBackendPostToFrontend);
        setTrendingPosts(mappedPosts);
        if (mappedPosts.length < 10) setHasMorePosts(false);
      } catch (err) {
        setPostsError('Failed to load trending posts.');
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchTrending();
  }, [getToken]);

  // Handle Search input with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = await getToken();
        const res = await axios.get(`http://localhost:5000/api/users/search?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const results = res.data.users.map((u: any) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar ? `http://localhost:5000${u.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`,
          bio: u.bio,
          isFollowing: !!u.isFollowing
        }));
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, getToken]);

  const mapBackendPostToFrontend = (p: any): PostProps => ({
    id: p.id,
    user_id: p.user_id,
    userAvatar: p.userAvatar ? (p.userAvatar.startsWith('http') ? p.userAvatar : `http://localhost:5000${p.userAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}`,
    username: p.displayName || p.username,
    time: new Date(p.created_at).toLocaleString(),
    content: p.content,
    image: p.image_url,
    images: p.images || (p.image_url ? [p.image_url] : []),
    likes: p.likesCount || 0,
    comments: p.commentsCount || 0,
    isLikedByCurrentUser: p.isLikedByCurrentUser || false
  });

  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const nextPage = page + 1;
      const token = await getToken();
      const res = await axios.get(`http://localhost:5000/api/explore/posts?limit=10&offset=${nextPage * 10}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const morePosts = res.data.posts.map(mapBackendPostToFrontend);
      
      if (morePosts.length < 10) setHasMorePosts(false);
      setTrendingPosts(prev => [...prev, ...morePosts]);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingPosts && !loadingMorePosts && hasMorePosts) {
        loadMorePosts();
      }
    }, { threshold: 0.1 });
    
    const node = document.getElementById('explore-sentinel');
    if (node) observer.observe(node);
    
    return () => observer.disconnect();
  }, [hasMorePosts, loadingMorePosts, loadingPosts, page, getToken]);

  const toggleFollow = async (userId: string, isCurrentlyFollowing: boolean, listType: 'search' | 'suggestions') => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isCurrentlyFollowing) {
        await axios.delete(`http://localhost:5000/api/follow/${userId}`, { headers });
      } else {
        await axios.post(`http://localhost:5000/api/follow/${userId}`, {}, { headers });
      }
      
      const updateList = (list: UserPreview[]) => list.map(u => u.id === userId ? { ...u, isFollowing: !isCurrentlyFollowing } : u);
      
      if (listType === 'search') {
        setSearchResults(updateList);
      } else {
        setSuggestions(updateList);
      }
      
    } catch (error) {
      console.error('Error toggling follow', error);
    }
  };

  const UserCard = ({ u, listType }: { u: UserPreview, listType: 'search' | 'suggestions' }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '10px', transition: 'box-shadow 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/profile/${u.id}`)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
        <img src={u.avatar} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.displayName}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{u.username}</span>
          {u.bio && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{u.bio}</span>}
        </div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); toggleFollow(u.id, !!u.isFollowing, listType); }}
        style={{
          background: u.isFollowing ? 'transparent' : 'var(--primary-color)',
          color: u.isFollowing ? 'var(--text-primary)' : '#fff',
          border: u.isFollowing ? '1px solid var(--border-color)' : 'none',
          padding: '6px 16px',
          borderRadius: '20px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        {u.isFollowing ? <><Check size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
      </button>
    </div>
  );

  const handleDeletePost = useCallback((id: number) => {
    setTrendingPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleUpdatePost = useCallback((id: number, newContent: string) => {
    setTrendingPosts(prev => prev.map(p => p.id === id ? { ...p, content: newContent } : p));
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }} className="animate-fade-in">
      <h1 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search /> Explore
      </h1>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', padding: '0.75rem 1rem', borderRadius: '24px' }}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', marginLeft: '10px', fontSize: '1rem', color: 'var(--text-primary)' }}
          />
        </div>

        {searchQuery.trim() && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Search Results</h3>
            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => <UserCard key={u.id} u={u} listType="search" />)
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No users found for "{searchQuery}"</div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Suggested Users */}
        {!searchQuery.trim() && (
          <section>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Suggested Users</h3>
            {loadingSuggestions ? (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ minWidth: '250px', height: '80px', background: 'var(--card-bg)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--input-bg)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: '12px', width: '60%', background: 'var(--input-bg)', marginBottom: '8px', borderRadius: '4px' }} />
                      <div style={{ height: '10px', width: '40%', background: 'var(--input-bg)', borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                {suggestions.map(u => <UserCard key={u.id} u={u} listType="suggestions" />)}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No fresh suggestions right now.</p>
            )}
          </section>
        )}

        {/* Trending Posts */}
        <section>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Trending Posts</h3>
          
          {postsError && <div style={{ color: 'red', background: '#ffebee', padding: '1rem', borderRadius: '8px' }}>{postsError}</div>}
          
          {loadingPosts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ height: '200px', background: 'var(--card-bg)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--input-bg)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', width: '100%' }}>
                      <div style={{ height: '14px', width: '120px', background: 'var(--input-bg)', borderRadius: '4px' }} />
                      <div style={{ height: '10px', width: '80px', background: 'var(--input-bg)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ height: '14px', width: '90%', background: 'var(--input-bg)', marginBottom: '8px', borderRadius: '4px' }} />
                  <div style={{ height: '14px', width: '70%', background: 'var(--input-bg)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          ) : trendingPosts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {trendingPosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onDelete={handleDeletePost} 
                  onUpdate={handleUpdatePost} 
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No trending posts right now. Let's create some interactions!
            </div>
          )}

          <div id="explore-sentinel" style={{ height: '20px', marginTop: '20px', textAlign: 'center' }}>
            {loadingMorePosts && <span style={{ color: 'var(--text-secondary)' }}>Loading more trends...</span>}
            {!hasMorePosts && trendingPosts.length > 0 && <span style={{ color: 'var(--text-secondary)' }}>End of trends.</span>}
          </div>
        </section>

      </div>
    </div>
  );
}
