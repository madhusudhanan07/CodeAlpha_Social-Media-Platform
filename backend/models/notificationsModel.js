const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const notificationsCol = db.collection('notifications');
const usersCol = db.collection('users');

class NotificationsModel {
  static async createNotification(userId, senderId, type, referenceId = null, message = null) {
    if (userId === senderId) return null; // Don't notify oneself

    // Check if duplicate notification exists
    let query = notificationsCol
      .where('user_id', '==', userId)
      .where('sender_id', '==', senderId)
      .where('type', '==', type);

    if (referenceId) {
      query = query.where('reference_id', '==', String(referenceId));
    }

    const existingSnap = await query.limit(1).get();
    if (!existingSnap.empty) return null;

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
    const userDoc = await usersCol.doc(senderId).get();
    const sender = userDoc.exists ? userDoc.data() : {};

    const notification = {
      id: notifRef.id,
      ...notifData,
      created_at: new Date(),
      sender_username: sender.username || '',
      sender_name: sender.full_name || '',
      sender_avatar: sender.profile_picture || ''
    };

    // Emit Socket
    const { getIo, getConnectedUsers } = require('../config/socket');
    const connectedUsers = getConnectedUsers && getConnectedUsers() ? getConnectedUsers() : {};
    const io = getIo && getIo() ? getIo() : null;
    if (io) {
      const receiverSocket = connectedUsers[userId];
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_notification', notification);
      }
    }

    return notifRef.id;
  }

  static async getNotifications(userId) {
    const snapshot = await notificationsCol
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const notifications = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const senderDoc = await usersCol.doc(data.sender_id).get();
        const sender = senderDoc.exists ? senderDoc.data() : {};

        return {
          id: doc.id,
          type: data.type,
          reference_id: data.reference_id || null,
          message: data.message || null,
          is_read: data.is_read || false,
          created_at: data.created_at ? data.created_at.toDate() : new Date(),
          sender_id: data.sender_id,
          sender_username: sender.username || '',
          sender_name: sender.full_name || '',
          sender_avatar: sender.profile_picture || ''
        };
      })
    );

    return notifications;
  }

  static async markAsRead(userId) {
    const snapshot = await notificationsCol
      .where('user_id', '==', userId)
      .where('is_read', '==', false)
      .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_read: true });
    });
    await batch.commit();

    return snapshot.docs.length;
  }
}

module.exports = NotificationsModel;
