const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/:postId', commentsController.getComments);
router.post('/:postId', verifyToken, commentsController.createComment);

module.exports = router;
