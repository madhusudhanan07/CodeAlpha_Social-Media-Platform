const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const savedController = require('../controllers/savedController');

// Collections
router.get('/collections/all', verifyToken, savedController.getCollections);
router.post('/collections', verifyToken, savedController.createCollection);
router.patch('/collections/:id', verifyToken, savedController.renameCollection);
router.delete('/collections/:id', verifyToken, savedController.deleteCollection);

// Posts
router.get('/', verifyToken, savedController.getSavedPosts);
router.get('/ids', verifyToken, savedController.getSavedPostIds);
router.post('/:postId', verifyToken, savedController.savePost);
router.delete('/:postId', verifyToken, savedController.removeSavedPost);

module.exports = router;
