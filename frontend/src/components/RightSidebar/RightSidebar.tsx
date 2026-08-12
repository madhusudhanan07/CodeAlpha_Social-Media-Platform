import { useEffect, useState } from 'react';
import { API_URL } from '../../config/api';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import styles from './RightSidebar.module.css';

const trendingTopics = [
  { tag: '#ArtificialIntelligence', posts: '3.2M posts' },
  { tag: '#Olympics2024', posts: '2.5M posts' },
  { tag: '#ClimateAction', posts: '1.1M posts' },
  { tag: '#SpaceExploration', posts: '850K posts' },
  { tag: '#GlobalTech', posts: '620K posts' },
  { tag: '#WorldNews', posts: '450K posts' }
];

export default function RightSidebar() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) return;
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await axios.get(`${API_URL}/follows/suggestions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSuggestions();
  }, [user]);

  const handleFollow = async (userId: string) => {
    try {
      const token = await auth?.currentUser?.getIdToken();
      await axios.post(`${API_URL}/follows/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(suggestions.filter(s => s.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className={styles.rightSidebar}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Suggested Users</h3>
        {suggestions.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #666)' }}>No suggestions right now.</p>
        ) : (
          suggestions.map(person => (
            <div key={person.id} className={styles.personRow}>
              <Link to={`/profile/${person.id}`} style={{ display: 'flex', gap: '10px', textDecoration: 'none', color: 'inherit', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <img 
                  src={getAvatarUrl(person.avatar, person.displayName || person.username)} 
                  alt={person.displayName || person.username} 
                  onError={(e) => handleAvatarError(e, person.displayName || person.username)}
                  className={styles.personAvatar} 
                  style={{ objectFit: 'cover', flexShrink: 0 }} 
                />
                <div className={styles.personInfo} style={{ minWidth: 0, overflow: 'hidden' }}>
                  <span className={styles.personName} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.displayName}</span>
                  <span className={styles.personMutual} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{person.username}</span>
                </div>
              </Link>
              <button className={styles.followBtn} onClick={() => handleFollow(person.id)}>Follow</button>
            </div>
          ))
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Trending Topics</h3>
        <ul className={styles.trendingList}>
          {trendingTopics.map(topic => (
            <li key={topic.tag} className={styles.trendingItem}>
              <span className={styles.hashTag}>{topic.tag}</span>
              <span className={styles.postCount}>{topic.posts}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
