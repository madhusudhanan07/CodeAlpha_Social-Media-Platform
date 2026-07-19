const db = require('../config/db');
const NotificationsModel = require('./notificationsModel');

class LikesModel {
  static async toggleLike(postId, userId) {
    const checkQuery = `SELECT id FROM likes WHERE post_id = ? AND user_id = ?`;
    const [existing] = await db.execute(checkQuery, [postId, userId]);

    if (existing.length > 0) {
      await db.execute(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
      return { liked: false };
    } else {
      await db.execute(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, [postId, userId]);
      
      const [postRows] = await db.execute(`SELECT user_id FROM posts WHERE id = ?`, [postId]);
      if (postRows.length > 0) {
        await NotificationsModel.createNotification(postRows[0].user_id, userId, 'like', postId);
      }
      
      return { liked: true };
    }
  }

  static async getLikeCountForPost(postId) {
    const query = `SELECT COUNT(*) as count FROM likes WHERE post_id = ?`;
    const [rows] = await db.execute(query, [postId]);
    return rows[0].count;
  }
}

module.exports = LikesModel;
