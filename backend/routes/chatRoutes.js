const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

router.get('/', verifyToken, chatController.getConversations);
router.get('/:userId', verifyToken, chatController.getMessages);
router.post('/send', verifyToken, chatController.sendMessage);
router.put('/read', verifyToken, chatController.markAsRead);

module.exports = router;
