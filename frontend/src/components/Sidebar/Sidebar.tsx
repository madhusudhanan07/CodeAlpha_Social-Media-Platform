import { NavLink, Link } from 'react-router-dom';
import { API_URL } from '../../config/api';
import { Home, User, Compass, Users, MessageSquare, Bookmark, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../../config/firebase';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import styles from './Sidebar.module.css';

const navLinks = [
  { name: 'Home', path: '/', icon: <Home className={styles.icon} /> },
  { name: 'Profile', path: '/profile', icon: <User className={styles.icon} /> },
  { name: 'Explore', path: '/explore', icon: <Compass className={styles.icon} /> },
  { name: 'Friends', path: '/friends', icon: <Users className={styles.icon} /> },
  { name: 'Messages', path: '/messages', icon: <MessageSquare className={styles.icon} /> },
  { name: 'Saved', path: '/saved', icon: <Bookmark className={styles.icon} /> },
  { name: 'Settings', path: '/settings', icon: <Settings className={styles.icon} /> }
];

export default function Sidebar() {
  const { user } = useAuth();
  const [profilePreview, setProfilePreview] = useState<{ name: string; avatar: string; username: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      if (!user) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`${API_URL}/profile/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted && res.data?.profile) {
          const p = res.data.profile;
          const displayName = p.full_name || p.username || user.displayName || 'User';
          setProfilePreview({
            name: displayName,
            username: p.username || 'user',
            avatar: getAvatarUrl(p.profile_picture || user.photoURL, displayName)
          });
        }
      } catch(err) {
        // fail silently for preview
      }
    };
    fetchUser();
    return () => { isMounted = false; };
  }, [user]);

  return (
    <aside className={styles.sidebar}>
      {profilePreview && (
        <div style={{ padding: '0 1rem 1.5rem 1rem', borderBottom: '1px solid var(--border-color, #333)' }}>
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
            <img 
              src={profilePreview.avatar} 
              alt="Avatar" 
              onError={(e) => handleAvatarError(e, profilePreview.name)}
              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profilePreview.name}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #888)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{profilePreview.username}</span>
            </div>
          </Link>
        </div>
      )}
      <nav className={styles.navMenu} style={{ marginTop: profilePreview ? '1rem' : '0' }}>
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) => 
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
