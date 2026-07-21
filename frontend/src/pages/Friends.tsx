import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Search, UserPlus, Check, X, UserMinus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Friends.module.css';

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  mutualFriends?: number;
  lastActive?: string;
  requestId?: number;
}

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [suggestions, setSuggestions] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async () => {
    return await user?.getIdToken();
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [reqs, fr, suggs] = await Promise.all([
        axios.get('http://localhost:5000/api/friends/requests', { headers }),
        axios.get('http://localhost:5000/api/friends/list', { headers }),
        axios.get('http://localhost:5000/api/friends/suggestions', { headers })
      ]);

      const mapUser = (u: any) => ({
        id: u.senderId || u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar ? (u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000${u.avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`,
        mutualFriends: u.mutualFriends || 0,
        requestId: u.requestId,
        lastActive: u.lastActive
      });

      setRequests(reqs.data.requests.map(mapUser));
      setFriends(fr.data.friends.map(mapUser));
      setSuggestions(suggs.data.suggestions.map(mapUser));
    } catch (error) {
      toast.error('Failed to load friends network.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`http://localhost:5000/api/friends/search?q=${searchQuery}`, { headers });
        setSearchResults(res.data.friends.map((u: any) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar ? (u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000${u.avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`
        })));
      } catch (error) {
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, getToken]);

  const sendRequest = async (userId: string) => {
    try {
      const token = await getToken();
      await axios.post(`http://localhost:5000/api/friends/request/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Friend request sent!');
      setSuggestions(prev => prev.filter(s => s.id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const acceptRequest = async (requestId: number) => {
    try {
      const token = await getToken();
      await axios.put(`http://localhost:5000/api/friends/accept/${requestId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Friend accepted!');
      fetchData(); // reload
    } catch (err) {
      toast.error('Failed to accept request.');
    }
  };

  const rejectRequest = async (requestId: number) => {
    try {
      const token = await getToken();
      await axios.delete(`http://localhost:5000/api/friends/reject/${requestId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Request rejected.');
      setRequests(prev => prev.filter(r => r.requestId !== requestId));
    } catch (err) {
      toast.error('Failed to reject request.');
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      const token = await getToken();
      await axios.delete(`http://localhost:5000/api/friends/remove/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Friend removed.');
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) {
      toast.error('Failed to remove friend.');
    }
  };

  const UserCard = ({ u, type }: { u: Friend, type: 'request' | 'friend' | 'suggestion' | 'search' }) => (
    <div className={styles.card} onClick={() => navigate(`/profile/${u.id}`)}>
      <img src={u.avatar} alt={u.displayName} className={styles.avatar} />
      <div className={styles.name}>{u.displayName}</div>
      
      <div className={styles.subtext}>
        {type === 'friend' && u.mutualFriends !== undefined && <div>{u.mutualFriends} Mutual Friends</div>}
        {type === 'suggestion' && <div>Suggested for you</div>}
        {type === 'request' && <div>Wants to be friends</div>}
      </div>

      <div className={styles.actions} onClick={e => e.stopPropagation()}>
        {type === 'request' && u.requestId && (
          <>
            <button className={styles.btnPrimary} onClick={() => acceptRequest(u.requestId!)}>
              <Check size={16} /> Accept
            </button>
            <button className={styles.btnSecondary} onClick={() => rejectRequest(u.requestId!)}>
              <X size={16} /> Reject
            </button>
            <button className={styles.btnPrimary} style={{ background: 'var(--primary-color)', marginLeft: '0.5rem' }} onClick={() => navigate(`/messages?userId=${u.id}`)}>
              <MessageSquare size={16} /> Message
            </button>
          </>
        )}
        
        {type === 'friend' && (
          <>
            <button className={styles.btnPrimary} onClick={() => navigate(`/chat?userId=${u.id}`)}>
              <MessageSquare size={16} /> Message
            </button>
            <button className={styles.btnSecondary} onClick={() => removeFriend(u.id)}>
              <UserMinus size={16} /> Remove
            </button>
          </>
        )}

        {type === 'suggestion' && (
          <button className={styles.btnPrimary} onClick={() => sendRequest(u.id)}>
            <UserPlus size={16} /> Add Friend
          </button>
        )}
        
        {type === 'search' && (
          <button className={styles.btnSecondary} onClick={() => navigate(`/profile/${u.id}`)}>
            View Profile
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Users size={32} color="var(--primary-color)" /> 
          <strong>Friends</strong>
        </div>
        <div className={styles.searchBar}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search friends..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {searchQuery.trim() ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Search Results</div>
          {isSearching ? (
            <p style={{ color: 'var(--text-secondary)' }}>Searching...</p>
          ) : searchResults.length > 0 ? (
            <div className={styles.grid}>
              {searchResults.map(u => <UserCard key={u.id} u={u} type="search" />)}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No friends found matching "{searchQuery}".</p>
          )}
        </div>
      ) : (
        <>
          {/* Friend Requests */}
          {requests.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                Friend Requests <span className={styles.badge}>{requests.length}</span>
              </div>
              <div className={styles.grid}>
                {requests.map(r => <UserCard key={r.id} u={r} type="request" />)}
              </div>
            </div>
          )}

          {/* My Friends */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>My Friends</div>
            {loading ? (
              <div className={styles.grid}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ height: '250px', background: 'var(--card-bg)', borderRadius: '12px' }} className="animate-pulse" />
                ))}
              </div>
            ) : friends.length > 0 ? (
              <div className={styles.grid}>
                {friends.map(f => <UserCard key={f.id} u={f} type="friend" />)}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                <h3>No friends yet</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Start adding friends from the suggestions below!</p>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Suggested Friends</div>
            {loading ? (
              <div className={styles.grid}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: '250px', background: 'var(--card-bg)', borderRadius: '12px' }} className="animate-pulse" />
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className={styles.grid}>
                {suggestions.map(s => <UserCard key={s.id} u={s} type="suggestion" />)}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No suggestions available at the moment.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
