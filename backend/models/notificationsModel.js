const db = require('../config/db');

class NotificationsModel {
  static async createNotification(userId, senderId, type, referenceId = null, message = null) {
    if (userId === senderId) return null; // Don't notify oneself
    
    // Check if duplicate notification exists
    const checkQuery = `
      SELECT id FROM notifications 
      WHERE user_id = ? AND sender_id = ? AND type = ? AND (reference_id = ? OR reference_id IS NULL)
    `;
    const [existing] = await db.execute(checkQuery, [userId, senderId, type, referenceId]);
    if (existing.length > 0) return null;

    const query = `
      INSERT INTO notifications (user_id, sender_id, type, reference_id, message)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [userId, senderId, type, referenceId, message]);

    // Construct the notification object for socket io
    const [inserted] = await db.execute(`
      SELECT n.*, u.username as sender_username, u.full_name as sender_name, u.profile_picture as sender_avatar
      FROM notifications n
      JOIN users u ON n.sender_id = u.firebase_uid
      WHERE n.id = ?
    `, [result.insertId]);

    const notification = inserted[0];

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

    return result.insertId;
  }

  static async getNotifications(userId) {
    const query = `
      SELECT 
        n.id, 
        n.type, 
        n.reference_id, 
        n.message,
        n.is_read, 
        n.created_at,
        u.firebase_uid as sender_id,
        u.username as sender_username,
        u.full_name as sender_name,
        u.profile_picture as sender_avatar
      FROM notifications n
      JOIN users u ON n.sender_id = u.firebase_uid
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
    const [rows] = await db.execute(query, [userId]);
    return rows;
  }

  static async markAsRead(userId) {
    const query = `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`;
    const [result] = await db.execute(query, [userId]);
    return result.affectedRows;
  }
}

module.exports = NotificationsModel;
