const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const notificationsController = require('../controllers/notificationsController');

router.get('/', verifyToken, notificationsController.getNotifications);
router.put('/read', verifyToken, notificationsController.markAsRead);

module.exports = router;
