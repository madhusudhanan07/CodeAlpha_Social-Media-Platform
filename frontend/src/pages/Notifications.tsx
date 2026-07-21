import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Bell, Check, Trash2, CheckCheck, Heart, MessageCircle, UserPlus, Users, MessageSquare, AtSign, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './Notifications.module.css';

interface NotificationItem {
  id: number;
  type: string;
  reference_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  sender_id: string;
  sender_username: string;
  sender_name: string;
  sender_avatar: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const getToken = useCallback(async () => {
    return await user?.getIdToken();
  }, [user]);

  const fetchNotifications = useCallback(async (currentFilter: string) => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications?filter=${currentFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications.map((n: any) => ({
        ...n,
        sender_avatar: n.sender_avatar ? (n.sender_avatar.startsWith('http') ? n.sender_avatar : `${import.meta.env.VITE_API_URL}${n.sender_avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(n.sender_name)}`
      })));
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [getToken, user]);

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  // Socket
  useEffect(() => {
    if (!user) return;
    const newSocket = io('${import.meta.env.VITE_API_URL}', {
      query: { userId: user.uid }
    });

    newSocket.on('receive_notification', (newNotif: any) => {
      // Map avatar immediately
      const mapped = {
        ...newNotif,
        sender_avatar: newNotif.sender_avatar ? (newNotif.sender_avatar.startsWith('http') ? newNotif.sender_avatar : `${import.meta.env.VITE_API_URL}${newNotif.sender_avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(newNotif.sender_name)}`
      };
      setNotifications(prev => [mapped, ...prev]);
      toast.success(`New notification from ${newNotif.sender_name}`);
    });

    return () => {
      newSocket.off('receive_notification');
      newSocket.disconnect();
    };
  }, [user]);

  const handleMarkRead = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const token = await getToken();
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      toast.error('Could not mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      await axios.put('${import.meta.env.VITE_API_URL}/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const token = await getToken();
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getNotificationDetails = (type: string, n: NotificationItem) => {
    const t = type.toUpperCase();
    switch(t) {
      case 'LIKE':
        return { icon: <Heart size={14} />, color: '#e0245e', link: `/post/${n.reference_id}`, text: 'liked your post.' };
      case 'COMMENT':
        return { icon: <MessageCircle size={14} />, color: '#1da1f2', link: `/post/${n.reference_id}`, text: 'commented on your post.' };
      case 'FRIEND_REQUEST':
        return { icon: <UserPlus size={14} />, color: '#ff9800', link: `/friends`, text: 'sent you a friend request.' };
      case 'FRIEND_ACCEPTED':
        return { icon: <Users size={14} />, color: '#17bf63', link: `/profile/${n.sender_id}`, text: 'accepted your friend request.' };
      case 'FOLLOW':
        return { icon: <UserPlus size={14} />, color: '#794bc4', link: `/profile/${n.sender_id}`, text: 'started following you.' };
      case 'MESSAGE':
        return { icon: <MessageSquare size={14} />, color: '#0084ff', link: `/messages?userId=${n.sender_id}`, text: `sent you a message: "${n.message || 'Image'}"` };
      case 'MENTION':
        return { icon: <AtSign size={14} />, color: '#f45d22', link: `/post/${n.reference_id}`, text: 'mentioned you in a post.' };
      default:
        return { icon: <Info size={14} />, color: '#888', link: '#', text: n.message || 'interacted with you.' };
    }
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'likes', label: 'Likes' },
    { id: 'comments', label: 'Comments' },
    { id: 'friends', label: 'Friends' },
    { id: 'messages', label: 'Messages' }
  ];

  const handleNotificationClick = async (n: NotificationItem, link: string) => {
    if (!n.is_read) {
      try {
        const token = await getToken();
        await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/read/${n.id}`, {}, { headers: { Authorization: `Bearer ${token}` }});
      } catch (e) {}
    }
    navigate(link);
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.header}>
        <h1>Notifications</h1>
        <div className={styles.actions}>
          <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
            <CheckCheck size={18} /> Mark all as read
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map(t => (
          <button 
            key={t.id}
            className={`${styles.tab} ${filter === t.id ? styles.activeTab : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonText}>
                <div className={styles.skeletonLine}></div>
                <div className={`${styles.skeletonLine} ${styles.short}`}></div>
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <Bell size={48} color="var(--border-color)" />
            <h2>No notifications yet</h2>
            <p>When you get notifications, they'll show up here.</p>
          </div>
        ) : (
          notifications.map(n => {
            const details = getNotificationDetails(n.type, n);
            return (
              <div 
                key={n.id} 
                className={`${styles.notificationCard} ${n.is_read ? '' : styles.unread}`}
                onClick={() => handleNotificationClick(n, details.link)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.avatarWrapper}>
                  <img src={n.sender_avatar} alt={n.sender_name} className={styles.avatar} />
                  <div className={styles.iconBadge} style={{ backgroundColor: details.color }}>
                    {details.icon}
                  </div>
                </div>
                
                <div className={styles.content}>
                  <p className={styles.message}>
                    <strong>{n.sender_name}</strong> {details.text}
                  </p>
                  <span className={styles.time}>{formatTime(n.created_at)}</span>
                </div>

                <div className={styles.cardActions}>
                  {!n.is_read && (
                    <button className={styles.iconBtn} title="Mark as read" onClick={(e) => handleMarkRead(e, n.id)}>
                      <Check size={16} />
                    </button>
                  )}
                  <button className={styles.iconBtn} title="Delete" onClick={(e) => handleDelete(e, n.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
