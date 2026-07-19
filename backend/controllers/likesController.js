const LikesModel = require('../models/likesModel');

exports.toggleLike = async (req, res) => {
  const { postId } = req.params;
  const { uid } = req.user;

  try {
    const { liked } = await LikesModel.toggleLike(postId, uid);
    res.status(200).json({ success: true, liked });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not toggle like' });
  }
};
