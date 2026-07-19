const db = require('../config/db');
const { getIo, getConnectedUsers } = require('../config/socket');

function getConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.uid;

    const query = `
      SELECT 
        c.id as conversationId,
        c.last_message as lastMessage,
        c.last_message_at as lastMessageTime,
        u.firebase_uid as friendId,
        u.username as friendUsername,
        u.profile_picture as friendAvatar,
        u.full_name as friendName,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          AND m.receiver_id = ? 
          AND m.status != 'read'
        ) as unreadCount
      FROM conversations c
      JOIN users u ON (u.firebase_uid = c.user1_id OR u.firebase_uid = c.user2_id)
      WHERE (c.user1_id = ? OR c.user2_id = ?) AND u.firebase_uid != ?
      ORDER BY c.last_message_at DESC
    `;
    const [conversations] = await db.execute(query, [userId, userId, userId, userId]);
    
    // Attach online status
    const connectedUsers = getConnectedUsers && getConnectedUsers() ? getConnectedUsers() : {};
    
    const mapped = conversations.map(c => ({
      ...c,
      isOnline: !!connectedUsers[c.friendId]
    }));

    res.status(200).json({ success: true, conversations: mapped });
  } catch (error) {
    console.error('getConversations error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.conversationId;

    const [messages] = await db.execute(`
      SELECT 
        id, 
        conversation_id as conversationId,
        sender_id as senderId,
        receiver_id as receiverId,
        message,
        image_url as image,
        status,
        created_at as time
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [conversationId]);

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

    // Must be friends
    const [friends] = await db.execute(`
      SELECT * FROM friends 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `, [senderId, receiverId, receiverId, senderId]);

    if (friends.length === 0) {
      return res.status(403).json({ success: false, message: 'Can only message accepted friends.' });
    }

    let conversationId = null;

    // First check or create conversation
    const [existingConv] = await db.execute(`
      SELECT id FROM conversations
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `, [senderId, receiverId, receiverId, senderId]);

    if (existingConv.length > 0) {
      conversationId = existingConv[0].id;
    } else {
      const [newConv] = await db.execute(`
        INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at) 
        VALUES (?, ?, ?, NOW())
      `, [senderId, receiverId, message || 'Sent an image']);
      conversationId = newConv.insertId;
    }

    // Insert message
    const [newMsg] = await db.execute(`
      INSERT INTO messages (conversation_id, sender_id, receiver_id, message, image_url, status)
      VALUES (?, ?, ?, ?, ?, 'sent')
    `, [conversationId, senderId, receiverId, message || '', image || null]);

    // Update conversation
    await db.execute(`
      UPDATE conversations 
      SET last_message = ?, last_message_at = NOW() 
      WHERE id = ?
    `, [message || 'Sent an image', conversationId]);

    const msgObj = {
      id: newMsg.insertId,
      conversationId,
      senderId,
      receiverId,
      message: message || '',
      image: image || null,
      status: 'sent',
      time: new Date()
    };

    // Socket publish if user connected
    const connectedUsers = getConnectedUsers && getConnectedUsers() ? getConnectedUsers() : {};
    const io = getIo && getIo() ? getIo() : null;

    if (io) {
       const receiverSocket = connectedUsers[receiverId];
       if (receiverSocket) {
          io.to(receiverSocket).emit('receive_message', msgObj);
          
          // Mark as delivered immediately
          await db.execute(`UPDATE messages SET status = 'delivered' WHERE id = ?`, [msgObj.id]);
          msgObj.status = 'delivered';
       }
    }

    res.status(200).json({ success: true, message: msgObj });
  } catch (error) {
    console.error('sendMessage error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user.uid;
    const messageId = req.params.messageId;

    const [msgs] = await db.execute(`SELECT sender_id FROM messages WHERE id = ?`, [messageId]);
    if (msgs.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    if (msgs[0].sender_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only sender can delete message' });
    }

    await db.execute(`DELETE FROM messages WHERE id = ?`, [messageId]);

    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('deleteMessage error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.conversationId;

    await db.execute(`
      UPDATE messages 
      SET status = 'read' 
      WHERE conversation_id = ? AND receiver_id = ? AND status != 'read'
    `, [conversationId, userId]);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('markRead error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.searchConversations = async (req, res) => {
  try {
    const userId = req.user.uid;
    const q = req.query.q || '';

    const query = `
      SELECT 
        c.id as conversationId,
        c.last_message as lastMessage,
        c.last_message_at as lastMessageTime,
        u.firebase_uid as friendId,
        u.username as friendUsername,
        u.profile_picture as friendAvatar,
        u.full_name as friendName
      FROM conversations c
      JOIN users u ON (u.firebase_uid = c.user1_id OR u.firebase_uid = c.user2_id)
      WHERE (c.user1_id = ? OR c.user2_id = ?) 
      AND u.firebase_uid != ?
      AND (u.username LIKE ? OR u.full_name LIKE ?)
      ORDER BY c.last_message_at DESC
    `;
    const [conversations] = await db.execute(query, [userId, userId, userId, `%${q}%`, `%${q}%`]);
    
    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('searchConversations error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
