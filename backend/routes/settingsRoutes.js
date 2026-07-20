const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const sc = require('../controllers/settingsController');

router.get('/',               verifyToken, sc.getSettings);
router.put('/profile',        verifyToken, sc.updateProfile);
router.put('/password',       verifyToken, sc.updatePassword);
router.put('/privacy',        verifyToken, sc.updatePrivacy);
router.put('/notifications',  verifyToken, sc.updateNotifications);
router.put('/theme',          verifyToken, sc.updateTheme);
router.get('/export',         verifyToken, sc.exportData);
router.delete('/account',     verifyToken, sc.deleteAccount);

module.exports = router;
