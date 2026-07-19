const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/authMiddleware');
const { getProfile, updateProfile, uploadProfilePicture, getUserPosts } = require('../controllers/profileController');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profile');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.uid + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer Upload Configuration
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  }
});

router.get('/posts', verifyToken, getUserPosts);
router.get('/', verifyToken, getProfile); // get own profile
router.get('/:firebase_uid', verifyToken, getProfile);
router.put('/', verifyToken, updateProfile); 
router.put('/update', verifyToken, updateProfile); // backward compatibility
router.post('/upload', verifyToken, upload.single('profile_picture'), uploadProfilePicture);

module.exports = router;
