const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const friendsController = require('../controllers/friendsController');

router.post('/request/:userId', verifyToken, friendsController.sendRequest);
router.put('/accept/:requestId', verifyToken, friendsController.acceptRequest);
router.delete('/reject/:requestId', verifyToken, friendsController.rejectRequest);
router.delete('/remove/:friendId', verifyToken, friendsController.removeFriend);
router.get('/list', verifyToken, friendsController.getFriendsList);
router.get('/requests', verifyToken, friendsController.getFriendRequests);
router.get('/suggestions', verifyToken, friendsController.getSuggestions);
router.get('/search', verifyToken, friendsController.searchFriends);

module.exports = router;
