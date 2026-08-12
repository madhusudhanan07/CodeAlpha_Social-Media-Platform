import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, firebaseError } from '../config/firebase';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  savedPostIds: Set<number>;
  toggleSavedPost: (postId: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedPostIds, setSavedPostIds] = useState<Set<number>>(new Set());
  const [initError] = useState<string | null>(firebaseError);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const res = await axios.get(`${API_URL}/saved/ids`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSavedPostIds(new Set(res.data.savedIds));
        } catch (e) {
          console.error("Failed to load saved posts", e);
        }
      } else {
        setSavedPostIds(new Set());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setSavedPostIds(new Set());
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const toggleSavedPost = async (postId: number) => {
    if (!user || !auth) return false;
    const isSaved = savedPostIds.has(postId);
    const token = await user.getIdToken();
    try {
      if (isSaved) {
        await axios.delete(`${API_URL}/saved/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
        setSavedPostIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
        return false;
      } else {
        await axios.post(`${API_URL}/saved/${postId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setSavedPostIds(prev => { const n = new Set(prev); n.add(postId); return n; });
        return true;
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      throw error;
    }
  };

  // Firebase configuration error — show a full-screen error page
  if (initError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(231, 76, 60, 0.08)',
          border: '1px solid rgba(231, 76, 60, 0.4)',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '580px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#e74c3c', marginBottom: '1.25rem', marginTop: 0, fontSize: '1.6rem', fontWeight: 700 }}>
            Firebase Configuration Error
          </h2>
          <p style={{ color: '#e0e0e0', lineHeight: 1.7, marginBottom: '1.75rem', fontSize: '1rem', textAlign: 'left', wordBreak: 'break-word' }}>
            <strong>Error:</strong> {initError}
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: '#a0c4ff', fontSize: '0.95rem', margin: '0 0 0.75rem 0', fontWeight: 600 }}>
              How to fix this:
            </p>
            <ol style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.8, margin: 0, paddingLeft: '1.25rem' }}>
              <li>Go to your <strong>Vercel Dashboard</strong></li>
              <li>Select this project → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
              <li>Add all <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>VITE_FIREBASE_*</code> variables</li>
              <li><strong>Redeploy</strong> the project</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: '#fff',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state — show a spinner instead of rendering nothing
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-color, #121212)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#0a66c2',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, savedPostIds, toggleSavedPost }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
