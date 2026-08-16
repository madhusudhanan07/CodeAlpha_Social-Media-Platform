const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { getIo, getConnectedUsers } = require('../config/socket');

const notificationsCol = db.collection('notifications');
const usersCol = db.collection('users');

// Helper function to create notification and emit socket event
exports.createNotification = async (userId, senderId, type, referenceId, message) => {
  try {
    if (userId === senderId) return; // don't notify self

    // Check for exact duplicate notification to prevent spam
    let query = notificationsCol
      .where('user_id', '==', userId)
      .where('sender_id', '==', senderId)
      .where('type', '==', type);

    if (referenceId) {
      query = query.where('reference_id', '==', String(referenceId));
    }

    const existingSnap = await query.limit(1).get();
    if (!existingSnap.empty) return;

    const notifData = {
      user_id: userId,
      sender_id: senderId,
      type,
      reference_id: referenceId ? String(referenceId) : null,
      message: message || null,
      is_read: false,
      created_at: FieldValue.serverTimestamp()
    };

    const notifRef = await notificationsCol.add(notifData);

    // Construct the notification object for socket io
    const senderDoc = await usersCol.doc(senderId).get();
    const sender = senderDoc.exists ? senderDoc.data() : {};

    const notification = {
      id: notifRef.id,
      ...notifData,
      created_at: new Date(),
      sender_username: sender.username || '',
      sender_name: sender.full_name || '',
      sender_avatar: sender.profile_picture || ''
    };

    // Emit Socket
    const connectedUsers = getConnectedUsers && getConnectedUsers() ? getConnectedUsers() : {};
    const io = getIo && getIo() ? getIo() : null;
    if (io) {
      const receiverSocket = connectedUsers[userId];
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_notification', notification);
      }
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { filter } = req.query; // all, unread, likes, comments, friends, messages

    let query = notificationsCol.where('user_id', '==', userId);

    if (filter) {
      if (filter === 'unread') {
        query = query.where('is_read', '==', false);
      } else if (filter === 'likes') {
        query = query.where('type', '==', 'LIKE');
      } else if (filter === 'comments') {
        query = query.where('type', '==', 'COMMENT');
      } else if (filter === 'friends') {
        query = query.where('type', 'in', ['FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FOLLOW']);
      } else if (filter === 'messages') {
        query = query.where('type', '==', 'MESSAGE');
      }
    }

    // query = query.orderBy('created_at', 'desc').limit(50); // Removed to avoid composite index

    const snapshot = await query.get();

    // Sort in memory and then apply limit
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const dateA = a.data().created_at?.toDate() || new Date(0);
      const dateB = b.data().created_at?.toDate() || new Date(0);
      return dateB - dateA;
    }).slice(0, 50);

    const notifications = await Promise.all(
      sortedDocs.map(async (doc) => {
        const data = doc.data();
        const senderDoc = await usersCol.doc(data.sender_id).get();
        const sender = senderDoc.exists ? senderDoc.data() : {};

        return {
          id: doc.id,
          user_id: data.user_id,
          sender_id: data.sender_id,
          type: data.type,
          reference_id: data.reference_id || null,
          message: data.message || null,
          is_read: data.is_read || false,
          created_at: data.created_at ? data.created_at.toDate() : new Date(),
          sender_username: sender.username || '',
          sender_name: sender.full_name || '',
          sender_avatar: sender.profile_picture || ''
        };
      })
    );

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await notificationsCol
      .where('user_id', '==', userId)
      .where('is_read', '==', false)
      .count()
      .get();
    res.status(200).json({ success: true, unreadCount: snapshot.data().count });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;
    
    const notifRef = notificationsCol.doc(notificationId);
    const notifDoc = await notifRef.get();
    
    if (notifDoc.exists && notifDoc.data().user_id === userId) {
      await notifRef.update({ is_read: true });
    }
    
    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('markRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await notificationsCol
      .where('user_id', '==', userId)
      .where('is_read', '==', false)
      .get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { is_read: true });
      });
      await batch.commit();
    }

    res.status(200).json({ success: true, message: 'All marked as read' });
  } catch (error) {
    console.error('markAllRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;
    
    const notifRef = notificationsCol.doc(notificationId);
    const notifDoc = await notifRef.get();
    
    if (notifDoc.exists && notifDoc.data().user_id === userId) {
      await notifRef.delete();
    }
    
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
