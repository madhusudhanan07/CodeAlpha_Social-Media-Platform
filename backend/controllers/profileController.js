const ProfileModel = require('../models/profileModel');

exports.getProfile = async (req, res) => {
  const firebase_uid = req.params.firebase_uid || req.user.uid;

  try {
    const profile = await ProfileModel.getProfileByUid(firebase_uid, req.user.uid);
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { uid } = req.user;
  const { full_name, username, bio, location, website } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  if (bio && bio.length > 200) {
    return res.status(400).json({ success: false, message: 'Bio cannot exceed 200 characters' });
  }

  try {
    const isTaken = await ProfileModel.findByUsername(username, uid);
    if (isTaken) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const updated = await ProfileModel.updateProfile(uid, { full_name: full_name || '', username, bio: bio || '', location: location || '', website: website || '' });
    
    if (!updated) {
       return res.status(404).json({ success: false, message: 'Profile not found to update' });
    }
    
    res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error while updating profile' });
  }
};

exports.uploadCoverPhoto = async (req, res) => {
  const { uid } = req.user;
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }

  try {
    const imagePath = `/uploads/profile/${req.file.filename}`;
    const updated = await ProfileModel.updateCoverPhoto(uid, imagePath);

    if (!updated) {
       return res.status(404).json({ success: false, message: 'Profile not found to update' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Cover photo updated successfully',
      cover_photo: imagePath
    });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({ success: false, message: 'Server error while uploading cover photo' });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  const { uid } = req.user;
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }

  try {
    // Generate the path to save in DB, e.g., /uploads/profile/filename.jpg
    // Assuming backend server is serving static files
    const imagePath = `/uploads/profile/${req.file.filename}`;
    
    const updated = await ProfileModel.updateProfilePicture(uid, imagePath);

    if (!updated) {
       return res.status(404).json({ success: false, message: 'Profile not found to update' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Profile picture updated successfully',
      profile_picture: imagePath
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ success: false, message: 'Server error while uploading profile picture' });
  }
};

const PostsModel = require('../models/postsModel');

exports.getUserPosts = async (req, res) => {
  const firebase_uid = req.query.userId || req.params.firebase_uid || req.user.uid;
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const posts = await PostsModel.getPostsByUser(firebase_uid, limit, offset);
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching user posts' });
  }
};
