const db = require('../config/db');
const NotificationsModel = require('./notificationsModel');

class CommentsModel {
  static async getCommentsForPost(postId) {
    const query = `
      SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        u.firebase_uid as user_id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as userAvatar
      FROM comments c
      JOIN users u ON c.user_id = u.firebase_uid
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `;
    const [rows] = await db.execute(query, [postId]);
    return rows;
  }

  static async createComment(postId, userId, content) {
    const query = `
      INSERT INTO comments (post_id, user_id, content) 
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(query, [postId, userId, content]);
    
    // Notification for comment
    const [postRows] = await db.execute(`SELECT user_id FROM posts WHERE id = ?`, [postId]);
    if (postRows.length > 0) {
      await NotificationsModel.createNotification(postRows[0].user_id, userId, 'comment', postId);
    }
    
    // Fetch and return the newly created comment
    const getQuery = `
      SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        u.firebase_uid as user_id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as userAvatar
      FROM comments c
      JOIN users u ON c.user_id = u.firebase_uid
      WHERE c.id = ?
    `;
    const [newComment] = await db.execute(getQuery, [result.insertId]);
    return newComment[0];
  }
}

module.exports = CommentsModel;
