const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const notificationsController = require('../controllers/notificationsController');

router.get('/', verifyToken, notificationsController.getNotifications);
router.get('/unread', verifyToken, notificationsController.getUnreadCount);
router.put('/read-all', verifyToken, notificationsController.markAllRead);
router.put('/read/:id', verifyToken, notificationsController.markRead);
router.delete('/:id', verifyToken, notificationsController.deleteNotification);

module.exports = router;
