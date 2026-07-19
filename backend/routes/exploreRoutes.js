const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const exploreController = require('../controllers/exploreController');

router.get('/posts', verifyToken, exploreController.getExplorePosts);

module.exports = router;
