const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const conversationsCol = db.collection('conversations');
const usersCol = db.collection('users');

class ChatModel {
  static async getOrCreateConversation(user1, user2) {
    // Standardize order of user IDs to avoid duplicates (user1 < user2)
    const [u1, u2] = user1 < user2 ? [user1, user2] : [user2, user1];
    const convId = `${u1}_${u2}`;

    const convRef = conversationsCol.doc(convId);
    const convDoc = await convRef.get();

    if (!convDoc.exists) {
      await convRef.set({
        user1_id: u1,
        user2_id: u2,
        last_message: null,
        last_message_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp()
      });
    }

    return convId;
  }

  static async getConversations(userId) {
    // Query conversations where user is either user1 or user2
    // Firestore can't do OR on different fields, so we do two queries
    const [snap1, snap2] = await Promise.all([
      conversationsCol.where('user1_id', '==', userId).get(),
      conversationsCol.where('user2_id', '==', userId).get()
    ]);

    const allDocs = new Map();
    snap1.docs.forEach(d => allDocs.set(d.id, d));
    snap2.docs.forEach(d => allDocs.set(d.id, d));

    const conversations = await Promise.all(
      Array.from(allDocs.values())
        .filter(doc => doc.data().last_message !== null)
        .map(async (doc) => {
          const data = doc.data();
          const otherUserId = data.user1_id === userId ? data.user2_id : data.user1_id;

          const userDoc = await usersCol.doc(otherUserId).get();
          const other = userDoc.exists ? userDoc.data() : {};

          // Count unread messages
          const messagesCol = conversationsCol.doc(doc.id).collection('messages');
          const unreadSnap = await messagesCol
            .where('receiver_id', '==', userId)
            .where('is_read', '==', false)
            .count()
            .get();

          return {
            conversationId: doc.id,
            last_message: data.last_message,
            last_message_at: data.last_message_at ? data.last_message_at.toDate() : null,
            otherUserId,
            otherUsername: other.username || '',
            otherFullName: other.full_name || '',
            otherAvatar: other.profile_picture || '',
            unreadCount: unreadSnap.data().count
          };
        })
    );

    // Sort by last_message_at descending
    conversations.sort((a, b) => {
      const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
      const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
      return dateB - dateA;
    });

    return conversations;
  }

  static async getMessages(conversationId) {
    const messagesCol = conversationsCol.doc(String(conversationId)).collection('messages');
    const snapshot = await messagesCol.orderBy('created_at', 'asc').get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        content: data.content || data.message || '',
        is_read: data.is_read || false,
        created_at: data.created_at ? data.created_at.toDate() : new Date()
      };
    });
  }

  static async saveMessage(conversationId, senderId, receiverId, content) {
    const messagesCol = conversationsCol.doc(String(conversationId)).collection('messages');

    const msgData = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: content || '',
      message: content || '',
      is_read: false,
      created_at: FieldValue.serverTimestamp()
    };

    const msgRef = await messagesCol.add(msgData);

    // Update conversation last_message
    await conversationsCol.doc(String(conversationId)).update({
      last_message: content,
      last_message_at: FieldValue.serverTimestamp()
    });

    return {
      id: msgRef.id,
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: content || '',
      is_read: false,
      created_at: new Date()
    };
  }

  static async markAsRead(conversationId, userId) {
    const messagesCol = conversationsCol.doc(String(conversationId)).collection('messages');
    const snapshot = await messagesCol
      .where('receiver_id', '==', userId)
      .where('is_read', '==', false)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_read: true });
    });
    await batch.commit();
  }
}

module.exports = ChatModel;
