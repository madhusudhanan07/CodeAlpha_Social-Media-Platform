const db = require('../config/db');

class NotificationsModel {
  static async createNotification(userId, sourceUserId, type, postId = null) {
    if (userId === sourceUserId) return null; // Don't notify oneself
    
    // Check if duplicate notification exists (e.g. liking same post or following again)
    const checkQuery = `
      SELECT id FROM notifications 
      WHERE user_id = ? AND source_user_id = ? AND type = ? AND (post_id = ? OR post_id IS NULL)
    `;
    const [existing] = await db.execute(checkQuery, [userId, sourceUserId, type, postId]);
    if (existing.length > 0) return null;

    const query = `
      INSERT INTO notifications (user_id, source_user_id, type, post_id)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [userId, sourceUserId, type, postId]);
    return result.insertId;
  }

  static async getNotifications(userId) {
    const query = `
      SELECT 
        n.id, 
        n.type, 
        n.post_id, 
        n.is_read, 
        n.created_at,
        u.firebase_uid as source_user_id,
        u.username,
        u.full_name as displayName,
        u.profile_picture as userAvatar
      FROM notifications n
      JOIN users u ON n.source_user_id = u.firebase_uid
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
