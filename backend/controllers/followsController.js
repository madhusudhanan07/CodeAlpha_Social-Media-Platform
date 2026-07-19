const FollowsModel = require('../models/followsModel');

exports.toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.uid;
    const followingId = req.params.userId;
    const result = await FollowsModel.toggleFollow(followerId, followingId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error toggling follow:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = await FollowsModel.getSuggestions(req.user.uid);
    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
