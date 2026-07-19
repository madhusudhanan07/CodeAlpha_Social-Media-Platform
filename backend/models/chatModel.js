const db = require('../config/db');

class ChatModel {
  static async getOrCreateConversation(user1, user2) {
    // Standardize order of user IDs to avoid duplicates (user1 < user2)
    const [u1, u2] = user1 < user2 ? [user1, user2] : [user2, user1];
    
    let [rows] = await db.execute(
      `SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?`,
      [u1, u2]
    );

    if (rows.length === 0) {
      const [result] = await db.execute(
        `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`,
        [u1, u2]
      );
      return result.insertId;
    }
    return rows[0].id;
  }

  static async getConversations(userId) {
    const query = `
      SELECT 
        c.id as conversationId,
        c.last_message,
        c.last_message_at,
        u.firebase_uid as otherUserId,
        u.username as otherUsername,
        u.full_name as otherFullName,
        u.profile_picture as otherAvatar,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = FALSE) as unreadCount
      FROM conversations c
      JOIN users u ON (u.firebase_uid = c.user1_id OR u.firebase_uid = c.user2_id) AND u.firebase_uid != ?
      WHERE (c.user1_id = ? OR c.user2_id = ?) AND c.last_message IS NOT NULL
      ORDER BY c.last_message_at DESC
    `;
    const [rows] = await db.execute(query, [userId, userId, userId, userId]);
    return rows;
  }

  static async getMessages(conversationId) {
    const [rows] = await db.execute(
      `SELECT id, sender_id, receiver_id, content, is_read, created_at 
       FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return rows;
  }

  static async saveMessage(conversationId, senderId, receiverId, content) {
    const [result] = await db.execute(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)`,
      [conversationId, senderId, receiverId, content]
    );

    // Update conversation last_message
    await db.execute(
      `UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [content, conversationId]
    );

    const [newMessageRows] = await db.execute(`SELECT * FROM messages WHERE id = ?`, [result.insertId]);
    return newMessageRows[0];
  }

  static async markAsRead(conversationId, userId) {
    await db.execute(
      `UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND receiver_id = ? AND is_read = FALSE`,
      [conversationId, userId]
    );
  }
}

module.exports = ChatModel;
