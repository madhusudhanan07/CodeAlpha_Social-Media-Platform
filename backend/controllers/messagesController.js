const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { getIo, getConnectedUsers } = require('../config/socket');
const NotificationsModel = require('../models/notificationsModel');

const conversationsCol = db.collection('conversations');
const usersCol = db.collection('users');
const friendsCol = db.collection('friends');
const followsCol = db.collection('follows');

function getConversationDocId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Firestore can't do OR on different fields, so we do two queries
    const [snap1, snap2] = await Promise.all([
      conversationsCol.where('user1_id', '==', userId).get(),
      conversationsCol.where('user2_id', '==', userId).get()
    ]);

    const allDocs = new Map();
    snap1.docs.forEach(d => allDocs.set(d.id, d));
    snap2.docs.forEach(d => allDocs.set(d.id, d));

    const connectedUsers = getConnectedUsers && getConnectedUsers() ? getConnectedUsers() : {};

    const conversations = await Promise.all(
      Array.from(allDocs.values()).map(async (doc) => {
        const data = doc.data();
        const friendId = data.user1_id === userId ? data.user2_id : data.user1_id;

        const friendDoc = await usersCol.doc(friendId).get();
        const friend = friendDoc.exists ? friendDoc.data() : {};

        // Count unread messages
        const messagesCol = conversationsCol.doc(doc.id).collection('messages');
        const unreadSnap = await messagesCol
          .where('receiver_id', '==', userId)
          .where('status', '!=', 'read')
          .count()
          .get();

        return {
          conversationId: doc.id,
          lastMessage: data.last_message || null,
          lastMessageTime: data.last_message_at ? data.last_message_at.toDate() : null,
          friendId,
          friendUsername: friend.username || '',
          friendAvatar: friend.profile_picture || '',
          friendName: friend.full_name || '',
          unreadCount: unreadSnap.data().count,
          isOnline: !!connectedUsers[friendId]
        };
      })
    );

    // Sort by lastMessageTime descending
    conversations.sort((a, b) => {
      const dateA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
      const dateB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('getConversations error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.conversationId;

    const messagesCol = conversationsCol.doc(conversationId).collection('messages');
    const snapshot = await messagesCol.orderBy('created_at', 'asc').get();

    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        message: data.message || data.content || '',
        image: data.image_url || null,
        status: data.status || 'sent',
        time: data.created_at ? data.created_at.toDate() : new Date()
      };
    });

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('getMessages error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const { receiverId, message, image } = req.body;

    if (!receiverId || (!message && !image)) {
      return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    // Auto-sync sender & receiver to Firestore users collection
    try {
      const senderDoc = await usersCol.doc(senderId).get();
      if (!senderDoc.exists) {
        await usersCol.doc(senderId).set({
          firebase_uid: senderId,
          email: req.user.email || 'user@app.com',
          full_name: req.user.name || 'User',
          username: 'user_' + senderId.substring(0, 5),
          bio: '', profile_picture: '', cover_photo: null, location: '', website: '',
          joined_date: new Date()
        });
      }

      const recDoc = await usersCol.doc(receiverId).get();
      if (!recDoc.exists) {
        await usersCol.doc(receiverId).set({
          firebase_uid: receiverId,
          email: 'user@app.com',
          full_name: 'User',
          username: 'user_' + receiverId.substring(0, 5),
          bio: '', profile_picture: '', cover_photo: null, location: '', website: '',
          joined_date: new Date()
        });
      }
    } catch (userErr) {
      console.warn('⚠️ User sync check in sendMessage:', userErr.message);
    }

    const convDocId = getConversationDocId(senderId, receiverId);
    const convRef = conversationsCol.doc(convDocId);
    const convDoc = await convRef.get();

    // Check if conversation exists, or if users are friends/followers
    if (!convDoc.exists) {
      // Check friends
      const [fu1, fu2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
      const friendDoc = await friendsCol.doc(`${fu1}_${fu2}`).get();

      // Check follows (either direction)
      const [followDoc1, followDoc2] = await Promise.all([
        followsCol.doc(`${senderId}_${receiverId}`).get(),
        followsCol.doc(`${receiverId}_${senderId}`).get()
      ]);

      if (!friendDoc.exists && !followDoc1.exists && !followDoc2.exists) {
        return res.status(403).json({ success: false, message: 'Can only message friends or followers.' });
      }

      // Create conversation
      const [u1, u2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
      await convRef.set({
        user1_id: u1,
        user2_id: u2,
        last_message: message || 'Sent an image',
        last_message_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp()
      });
    }

    // Insert message into subcollection
    const messagesCol = convRef.collection('messages');
    const msgData = {
      sender_id: senderId,
      receiver_id: receiverId,
      message: message || '',
      content: message || '',
      image_url: image || null,
      status: 'sent',
      is_read: false,
      created_at: FieldValue.serverTimestamp()
    };

    const msgRef = await messagesCol.add(msgData);

    // Update conversation last_message
    await convRef.update({
      last_message: message || 'Sent an image',
      last_message_at: FieldValue.serverTimestamp()
    });

    const msgObj = {
      id: msgRef.id,
      conversationId: convDocId,
      senderId,
      receiverId,
      message: message || '',
      image: image || null,
      status: 'sent',
      time: new Date()
    };

    // Socket publish if user connected
    try {
      const connectedUsers = getConnectedUsers && getConnectedUsers() ? getConnectedUsers() : {};
      const io = getIo && getIo() ? getIo() : null;

      if (io) {
        const receiverSocket = connectedUsers[receiverId];
        if (receiverSocket) {
          io.to(receiverSocket).emit('receive_message', msgObj);

          // Mark as delivered immediately
          await msgRef.update({ status: 'delivered' });
          msgObj.status = 'delivered';
        } else {
          // If offline, create notification
          await NotificationsModel.createNotification(receiverId, senderId, 'MESSAGE', convDocId, message || 'Sent an image');
        }
      } else {
        await NotificationsModel.createNotification(receiverId, senderId, 'MESSAGE', convDocId, message || 'Sent an image');
      }
    } catch (notifErr) {
      console.warn('⚠️ Socket/Notification error in sendMessage:', notifErr.message);
    }

    res.status(200).json({ success: true, message: msgObj });
  } catch (error) {
    console.error('sendMessage error', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user.uid;
    const messageId = req.params.messageId;

    // We need to find which conversation this message belongs to
    // Search across conversations the user is part of
    const [snap1, snap2] = await Promise.all([
      conversationsCol.where('user1_id', '==', userId).get(),
      conversationsCol.where('user2_id', '==', userId).get()
    ]);

    const convIds = new Set();
    snap1.docs.forEach(d => convIds.add(d.id));
    snap2.docs.forEach(d => convIds.add(d.id));

    for (const convId of convIds) {
      const msgRef = conversationsCol.doc(convId).collection('messages').doc(messageId);
      const msgDoc = await msgRef.get();
      if (msgDoc.exists) {
        if (msgDoc.data().sender_id !== userId) {
          return res.status(403).json({ success: false, message: 'Only sender can delete message' });
        }
        await msgRef.delete();
        return res.status(200).json({ success: true, message: 'Deleted successfully' });
      }
    }

    return res.status(404).json({ success: false, message: 'Not found' });
  } catch (error) {
    console.error('deleteMessage error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.conversationId;

    const messagesCol = conversationsCol.doc(conversationId).collection('messages');
    
    try {
      const snapshot = await messagesCol
        .where('receiver_id', '==', userId)
        .where('is_read', '==', false)
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { is_read: true, status: 'read' });
        });
        await batch.commit();
      }
    } catch (e) {
      // Fallback: just update is_read
      const snapshot = await messagesCol
        .where('receiver_id', '==', userId)
        .where('is_read', '==', false)
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { is_read: true });
        });
        await batch.commit();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('markRead error', error);
    res.status(200).json({ success: true });
  }
};

