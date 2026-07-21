
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { auth } from '../config/firebase';
import { Bell, Search, MessageSquare, Moon, Sun, Users, Heart, MessageCircle, UserPlus, AtSign, Info } from 'lucide-react';
import { io } from 'socket.io-client';
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
          const pic = res.data.profile.profile_picture;
          setDbAvatar(pic.startsWith('http') ? pic : `http://localhost:5000${pic}`);
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
    if (!user) return;
    const fetchNotifications = async () => {
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
    const newSocket = io('http://localhost:5000', {
      query: { userId: user.uid }
    });

    newSocket.on('receive_notification', (newNotif: any) => {
      setNotifications(prev => [newNotif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      newSocket.off('receive_notification');
      newSocket.disconnect();
    };
  }, [user]);

  const handleMarkAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.put(`http://localhost:5000/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const diff = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'LIKE') return <Heart size={14} color="#e0245e" />;
    if (t === 'COMMENT') return <MessageCircle size={14} color="#1da1f2" />;
    if (t === 'FRIEND_REQUEST') return <UserPlus size={14} color="#ff9800" />;
    if (t === 'FRIEND_ACCEPTED') return <Users size={14} color="#17bf63" />;
    if (t === 'FOLLOW') return <UserPlus size={14} color="#794bc4" />;
    if (t === 'MESSAGE') return <MessageSquare size={14} color="#0084ff" />;
    if (t === 'MENTION') return <AtSign size={14} color="#f45d22" />;
    return <Info size={14} color="#888" />;
  };

  const getNotificationText = (n: any) => {
    const t = n.type.toUpperCase();
    if (t === 'LIKE') return 'liked your post.';
    if (t === 'COMMENT') return 'commented on your post.';
    if (t === 'FRIEND_REQUEST') return 'sent you a friend request.';
    if (t === 'FRIEND_ACCEPTED') return 'accepted your friend request.';
    if (t === 'FOLLOW') return 'started following you.';
    if (t === 'MESSAGE') return `sent you a message...`;
    if (t === 'MENTION') return 'mentioned you.';
    return n.message || 'interacted with you.';
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
                    <img src={u.avatar ? (u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000${u.avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`} alt={u.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
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
                <div style={{ position: 'absolute', top: '100%', right: 0, width: '350px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '1rem', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Notifications</h4>
                    <Link to="/notifications" onClick={() => setShowNotifications(false)} style={{ fontSize: '0.85rem', color: 'var(--primary-color)', textDecoration: 'none' }}>See all</Link>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n.id} onClick={() => { setShowNotifications(false); navigate('/notifications'); }} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: n.is_read ? 'transparent' : 'var(--hover-bg, rgba(0,132,255,0.05))', cursor: 'pointer', transition: 'background 0.2s' }}>
                          <div style={{ position: 'relative' }}>
                            <img src={n.sender_avatar ? (n.sender_avatar.startsWith('http') ? n.sender_avatar : `http://localhost:5000${n.sender_avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(n.sender_name)}`} alt={n.sender_username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: '18px', height: '18px', background: 'var(--card-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getNotificationIcon(n.type)}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              <strong>{n.sender_name}</strong> {getNotificationText(n)}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: n.is_read ? 'var(--text-secondary)' : 'var(--primary-color)', fontWeight: n.is_read ? 'normal' : 600 }}>{formatTime(n.created_at)}</span>
                          </div>
                          {!n.is_read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)', marginTop: '4px' }} />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ position: 'relative' }}>
              <Link to="/chat" style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', color: 'inherit' }} title="Chat">
                <MessageSquare size={24} color="var(--text-primary)" />
              </Link>
            </div>

            <div style={{ position: 'relative' }}>
              <Link to="/friends" style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', color: 'inherit' }} title="Friends">
                <Users size={24} color="var(--text-primary)" />
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
