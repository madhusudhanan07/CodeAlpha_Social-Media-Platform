const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost
} = require('../controllers/postsController');

// Public routes
router.get('/', getAllPosts);
router.get('/:id', getPostById);

// Protected routes
router.post('/', verifyToken, createPost);
router.put('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);

module.exports = router;