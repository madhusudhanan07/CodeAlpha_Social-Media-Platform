import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Search, Send, Image as ImageIcon, ArrowLeft, MoreVertical, Copy, Trash, MessageSquare, Check, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './Chat.module.css';

interface Conversation {
  conversationId: number;
  friendId: string;
  friendUsername: string;
  friendName: string;
  friendAvatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  receiverId: string;
  message: string;
  image?: string;
  status: 'sent' | 'delivered' | 'read';
  time: string;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryUserId = searchParams.get('userId');

  const [socket, setSocket] = useState<Socket | null>(null);

  // Lists
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // States
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getToken = useCallback(async () => {
    return await user?.getIdToken();
  }, [user]);

  // Connect Socket
  useEffect(() => {
    if (!user) return;
    const newSocket = io('http://localhost:5000', {
      query: { userId: user.uid }
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Fetch Conversations
  const fetchConversations = useCallback(async (q = '') => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const endpoint = q 
        ? `http://localhost:5000/api/messages/search?q=${q}`
        : `http://localhost:5000/api/messages/conversations`;
        
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const convs = res.data.conversations.map((c: any) => ({
        ...c,
        friendAvatar: c.friendAvatar ? (c.friendAvatar.startsWith('http') ? c.friendAvatar : `http://localhost:5000${c.friendAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.friendUsername)}`
      }));
      
      let modifiedConvs = [...convs];

      // Map query params to open chat if incoming from other pages
      if (queryUserId && !activeConv) {
        let matching = modifiedConvs.find((c: Conversation) => c.friendId === queryUserId);
        
        if (!matching) {
          // Construct temporary conversation for new chat
          try {
            const profileRes = await axios.get(`http://localhost:5000/api/profile/${queryUserId}`, { 
              headers: { Authorization: `Bearer ${token}` } 
            });
            const p = profileRes.data.profile;
            matching = {
              conversationId: -1, // temporary ID
              friendId: queryUserId,
              friendUsername: p.username,
              friendName: p.full_name || p.username,
              friendAvatar: p.profile_picture ? (p.profile_picture.startsWith('http') ? p.profile_picture : `http://localhost:5000${p.profile_picture}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}`,
              unreadCount: 0,
              isOnline: false
            };
            modifiedConvs = [matching, ...modifiedConvs];
          } catch(e) {
            console.error('Failed to fetch new chat profile');
          }
        }
        
        if (matching) setActiveConv(matching);
      }
      
      setConversations(modifiedConvs);
    } catch (err) {
      console.error(err);
    }
  }, [getToken, activeConv, queryUserId]);

  useEffect(() => {
    fetchConversations(searchQuery);
  }, [searchQuery, fetchConversations]);

  // Fetch Messages for active conversation
  const fetchMessages = useCallback(async (convId: number) => {
    if (convId === -1) {
      setMessages([]);
      return;
    }
    
    try {
      const token = await getToken();
      const res = await axios.get(`http://localhost:5000/api/messages/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages);
      scrollToBottom();
      
      // Mark as read
      await axios.put(`http://localhost:5000/api/messages/read/${convId}`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local unread UI and alert socket
      setConversations(prev => prev.map(c => c.conversationId === convId ? { ...c, unreadCount: 0 } : c));
      
      if (socket) {
        socket.emit('message_seen', { conversationId: convId, readerId: user?.uid, messageId: 'all' });
      }

    } catch (err) {
      toast.error('Failed to load messages');
    }
  }, [getToken, socket, user]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.conversationId);
      
      if (socket) {
        socket.emit('join_room', activeConv.conversationId);
      }
    }
    
    return () => {
      if (socket && activeConv) {
        socket.emit('leave_room', activeConv.conversationId);
      }
    }
  }, [activeConv, fetchMessages, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    socket.on('receive_message', (msg: Message) => {
      // If we are currently in the conversation, mark it as read immediately and update list
      if (activeConv && activeConv.conversationId === msg.conversationId) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
        
        socket.emit('message_seen', { conversationId: msg.conversationId, readerId: user.uid, messageId: msg.id });
        
        // Refresh API to trigger DB update of read status
        getToken().then(t => 
           axios.put(`http://localhost:5000/api/messages/read/${msg.conversationId}`, {}, { headers: { Authorization: `Bearer ${t}` }})
        );
      } else {
        // We aren't in this room, increase unread count
        setConversations(prev => {
          const match = prev.find(c => c.conversationId === msg.conversationId);
          if (match) {
            return prev.map(c => c.conversationId === msg.conversationId ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: msg.message || 'Image', lastMessageTime: msg.time } : c);
          }
          // if completely new conversation, refresh the list
          fetchConversations();
          return prev;
        });
      }
    });

    socket.on('message_seen', ({ conversationId, readerId }) => {
      if (readerId !== user.uid && activeConv?.conversationId === conversationId) {
        setMessages(prev => prev.map(m => m.senderId === user.uid ? { ...m, status: 'read' } : m));
      }
    });

    socket.on('typing', ({ typerId }) => {
      if (typerId !== user.uid) setTypingUsers(prev => ({ ...prev, [typerId]: true }));
    });
    
    socket.on('stop_typing', ({ typerId }) => {
      if (typerId !== user.uid) setTypingUsers(prev => ({ ...prev, [typerId]: false }));
    });

    socket.on('online', ({ userId }) => {
      setConversations(prev => prev.map(c => c.friendId === userId ? { ...c, isOnline: true } : c));
    });

    socket.on('offline', ({ userId }) => {
      setConversations(prev => prev.map(c => c.friendId === userId ? { ...c, isOnline: false } : c));
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_seen');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('online');
      socket.off('offline');
    };
  }, [socket, user, activeConv, fetchConversations, getToken]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (socket && activeConv && user) {
      socket.emit('typing', { room: activeConv.conversationId, typerId: user.uid });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { room: activeConv.conversationId, typerId: user.uid });
      }, 2000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeConv || !user) return;
    const file = e.target.files[0];
    
