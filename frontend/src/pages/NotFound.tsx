import { Link } from 'react-router-dom';

export default function NotFound() { 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', textAlign: 'center' }}>
      <h1 style={{ fontSize: '6rem', margin: 0, color: 'var(--primary-color)' }}>404</h1>
      <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
        Oops! The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" style={{ padding: '0.75rem 2rem', background: 'var(--primary-color)', color: '#fff', borderRadius: '24px', textDecoration: 'none', fontWeight: 600, transition: 'background 0.3s' }}>
        Return to Home
      </Link>
    </div>
  ); 
}
