import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Mail, Lock, Sun, Moon } from 'lucide-react';
import styles from './Auth.module.css';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      if (!auth) {
        setError('Authentication service is not available. Please check Firebase configuration.');
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
      // MainLayout ensures auth wrapper takes care of redirection dynamically if requested before
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network Error: Unable to connect to the authentication server. Please check your internet connection, or try disabling ad blockers/VPNs.');
      } else {
        const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Please try again later.'
          : err.message || 'Failed to login';
        setError(msg);
      }
    }
  };

  return (
    <div className={styles.container}>
      <button
        onClick={toggleTheme}
        className={styles.themeToggle}
        title="Toggle Theme"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
      </button>

      <div className={styles.card}>
        <h2 className={styles.title}>Login</h2>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <Mail size={18} className={styles.icon} />
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.icon} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            Submit
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="#" className={styles.link}>Forgot Password ?</Link>
          <Link to="/register" className={styles.link}>SignUp</Link>
        </div>
      </div>
    </div>
  );
}

