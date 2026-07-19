const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const messagesController = require('../controllers/messagesController');

router.get('/conversations', verifyToken, messagesController.getConversations);
router.get('/search', verifyToken, messagesController.searchConversations);
router.get('/:conversationId', verifyToken, messagesController.getMessages);
router.post('/send', verifyToken, messagesController.sendMessage);
router.delete('/:messageId', verifyToken, messagesController.deleteMessage);
router.put('/read/:conversationId', verifyToken, messagesController.markRead);

module.exports = router;
