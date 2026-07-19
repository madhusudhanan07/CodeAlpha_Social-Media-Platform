const PostsModel = require('../models/postsModel');

exports.createPost = async (req, res) => {
  const { uid } = req.user;
  const { content, image_url, images } = req.body;

  if ((!content || content.trim() === '') && (!images || images.length === 0)) {
    return res.status(400).json({ success: false, message: 'Post content or image cannot be empty' });
  }

  if (content && content.length > 500) {
    return res.status(400).json({ success: false, message: 'Post cannot exceed 500 characters' });
  }

  try {
    const newPost = await PostsModel.createPost(uid, content ? content.trim() : '', image_url, images);
    res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not create post' });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const uid = req.user ? req.user.uid : null;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const posts = await PostsModel.getAllPosts(uid, limit, offset);
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not fetch posts' });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const uid = req.user ? req.user.uid : null;
    const post = await PostsModel.getPostById(req.params.id, uid);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not fetch post' });
  }
};

exports.updatePost = async (req, res) => {
  const { uid } = req.user;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ success: false, message: 'Post content cannot be empty' });
  }
  
  if (content.length > 500) {
    return res.status(400).json({ success: false, message: 'Post cannot exceed 500 characters' });
  }

  try {
    const updatedPost = await PostsModel.updatePost(req.params.id, uid, content.trim());
    if (!updatedPost) return res.status(403).json({ success: false, message: 'Unauthorized or post not found' });
    res.status(200).json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not update post' });
  }
};

exports.deletePost = async (req, res) => {
  const { uid } = req.user;
  
  try {
    const success = await PostsModel.deletePost(req.params.id, uid);
    if (!success) return res.status(403).json({ success: false, message: 'Unauthorized or post not found' });
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not delete post' });
  }
};
