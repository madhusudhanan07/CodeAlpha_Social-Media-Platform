const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

router.get('/users', verifyToken, searchController.searchUsers);

module.exports = router;
