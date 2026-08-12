import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import { API_URL } from '../config/api';
import { User, Mail, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import styles from './Auth.module.css';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      return setError('Please fill in all fields');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      // 1. Firebase Auth Registration
      if (!auth) {
        setError('Authentication service is not available. Please check Firebase configuration.');
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate username from email
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

      // 2. MySQL Backend DB Sync
      await axios.post(`${API_URL}/auth/register`, {
        firebase_uid: user.uid,
        email: user.email,
        full_name: fullName,
        username: username,
      });

      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create an account');
      }
    }
  };

  return (
    <div className={styles.container}>
      <button 
        onClick={toggleTheme} 
        className={styles.themeToggle}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon size={28} /> : <Sun size={28} />}
      </button>

      <div className={styles.card}>
        <h2 className={`${styles.title} ${styles.titlePink}`}>Register</h2>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <User size={18} className={styles.icon} style={{ color: '#ff00c8' }} />
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              style={fullName ? { borderBottomColor: '#ff00c8' } : {}}
            />
          </div>

          <div className={styles.inputGroup}>
            <Mail size={18} className={styles.icon} style={{ color: '#ff00c8' }} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={email ? { borderBottomColor: '#ff00c8' } : {}}
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.icon} style={{ color: '#ff00c8' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              style={password ? { borderBottomColor: '#ff00c8' } : {}}
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.icon} style={{ color: '#ff00c8' }} />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              style={confirmPassword ? { borderBottomColor: '#ff00c8' } : {}}
            />
          </div>

          <button type="submit" className={`${styles.submitBtn} ${styles.submitBtnPink}`}>
            Register
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={`${styles.link} ${styles.linkPink}`}>Already have an account? Login</Link>
        </div>
      </div>

      <style>{`
        /* Overrides for pink color theme on Register input focus */
        .${styles.inputGroup} input:focus {
          border-bottom-color: #ff00c8 !important;
          box-shadow: 0 5px 5px -5px rgba(255, 0, 200, 0.5) !important;
        }
      `}</style>
    </div>
  );
}
