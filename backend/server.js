const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== Routes ====================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/usersRoutes');
const postRoutes = require('./routes/postsRoutes');
const commentRoutes = require('./routes/commentsRoutes');
const likeRoutes = require('./routes/likesRoutes');
const followRoutes = require('./routes/followsRoutes');
const profileRoutes = require('./routes/profileRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const searchRoutes = require('./routes/searchRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);

// ==================== Health Check ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CodeAlpha Social Media Backend is Running 🚀',
  });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test MySQL Connection
    const connection = await db.getConnection();
    console.log('✅ MySQL Connected Successfully');
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MySQL');
    console.error(err.message);
    process.exit(1);
  }
}

startServer();