    // Quick validation
    if (!file.type.startsWith('image/')) {
      toast.error('Only images are allowed');
      return;
    }

    try {
      const token = await getToken();
      
      // Upload image first
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadRes = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const imageUrl = uploadRes.data.imageUrl;

      // Send message with image
      const res = await axios.post('http://localhost:5000/api/messages/send', {
        receiverId: activeConv.friendId,
        message: '',
        image: imageUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(prev => [...prev, res.data.message]);
      scrollToBottom();
      setConversations(prev => prev.map(c => c.friendId === activeConv.friendId ? 
        { ...c, conversationId: res.data.message.conversationId, lastMessage: 'Sent an image', lastMessageTime: new Date().toISOString() } : c
      ));
      
      if (activeConv.conversationId === -1) {
        setActiveConv(prev => prev ? { ...prev, conversationId: res.data.message.conversationId } : null);
      }

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send image');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || !user) return;
    
    const token = await getToken();
    try {
      const res = await axios.post('http://localhost:5000/api/messages/send', {
        receiverId: activeConv.friendId,
        message: inputText,
        image: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(prev => [...prev, res.data.message]);
      setInputText('');
      
      if (socket) {
        socket.emit('stop_typing', { room: activeConv.conversationId, typerId: user.uid });
      }
      scrollToBottom();
      
      // Update sidebar conversation dynamically
      setConversations(prev => prev.map(c => c.friendId === activeConv.friendId ? 
        { ...c, conversationId: res.data.message.conversationId, lastMessage: inputText, lastMessageTime: new Date().toISOString() } : c
      ));

      if (activeConv.conversationId === -1) {
        setActiveConv(prev => prev ? { ...prev, conversationId: res.data.message.conversationId } : null);
      }

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send message');
    }
  };

  const deleteMessage = async (msgId: number) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      const token = await getToken();
      await axios.delete(`http://localhost:5000/api/messages/${msgId}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success('Message deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isTyping = activeConv ? typingUsers[activeConv.friendId] : false;

  return (
    <div className={`${styles.container} animate-fade-in`}>
      
      {/* Left Sidebar */}
      <div className={styles.sidebar} style={{"--show-sidebar": activeConv ? 'none' : 'flex'} as React.CSSProperties}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Chats</h2>
          <div className={styles.searchBar}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search Messenger" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ul className={styles.conversationList}>
          {conversations.length === 0 ? (
             <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No active conversations
             </p>
          ) : (
            conversations.map(conv => (
              <li 
                key={conv.conversationId} 
                className={`${styles.conversationItem} ${activeConv?.conversationId === conv.conversationId ? styles.active : ''}`}
                onClick={() => setActiveConv(conv)}
              >
                <div className={styles.avatarWrapper}>
                  <img src={conv.friendAvatar} alt={conv.friendName} className={styles.avatar} />
                  {conv.isOnline && <span className={styles.onlineIndicator} />}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.friendName}>{conv.friendName}</div>
                  <div className={styles.lastMessage} style={{ fontWeight: conv.unreadCount > 0 ? 600 : 'normal', color: conv.unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {conv.lastMessage || 'New connection'}
                  </div>
                </div>
                <div className={styles.metaInfo}>
                  <span className={styles.time}>{formatTime(conv.lastMessageTime)}</span>
                  {conv.unreadCount > 0 && <span className={styles.unreadBadge}>{conv.unreadCount}</span>}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Right Chat Area */}
      {activeConv ? (
        <div className={styles.chatWindow} style={{"--show-chat": activeConv ? 'flex' : 'none'} as React.CSSProperties}>
          
          <div className={styles.chatHeader}>
            <button className={styles.backBtn} onClick={() => setActiveConv(null)}>
              <ArrowLeft size={24} />
            </button>
            <img src={activeConv.friendAvatar} alt="Profile" className={styles.chatHeaderAvatar} onClick={() => navigate(`/profile/${activeConv.friendId}`)} style={{ cursor: 'pointer' }} />
            <div className={styles.chatHeaderInfo}>
              <div className={styles.chatHeaderName}>{activeConv.friendName}</div>
              <div className={styles.chatHeaderStatus}>
                {activeConv.isOnline ? <span style={{color: '#31a24c', fontWeight: 500}}>Active now</span> : 'Offline'}
              </div>
            </div>
            <button className={styles.iconBtn} onClick={() => navigate(`/profile/${activeConv.friendId}`)}>
              <MoreVertical size={20} />
            </button>
          </div>
          
          <div className={styles.messagesList}>
            {messages.length === 0 ? (
               <div className={styles.emptyState}>
                 <MessageSquare size={48} color="var(--text-secondary)" />
                 <h2>Start a Conversation</h2>
                 <p>Send a message to {activeConv.friendName} to connect!</p>
               </div>
            ) : (
              messages.map(msg => {
                const isSentByMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`${styles.messageWrapper} ${isSentByMe ? styles.messageSent : styles.messageReceived}`}>
                    
                    <div className={styles.messageContent}>
                      {msg.image && <img src={msg.image} alt="Upload" className={styles.messageImage} />}
                      {msg.message}
                    </div>
                    
                    <div className={styles.messageMeta}>
                      {formatTime(msg.time)}
                      {isSentByMe && (
                         <span style={{ display: 'flex', alignItems: 'center' }}>
                            {msg.status === 'read' ? <CheckCircle2 size={12} color="#0084ff" /> : <Check size={12} />}
                         </span>
                      )}
                    </div>

                    <div className={styles.actionMenu}>
                       <span title="Copy" onClick={() => copyMessage(msg.message)} style={{marginRight: '6px'}}><Copy size={14} /></span>
                       {isSentByMe && <span title="Delete" onClick={() => deleteMessage(msg.id)}><Trash size={14} color="red" /></span>}
                    </div>
                  </div>
                )
              })
            )}
            
            {isTyping && (
              <div className={styles.typingIndicator}>
                 {activeConv.friendName} is typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.chatInputWrapper} onSubmit={sendMessage}>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            <button 
              type="button" 
              className={styles.iconBtn} 
              aria-label="Attach"
              onClick={() => fileInputRef.current?.click()}
            >
               <ImageIcon size={20} />
            </button>
            <input  
              type="text" 
              className={styles.chatInput} 
              placeholder="Aa" 
              value={inputText}
              onChange={handleTyping}
            />
            <button type="submit" className={`${styles.iconBtn} ${styles.sendBtn}`}>
              <Send size={18} />
            </button>
          </form>
          
        </div>
      ) : (
        <div className={styles.emptyState} style={{"--show-chat": 'none'} as React.CSSProperties}>
          <MessageSquare size={60} color="var(--border-color)" />
          <h2>Your Messages</h2>
          <p>Send private photos and messages to a friend.</p>
        </div>
      )}

    </div>
  );
}
