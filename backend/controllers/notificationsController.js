const db = require('../config/db');
const { getIo, getConnectedUsers } = require('../config/socket');

// Helper function to create notification and emit socket event
exports.createNotification = async (userId, senderId, type, referenceId, message) => {
  try {
    if (userId === senderId) return; // don't notify self

    // Check for exact duplicate notification to prevent spam
    const [existing] = await db.execute(`
      SELECT id FROM notifications 
      WHERE user_id = ? AND sender_id = ? AND type = ? AND reference_id = ?
    `, [userId, senderId, type, referenceId || null]);
    
    if (existing.length > 0) return;

    const [result] = await db.execute(`
      INSERT INTO notifications (user_id, sender_id, type, reference_id, message)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, senderId, type, referenceId || null, message]);

    // Construct the notification object for socket io
    const [inserted] = await db.execute(`
      SELECT n.*, u.username as sender_username, u.full_name as sender_name, u.profile_picture as sender_avatar
      FROM notifications n
      JOIN users u ON n.sender_id = u.firebase_uid
      WHERE n.id = ?
    `, [result.insertId]);

    const notification = inserted[0];

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
    
    let query = `
      SELECT n.id, n.user_id, n.sender_id, n.type, n.reference_id, n.message, n.is_read, n.created_at,
             u.username as sender_username, u.full_name as sender_name, u.profile_picture as sender_avatar
      FROM notifications n
      JOIN users u ON n.sender_id = u.firebase_uid
      WHERE n.user_id = ?
    `;
    const params = [userId];

    if (filter) {
      if (filter === 'unread') {
        query += ` AND n.is_read = FALSE`;
      } else if (filter === 'likes') {
        query += ` AND n.type = 'LIKE'`;
      } else if (filter === 'comments') {
        query += ` AND n.type = 'COMMENT'`;
      } else if (filter === 'friends') {
        query += ` AND n.type IN ('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FOLLOW')`;
      } else if (filter === 'messages') {
        query += ` AND n.type = 'MESSAGE'`;
      }
    }

    query += ` ORDER BY n.created_at DESC LIMIT 50`;

    const [notifications] = await db.execute(query, params);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.uid;
    const [rows] = await db.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE
    `, [userId]);
    res.status(200).json({ success: true, unreadCount: rows[0].count });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;
    await db.execute(`
      UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);
    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('markRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    await db.execute(`
      UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE
    `, [userId]);
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
    await db.execute(`
      DELETE FROM notifications WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
