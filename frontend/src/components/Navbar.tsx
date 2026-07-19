
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { auth } from '../config/firebase';
import { Bell, Search, MessageSquare, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() { 
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dbAvatar, setDbAvatar] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAvatar = async () => {
      if (!user) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`http://localhost:5000/api/profile/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted && res.data?.profile?.profile_picture) {
          setDbAvatar(`http://localhost:5000${res.data.profile.profile_picture}`);
        }
      } catch (err) {
        // silently ignore error for avatar fetch
      }
    };
    fetchAvatar();
    return () => { isMounted = false; };
  }, [user]);

  // Search Logic
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`http://localhost:5000/api/search/users?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(res.data.users);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  // Notifications Logic
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`http://localhost:5000/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.notifications.filter((n: any) => !n.is_read).length);
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.put(`http://localhost:5000/api/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const navigate = useNavigate();

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--nav-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#0a66c2', fontWeight: 700, fontSize: '1.25rem' }}>Social App</Link>
        
        {user && (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#eef3f8', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              <Search size={18} color="#666" />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0.25rem 0.5rem', width: '200px' }}
              />
            </div>
            {showSearchDropdown && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.5rem', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {searchResults.map(u => (
                  <div key={u.id} onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); navigate(`/profile/${u.id}`); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                    <img src={u.avatar ? `http://localhost:5000${u.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`} alt={u.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.displayName}</span>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>@{u.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); handleMarkAsRead(); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
              >
                <Bell size={24} color="var(--text-primary)" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', marginTop: '1rem', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '400px', overflowY: 'auto' }}>
                  <h4 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid #eee' }}>Notifications</h4>
                  {notifications.length === 0 ? (
                    <p style={{ padding: '1rem', textAlign: 'center', color: '#777' }}>No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', background: n.is_read ? '#fff' : '#f0f8ff' }}>
                        <img src={n.userAvatar ? `http://localhost:5000${n.userAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(n.username)}`} alt={n.username} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            <strong>{n.displayName}</strong> {n.type === 'like' ? 'liked your post' : n.type === 'comment' ? 'commented on your post' : 'started following you'}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div style={{ position: 'relative' }}>
              <Link to="/chat" style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', color: 'inherit' }}>
                <MessageSquare size={24} color="var(--text-primary)" />
              </Link>
            </div>

            <button 
              onClick={toggleTheme} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
            </button>

            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
              {dbAvatar || user.photoURL ? (
                <img src={dbAvatar || user.photoURL || ''} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
              )}
              <span style={{ fontWeight: 500 }}>{user.displayName || user.email?.split('@')[0]}</span>
            </Link>
            <button onClick={logout} style={{ padding: '0.4rem 1rem', background: '#eee', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 500 }}>Logout</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        )}
      </div>
    </nav>
  ); 
}
