import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import type { UserProfile } from '../types/Profile';
import EditProfileForm from '../components/EditProfileForm';

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`http://localhost:5000/api/profile/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data.profile);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          // If profile not found, init empty form for new user
          const initialFallback: any = {
            full_name: user.displayName || '',
            username: user.email?.split('@')[0] || '',
            bio: '',
            profile_picture: user.photoURL || ''
          };
          setProfile(initialFallback);
        } else {
          setError(err.response?.data?.message || err.message || 'Failed to fetch profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
      
      {profile && (
        <EditProfileForm 
          initialData={profile}
          onSuccess={() => navigate('/profile')}
          onCancel={() => navigate('/profile')}
        />
      )}
    </div>
  );
}
