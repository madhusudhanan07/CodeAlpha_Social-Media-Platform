const express = require('express');
const router = express.Router();
const likesController = require('../controllers/likesController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/:postId', verifyToken, likesController.toggleLike);

module.exports = router;
