import { NavLink, Link } from 'react-router-dom';
import { Home, User, Compass, Users, MessageSquare, Bookmark, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../../config/firebase';
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
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/profile/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted && res.data?.profile) {
          const p = res.data.profile;
          setProfilePreview({
            name: p.full_name,
            username: p.username,
            avatar: p.profile_picture ? `${import.meta.env.VITE_API_URL}${p.profile_picture}` : user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}`
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
        <div style={{ padding: '0 1rem 1.5rem 1rem', borderBottom: '1px solid #333' }}>
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
            <img src={profilePreview.avatar} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>{profilePreview.name}</span>
              <span style={{ fontSize: '0.85rem', color: '#888' }}>@{profilePreview.username}</span>
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
