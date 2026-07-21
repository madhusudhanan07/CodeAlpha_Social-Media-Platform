import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const res = await axios.get('http://localhost:5000/api/saved/ids', {
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
      await signOut(auth);
      setSavedPostIds(new Set());
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const toggleSavedPost = async (postId: number) => {
    if (!user) return false;
    const isSaved = savedPostIds.has(postId);
    const token = await user.getIdToken();
    try {
      if (isSaved) {
        await axios.delete(`http://localhost:5000/api/saved/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
        setSavedPostIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
        return false;
      } else {
        await axios.post(`http://localhost:5000/api/saved/${postId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setSavedPostIds(prev => { const n = new Set(prev); n.add(postId); return n; });
        return true;
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      throw error;
    }
  };

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
