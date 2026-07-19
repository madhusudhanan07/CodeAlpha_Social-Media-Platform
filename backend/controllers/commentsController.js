const CommentsModel = require('../models/commentsModel');

exports.getComments = async (req, res) => {
  const { postId } = req.params;
  
  try {
    const comments = await CommentsModel.getCommentsForPost(postId);
    res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not fetch comments' });
  }
};

exports.createComment = async (req, res) => {
  const { postId } = req.params;
  const { uid } = req.user;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty' });
  }

  try {
    const newComment = await CommentsModel.createComment(postId, uid, content.trim());
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, message: 'Database Error: Could not create comment' });
  }
};
