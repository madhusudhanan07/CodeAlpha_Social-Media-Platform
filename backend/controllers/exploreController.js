const PostsModel = require('../models/postsModel');

exports.getExplorePosts = async (req, res) => {
  try {
    const uid = req.user ? req.user.uid : null;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // We can fetch trending posts here
    const posts = await PostsModel.getTrendingPosts(uid, limit, offset);
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching explore posts:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching explore posts' });
  }
};
