import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../../config/firebase';
import { Search } from 'lucide-react';

interface ChatListProps {
  onSelect: (user: any, conversationId: number | null) => void;
  onlineMap: Record<string, boolean>;
}

export default function ChatList({ onSelect, onlineMap }: ChatListProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await axios.get('${import.meta.env.VITE_API_URL}/api/chat', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/search/users?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(res.data.users);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div style={{ width: '100%', height: '100%', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Messages</h2>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f0f2f5', padding: '0.5rem', borderRadius: '20px' }}>
          <Search size={18} color="#888" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '0.5rem', flex: 1 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {searchResults.length > 0 ? (
          <div>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#666', background: '#f9f9f9' }}>Search Results</div>
            {searchResults.map(user => (
              <div 
                key={user.id} 
                onClick={() => { onSelect(user, null); setSearchQuery(''); setSearchResults([]); }}
                style={{ display: 'flex', padding: '1rem', cursor: 'pointer', borderBottom: '1px solid #eee', alignItems: 'center', gap: '1rem' }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={user.avatar ? `${import.meta.env.VITE_API_URL}${user.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`} alt={user.displayName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  {onlineMap[user.id] && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#4caf50', borderRadius: '50%', border: '2px solid #fff' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600' }}>{user.displayName}</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>@{user.username}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {conversations.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>No conversations yet.</p>
            ) : (
              conversations.map(conv => (
                <div 
                  key={conv.conversationId}
                  onClick={() => onSelect({ id: conv.otherUserId, displayName: conv.otherFullName, username: conv.otherUsername, avatar: conv.otherAvatar }, conv.conversationId)}
                  style={{ display: 'flex', padding: '1rem', cursor: 'pointer', borderBottom: '1px solid #eee', alignItems: 'center', gap: '1rem' }}
                >
                  <div style={{ position: 'relative' }}>
                    <img src={conv.otherAvatar ? `${import.meta.env.VITE_API_URL}${conv.otherAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.otherUsername)}`} alt={conv.otherUsername} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    {onlineMap[conv.otherUserId] && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#4caf50', borderRadius: '50%', border: '2px solid #fff' }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600' }}>{conv.otherFullName}</span>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(conv.last_message_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message}</span>
                      {conv.unreadCount > 0 && (
                        <span style={{ background: '#0a66c2', color: '#fff', borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
