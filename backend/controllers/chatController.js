const ChatModel = require('../models/chatModel');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversations = await ChatModel.getConversations(userId);
    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.uid;
    const otherUserId = req.params.userId;

    const conversationId = await ChatModel.getOrCreateConversation(userId, otherUserId);
    const messages = await ChatModel.getMessages(conversationId);

    res.status(200).json({ success: true, conversationId, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'Receiver ID and content are required' });
    }

    const conversationId = await ChatModel.getOrCreateConversation(senderId, receiverId);
    const newMessage = await ChatModel.saveMessage(conversationId, senderId, receiverId, content);

    // Normally Socket.io will broadcast this, but the REST response is handy for the sender.
    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID required' });
    }

    await ChatModel.markAsRead(conversationId, userId);
    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
