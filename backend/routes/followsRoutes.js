const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const followsController = require('../controllers/followsController');

router.get('/suggestions', verifyToken, followsController.getSuggestions);
router.post('/:userId', verifyToken, followsController.toggleFollow);
router.delete('/:userId', verifyToken, followsController.toggleFollow);

module.exports = router;
