import type { UserProfile } from '../types/Profile';

interface ProfileCardProps {
  profile: UserProfile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name) + '&background=random';
  const profilePictureUrl = profile.profile_picture ? `http://localhost:5000${profile.profile_picture}` : defaultAvatar;
  const coverPhotoUrl = profile.cover_photo ? `http://localhost:5000${profile.cover_photo}` : 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=1000&auto=format&fit=crop'; // Premium fallback cover

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '0',
      borderRadius: '16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Cover Photo */}
      <div style={{ 
        width: '100%', 
        height: '250px', 
        backgroundImage: `url(${coverPhotoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }} />

      {/* Avatar and Info container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '0 2rem 2rem 2rem',
        marginTop: '-70px'
      }}>
        <img 
          src={profilePictureUrl} 
          alt={profile.full_name} 
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '6px solid #fff',
            backgroundColor: '#fff',
            marginBottom: '1rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}
        />
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#1a1a1a', fontWeight: 'bold' }}>{profile.full_name}</h2>
        <p style={{ margin: '0 0 1rem 0', color: '#666', fontWeight: '500', fontSize: '1rem' }}>@{profile.username}</p>
        
        <p style={{ margin: '0 0 1.5rem 0', color: '#4a4a4a', lineHeight: '1.6', maxWidth: '500px', textAlign: 'center', fontSize: '1.05rem' }}>
          {profile.bio || 'No bio yet.'}
        </p>

        <div style={{
          display: 'flex',
          gap: '2.5rem',
          justifyContent: 'center',
          padding: '1.5rem 0',
          borderTop: '1px solid #f0f2f5',
          borderBottom: '1px solid #f0f2f5',
          width: '100%',
          marginBottom: '1.5rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a1a' }}>{profile.total_posts}</h4>
            <span style={{ fontSize: '0.9rem', color: '#65676B', fontWeight: '500' }}>Posts</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a1a' }}>{profile.followers}</h4>
            <span style={{ fontSize: '0.9rem', color: '#65676B', fontWeight: '500' }}>Followers</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a1a' }}>{profile.following}</h4>
            <span style={{ fontSize: '0.9rem', color: '#65676B', fontWeight: '500' }}>Following</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a1a' }}>{profile.likes_received}</h4>
            <span style={{ fontSize: '0.9rem', color: '#65676B', fontWeight: '500' }}>Likes</span>
          </div>
        </div>

        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.95rem', color: '#4a4a4a', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
          {profile.location && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {profile.location}</div>}
          {profile.website && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🔗 <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: '#0a66c2', textDecoration: 'none', fontWeight: 500 }}>{profile.website}</a></div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✉️ {profile.email}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 Joined {new Date(profile.joined_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
    </div>
  );
}
