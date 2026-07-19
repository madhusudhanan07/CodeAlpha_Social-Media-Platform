import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import styles from './RightSidebar.module.css';

const trendingTopics = [
  { tag: '#React', posts: '120K posts' },
  { tag: '#TypeScript', posts: '85K posts' },
  { tag: '#NodeJS', posts: '90K posts' },
  { tag: '#Firebase', posts: '45K posts' },
  { tag: '#CodeAlpha', posts: '10K posts' }
];

export default function RightSidebar() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get('http://localhost:5000/api/follows/suggestions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuggestions(res.data.suggestions);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSuggestions();
  }, [user]);

  const handleFollow = async (userId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(`http://localhost:5000/api/follows/${userId}`, {}, {
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
          <p style={{ fontSize: '0.9rem', color: '#666' }}>No suggestions right now.</p>
        ) : (
          suggestions.map(person => (
            <div key={person.id} className={styles.personRow}>
              <Link to={`/profile/${person.id}`} style={{ display: 'flex', gap: '10px', textDecoration: 'none', color: 'inherit', alignItems: 'center', flex: 1 }}>
                <img src={person.avatar ? `http://localhost:5000${person.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.username)}`} alt={person.displayName} className={styles.personAvatar} style={{ objectFit: 'cover' }} />
                <div className={styles.personInfo}>
                  <span className={styles.personName}>{person.displayName}</span>
                  <span className={styles.personMutual}>@{person.username}</span>
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
