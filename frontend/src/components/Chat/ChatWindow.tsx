import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import OnlineStatus from './OnlineStatus';
import { ArrowLeft } from 'lucide-react';

interface ChatWindowProps {
  selectedUser: any;
  conversationId: number | null;
  onBack?: () => void;
  isOnline: boolean;
  lastSeen?: string;
  isTyping: boolean;
}

export default function ChatWindow({ selectedUser, conversationId: initialConversationId, onBack, isOnline, lastSeen, isTyping }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedUser) return;
    const fetchMessages = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await axios.get(`http://localhost:5000/api/chat/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversationId(res.data.conversationId);
        setMessages(res.data.messages);
        
        // Mark as read immediately when opened
        if (res.data.conversationId) {
          await axios.put(`http://localhost:5000/api/chat/read`, { conversationId: res.data.conversationId }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (socket) {
            socket.emit('message_read', { conversationId: res.data.conversationId, readerId: user?.uid });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [selectedUser, user]);

  useEffect(() => {
    if (socket && conversationId) {
      socket.emit('join_room', conversationId);

      const handleReceive = (msg: any) => {
        if (msg.conversationId === conversationId) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark read automatically
          if (msg.sender_id !== user?.uid) {
            socket.emit('message_read', { conversationId, readerId: user?.uid });
            auth.currentUser?.getIdToken().then(token => {
              axios.put(`http://localhost:5000/api/chat/read`, { conversationId }, {
                headers: { Authorization: `Bearer ${token}` }
              }).catch(console.error);
            });
          }
        }
      };

      const handleReadStatus = ({ conversationId: msgConvId, readerId }: any) => {
        if (msgConvId === conversationId && readerId !== user?.uid) {
          setMessages(prev => prev.map(m => (!m.is_read && m.sender_id === user?.uid) ? { ...m, is_read: true } : m));
        }
      };

      socket.on('receive_message', handleReceive);
      socket.on('message_read', handleReadStatus);

      return () => {
        socket.off('receive_message', handleReceive);
        socket.off('message_read', handleReadStatus);
        socket.emit('leave_room', conversationId);
      };
    }
  }, [socket, conversationId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (content: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await axios.post('http://localhost:5000/api/chat/send', 
        { receiverId: selectedUser.id, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newMessage = res.data.message;
      setMessages(prev => [...prev, newMessage]);
      
      if (socket && conversationId) {
        socket.emit('send_message', { ...newMessage, conversationId });
      }
      // If it was the first message and conversation was created
      if (!conversationId && res.data.message.conversation_id) {
        setConversationId(res.data.message.conversation_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (isTypingState: boolean) => {
    if (socket && conversationId) {
      socket.emit(isTypingState ? 'typing' : 'stop_typing', { room: conversationId, typerId: user?.uid });
    }
  };

  if (!selectedUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5', color: '#666' }}>
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #ccc', background: '#fff', gap: '1rem' }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={24} color="#333" />
          </button>
        )}
        <img src={selectedUser.avatar ? `http://localhost:5000${selectedUser.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username)}`} alt={selectedUser.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 'bold' }}>{selectedUser.displayName}</span>
          <OnlineStatus isOnline={isOnline} lastSeen={lastSeen} />
        </div>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: '#e5ddd5' }}>
        {messages.map((msg, index) => {
          const isOwn = msg.sender_id === user?.uid;
          const status = msg.is_read ? 'read' : 'delivered'; // Since we are saving via API, it is delivered. Client will mark read later via socket
          return (
            <MessageBubble 
              key={msg.id || index}
              content={msg.content}
              isOwn={isOwn}
              time={new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              status={isOwn ? status : undefined}
            />
          );
        })}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  );
}
