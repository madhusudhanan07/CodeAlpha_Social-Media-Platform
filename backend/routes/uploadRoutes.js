const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/authMiddleware');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

function getFullUrl(req, filename) {
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/uploads/${filename}`;
}

// Single media upload at root POST /api/upload
router.post('/', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fullUrl = getFullUrl(req, req.file.filename);
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, url: fullUrl, imageUrl: fullUrl, relativeUrl });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Single media upload at POST /api/upload/single
router.post('/single', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fullUrl = getFullUrl(req, req.file.filename);
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, url: fullUrl, imageUrl: fullUrl, relativeUrl });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Multi media upload at POST /api/upload/multiple
router.post('/multiple', verifyToken, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const urls = req.files.map(file => getFullUrl(req, file.filename));
    res.status(200).json({ success: true, urls });
  } catch (error) {
    console.error('Multi Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