exports.searchConversations = async (req, res) => {
  try {
    const userId = req.user.uid;
    const q = (req.query.q || '').toLowerCase();

    // Get user's conversations
    const [snap1, snap2] = await Promise.all([
      conversationsCol.where('user1_id', '==', userId).get(),
      conversationsCol.where('user2_id', '==', userId).get()
    ]);

    const allDocs = new Map();
    snap1.docs.forEach(d => allDocs.set(d.id, d));
    snap2.docs.forEach(d => allDocs.set(d.id, d));

    const conversations = [];
    for (const [, doc] of allDocs) {
      const data = doc.data();
      const friendId = data.user1_id === userId ? data.user2_id : data.user1_id;

      const friendDoc = await usersCol.doc(friendId).get();
      if (!friendDoc.exists) continue;
      const friend = friendDoc.data();

      const username = (friend.username || '').toLowerCase();
      const fullName = (friend.full_name || '').toLowerCase();

      if (username.includes(q) || fullName.includes(q)) {
        conversations.push({
          conversationId: doc.id,
          lastMessage: data.last_message || null,
          lastMessageTime: data.last_message_at ? data.last_message_at.toDate() : null,
          friendId,
          friendUsername: friend.username || '',
          friendAvatar: friend.profile_picture || '',
          friendName: friend.full_name || ''
        });
      }
    }

    // Sort by lastMessageTime descending
    conversations.sort((a, b) => {
      const dateA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
      const dateB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('searchConversations error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
