import type { UserProfile } from '../types/Profile';

interface ProfileCardProps {
  profile: UserProfile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name) + '&background=random';
  // Use localhost directly for demo. Usually this would be configured globally via env variables.
  const profilePictureUrl = profile.profile_picture ? `http://localhost:5000${profile.profile_picture}` : defaultAvatar;

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <img 
        src={profilePictureUrl} 
        alt={profile.full_name} 
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '4px solid #f0f0f0',
          marginBottom: '1rem'
        }}
      />
      <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#333' }}>{profile.full_name}</h2>
      <p style={{ margin: '0 0 1rem 0', color: '#666', fontWeight: '500' }}>@{profile.username}</p>
      
      <p style={{ margin: '0 0 1rem 0', color: '#555', lineHeight: '1.5', maxWidth: '400px' }}>
        {profile.bio || 'No bio yet.'}
      </p>

      <div style={{
        display: 'flex',
        gap: '2rem',
        justifyContent: 'center',
        padding: '1rem 0',
        borderTop: '1px solid #eee',
        borderBottom: '1px solid #eee',
        width: '100%',
        marginBottom: '1rem'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>{profile.total_posts}</h4>
          <span style={{ fontSize: '0.9rem', color: '#777' }}>Posts</span>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>{profile.followers}</h4>
          <span style={{ fontSize: '0.9rem', color: '#777' }}>Followers</span>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>{profile.following}</h4>
          <span style={{ fontSize: '0.9rem', color: '#777' }}>Following</span>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>{profile.likes_received}</h4>
          <span style={{ fontSize: '0.9rem', color: '#777' }}>Likes</span>
        </div>
      </div>

      <div style={{ width: '100%', textAlign: 'left', fontSize: '0.9rem', color: '#666' }}>
        {profile.location && <p style={{ margin: '0.5rem 0' }}><strong>Location:</strong> {profile.location}</p>}
        {profile.website && <p style={{ margin: '0.5rem 0' }}><strong>Website:</strong> <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>{profile.website}</a></p>}
        <p style={{ margin: '0.5rem 0' }}><strong>Email:</strong> {profile.email}</p>
        <p style={{ margin: '0.5rem 0' }}><strong>Joined:</strong> {new Date(profile.joined_date).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
