const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');
const followsController = require('../controllers/followsController');

// Routes for users
router.get('/search', verifyToken, searchController.searchUsers);
router.get('/suggestions', verifyToken, followsController.getSuggestions);

module.exports = router;
