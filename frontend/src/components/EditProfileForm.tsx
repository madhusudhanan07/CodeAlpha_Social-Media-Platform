import { useState } from 'react';
import axios from 'axios';
import type { UserProfile } from '../types/Profile';
import { auth } from '../config/firebase';

interface EditProfileFormProps {
  initialData: UserProfile;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditProfileForm({ initialData, onSuccess, onCancel }: EditProfileFormProps) {
  const [formData, setFormData] = useState({
    full_name: initialData.full_name || '',
    username: initialData.username || '',
    bio: initialData.bio || '',
    location: initialData.location || '',
    website: initialData.website || ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.profile_picture ? `http://localhost:5000${initialData.profile_picture}` : null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      return setError('Username is required');
    }
    if (formData.bio.length > 200) {
      return setError('Bio must be less than 200 characters');
    }
    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
      return setError('Image must be less than 2 MB');
    }

    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Upload new profile picture if selected
      if (imageFile) {
        const formDataPayload = new FormData();
        formDataPayload.append('profile_picture', imageFile);

        await axios.post('http://localhost:5000/api/profile/upload', formDataPayload, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // 2. Update text data
      await axios.put('http://localhost:5000/api/profile/update', formData, { headers });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Only .jpg, .jpeg, and .png images are allowed.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(''); // Clear error if image is valid
    }
  };

  return (
    <form onSubmit={handleUpdate} style={{
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Edit Profile</h3>
      
      {error && <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: '500', color: '#555' }}>Profile Picture</label>
        {imagePreview && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />
          </div>
        )}
        <input 
          type="file" 
          accept=".jpg,.jpeg,.png"
          onChange={handleImageChange}
          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          disabled={loading}
        />
        <small style={{ color: '#777' }}>Max size: 2MB (jpg, jpeg, png)</small>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: '500', color: '#555' }}>Full Name</label>
        <input 
          type="text" 
          value={formData.full_name} 
          onChange={e => setFormData({...formData, full_name: e.target.value})} 
          style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} 
          disabled={loading} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: '500', color: '#555' }}>Username</label>
        <input 
          type="text" 
          value={formData.username} 
          onChange={e => setFormData({...formData, username: e.target.value})} 
          style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} 
          disabled={loading} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: '500', color: '#555' }}>Bio</label>
        <textarea 
          value={formData.bio} 
          onChange={e => setFormData({...formData, bio: e.target.value})} 
          style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px', resize: 'vertical' }} 
          disabled={loading} 
          placeholder="Tell us about yourself (Max 200 chars)"
        />
        <small style={{ color: formData.bio.length > 200 ? 'red' : '#777', textAlign: 'right' }}>
          {formData.bio.length}/200
        </small>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: '500', color: '#555' }}>Location</label>
        <input 
          type="text" 
          value={formData.location} 
          onChange={e => setFormData({...formData, location: e.target.value})} 
          style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} 
          disabled={loading} 
          placeholder="City, Country"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: '500', color: '#555' }}>Website</label>
        <input 
          type="url" 
          value={formData.website} 
          onChange={e => setFormData({...formData, website: e.target.value})} 
          style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} 
          disabled={loading} 
          placeholder="https://example.com"
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button 
          type="submit" 
          style={{ flex: 1, padding: '0.75rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f1f3f5', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} 
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
