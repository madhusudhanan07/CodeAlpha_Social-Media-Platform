import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Feed from '../components/Feed/Feed';
import RightSidebar from '../components/RightSidebar/RightSidebar';
import styles from './Home.module.css';

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', height: '70vh', textAlign: 'center', 
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--text-primary)', marginBottom: '1rem', background: 'linear-gradient(90deg, #00d2ff, #ff00c8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome to CodeAlpha Social!
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '600px' }}>
          Connect with friends, share your thoughts, and explore trending topics globally. 
          Login or create a new account to access your personalized feed.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/login" style={{
            padding: '12px 30px', borderRadius: '30px', background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)',
            color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem',
            boxShadow: '0 4px 15px rgba(0, 210, 255, 0.4)'
          }}>Login</Link>
          <Link to="/register" style={{
            padding: '12px 30px', borderRadius: '30px', background: 'transparent',
            border: '2px solid #ff00c8', color: '#ff00c8', textDecoration: 'none', 
            fontWeight: 'bold', fontSize: '1.1rem',
            boxShadow: '0 4px 15px rgba(255, 0, 200, 0.2)'
          }}>Create Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.homeLayout}>
      <div className={styles.feedColumn}>
        <Feed />
      </div>
      <RightSidebar />
    </div>
  );
}
