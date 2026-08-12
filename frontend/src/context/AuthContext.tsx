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

  if (initError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#121212',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(231, 76, 60, 0.1)',
          border: '1px solid #e74c3c',
          borderRadius: '12px',
          padding: '2.5rem',
          maxWidth: '550px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '1.25rem', marginTop: 0, fontSize: '1.8rem', fontWeight: 700 }}>
            Firebase Configuration Error
          </h2>
          <p style={{ color: '#e0e0e0', lineHeight: 1.6, marginBottom: '1.75rem', fontSize: '1.05rem', textAlign: 'left', wordBreak: 'break-word' }}>
            <strong>Error details:</strong> {initError}
          </p>
          <p style={{ color: '#a0a0a0', fontSize: '0.95rem', margin: 0, textAlign: 'left', lineHeight: 1.5 }}>
            To resolve this error, make sure you have added the required environment variables (e.g. <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>, etc.) in your hosting provider's dashboard (e.g. Vercel Project Settings) and re-deployed your app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, savedPostIds, toggleSavedPost }}>
      {!loading && children}
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


