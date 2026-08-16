const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize Firebase (Firestore + Auth)
const { db, adminAuth } = require('./config/firebase');

const app = express();

// Enable Global CORS Headers for all origins (Vercel, Localhost, etc.)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

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
const messagesRoutes = require('./routes/messagesRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const exploreRoutes = require('./routes/exploreRoutes');
const friendsRoutes = require('./routes/friendsRoutes');
const savedRoutes = require('./routes/savedRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/settings', settingsRoutes);

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
  // Verify Firestore connection (non-fatal — server starts regardless)
  console.log('🔄 Connecting to Firebase Firestore...');
  try {
    await db.listCollections();
    console.log('✅ Firebase Firestore Connected Successfully');
  } catch (err) {
    console.warn('⚠️ Firebase Firestore connection check failed:', err.message);
    console.warn('   The server will start, but API calls may fail if credentials are invalid.');
    console.warn('   If you see UNAUTHENTICATED errors, regenerate your serviceAccountKey.json from Firebase Console.');
  }

  const http = require('http');
  const { initSocket } = require('./config/socket');
  
  // Create HTTP server manually so Socket.io can attach to it
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
  });
}

startServer();