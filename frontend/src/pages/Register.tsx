import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import { User, Mail, Lock, Sun, Moon } from 'lucide-react';
import styles from './Auth.module.css';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      // Save user details to backend (MySQL)
      await axios.post("${import.meta.env.VITE_API_URL}/api/auth/register", {
        firebase_uid: userCredential.user.uid,
        email: userCredential.user.email,
        full_name: fullName,
        username: email.split("@")[0]
      });

      navigate("/");
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    }
  };

  return (
    <div className={styles.container}>
      <button
        onClick={toggleTheme}
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff00c8', zIndex: 10 }}
        title="Toggle Theme"
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
