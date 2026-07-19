const db = require('../config/db');
const NotificationsModel = require('../models/notificationsModel');

exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const receiverId = req.params.userId;

    if (senderId === receiverId) {
      return res.status(400).json({ success: false, message: 'Cannot send request to yourself.' });
    }

    // Check if friends already
    const [existingFriends] = await db.execute(`
      SELECT * FROM friends 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `, [senderId, receiverId, receiverId, senderId]);

    if (existingFriends.length > 0) {
      return res.status(400).json({ success: false, message: 'Already friends.' });
    }

    // Check existing request
    const [existingReq] = await db.execute(`
      SELECT * FROM friend_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `, [senderId, receiverId, receiverId, senderId]);

    if (existingReq.length > 0) {
      return res.status(400).json({ success: false, message: 'Request already exists.' });
    }

    await db.execute(`
      INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)
    `, [senderId, receiverId]);

    await NotificationsModel.createNotification(receiverId, senderId, 'FRIEND_REQUEST');

    res.status(200).json({ success: true, message: 'Friend request sent.' });
  } catch (error) {
    console.error('sendRequest error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const requestId = req.params.requestId;

    const [requests] = await db.execute(`
      SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `, [requestId, userId]);

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or already processed.' });
    }

    const senderId = requests[0].sender_id;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(`
        UPDATE friend_requests SET status = 'accepted' WHERE id = ?
      `, [requestId]);

      await connection.execute(`
        INSERT INTO friends (user1_id, user2_id) VALUES (?, ?)
      `, [senderId, userId]);

      await connection.commit();
      connection.release();

      await NotificationsModel.createNotification(senderId, userId, 'FRIEND_ACCEPTED');

      res.status(200).json({ success: true, message: 'Request accepted.' });
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  } catch (error) {
    console.error('acceptRequest error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const requestId = req.params.requestId;

    await db.execute(`
      DELETE FROM friend_requests WHERE id = ? AND receiver_id = ?
    `, [requestId, userId]);

    res.status(200).json({ success: true, message: 'Request rejected/removed.' });
  } catch (error) {
    console.error('rejectRequest error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.uid;
    const friendId = req.params.friendId;

    await db.execute(`
      DELETE FROM friends 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `, [userId, friendId, friendId, userId]);

    // Also delete any existing requests between them to clean up state
    await db.execute(`
      DELETE FROM friend_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `, [userId, friendId, friendId, userId]);

    res.status(200).json({ success: true, message: 'Friend removed.' });
  } catch (error) {
    console.error('removeFriend error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFriendsList = async (req, res) => {
  try {
    const userId = req.user.uid;

    const [friends] = await db.execute(`
      SELECT 
        u.firebase_uid as id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as avatar, 
        (
          SELECT COUNT(*) 
          FROM friends f1 
          JOIN friends f2 ON 
            (f1.user1_id = u.firebase_uid AND f2.user1_id = ? AND f1.user2_id = f2.user2_id) OR
            (f1.user1_id = u.firebase_uid AND f2.user2_id = ? AND f1.user2_id = f2.user1_id) OR
            (f1.user2_id = u.firebase_uid AND f2.user1_id = ? AND f1.user1_id = f2.user2_id) OR
            (f1.user2_id = u.firebase_uid AND f2.user2_id = ? AND f1.user1_id = f2.user1_id)
        ) as mutualFriends
      FROM friends f
      JOIN users u ON (u.firebase_uid = f.user1_id OR u.firebase_uid = f.user2_id)
      WHERE (f.user1_id = ? OR f.user2_id = ?) AND u.firebase_uid != ?
    `, [userId, userId, userId, userId, userId, userId, userId]);

    res.status(200).json({ success: true, friends });
  } catch (error) {
    console.error('getFriendsList error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.uid;

    const [requests] = await db.execute(`
      SELECT 
        fr.id as requestId, 
        u.firebase_uid as senderId, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as avatar
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.firebase_uid
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
    `, [userId]);

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('getFriendRequests error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get suggestions: users not already friends, and no pending requests
    const [suggestions] = await db.execute(`
      SELECT u.firebase_uid as id, u.username, u.full_name as displayName, u.profile_picture as avatar
      FROM users u
      WHERE u.firebase_uid != ?
      AND u.firebase_uid NOT IN (
        SELECT user1_id FROM friends WHERE user2_id = ?
        UNION
        SELECT user2_id FROM friends WHERE user1_id = ?
      )
      AND u.firebase_uid NOT IN (
        SELECT receiver_id FROM friend_requests WHERE sender_id = ?
        UNION
        SELECT sender_id FROM friend_requests WHERE receiver_id = ?
      )
      LIMIT 10
    `, [userId, userId, userId, userId, userId]);

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error('getSuggestions error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.searchFriends = async (req, res) => {
  try {
    const userId = req.user.uid;
    const q = req.query.q || '';

    // Search only within my friends
    const [friends] = await db.execute(`
      SELECT 
        u.firebase_uid as id, 
        u.username, 
        u.full_name as displayName, 
        u.profile_picture as avatar
      FROM friends f
      JOIN users u ON (u.firebase_uid = f.user1_id OR u.firebase_uid = f.user2_id)
      WHERE (f.user1_id = ? OR f.user2_id = ?) 
      AND u.firebase_uid != ?
      AND (u.username LIKE ? OR u.full_name LIKE ?)
    `, [userId, userId, userId, `%${q}%`, `%${q}%`]);

    res.status(200).json({ success: true, friends });
  } catch (error) {
    console.error('searchFriends error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
