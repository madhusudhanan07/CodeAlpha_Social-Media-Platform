import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import ChatList from '../components/Chat/ChatList';
import ChatWindow from '../components/Chat/ChatWindow';

export default function Chat() {
  const { socket } = useSocket();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!socket) return;

    socket.on('online_status', ({ userId, status, lastSeen }: any) => {
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: { isOnline: status === 'online', lastSeen }
      }));
    });

    socket.on('typing', ({ typerId }) => {
      setTypingStatus(prev => ({ ...prev, [typerId]: true }));
    });

    socket.on('stop_typing', ({ typerId }) => {
      setTypingStatus(prev => ({ ...prev, [typerId]: false }));
    });

    return () => {
      socket.off('online_status');
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 72px)', width: '100%', margin: '0 auto', maxWidth: '1200px', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      {/* Sidebar: Chat List */}
      <div 
        style={{ 
          width: selectedUser ? '30%' : '100%', 
          display: selectedUser && window.innerWidth <= 768 ? 'none' : 'block',
          borderRight: '1px solid #ddd' 
        }}
      >
        <ChatList 
          onSelect={(user, convId) => {
            setSelectedUser(user);
            setConversationId(convId);
          }}
          onlineMap={Object.keys(onlineUsers).reduce((acc, curr) => {
            if (onlineUsers[curr].isOnline) acc[curr] = true;
            return acc;
          }, {} as Record<string, boolean>)}
        />
      </div>

      {/* Main Area: Chat Window */}
      <div 
        style={{ 
          flex: 1, 
          display: !selectedUser && window.innerWidth <= 768 ? 'none' : 'block' 
        }}
      >
        <ChatWindow 
          selectedUser={selectedUser} 
          conversationId={conversationId} 
          onBack={() => setSelectedUser(null)} 
          isOnline={selectedUser ? onlineUsers[selectedUser.id]?.isOnline : false}
          lastSeen={selectedUser ? onlineUsers[selectedUser.id]?.lastSeen : undefined}
          isTyping={selectedUser ? typingStatus[selectedUser.id] : false}
        />
      </div>
    </div>
  );
}
