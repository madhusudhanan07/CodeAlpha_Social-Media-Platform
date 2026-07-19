require('dotenv').config();
const db = require('../config/db');

async function createFriendsTables() {
  try {
    // friend_requests table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id VARCHAR(128) NOT NULL,
        receiver_id VARCHAR(128) NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_request (sender_id, receiver_id),
        FOREIGN KEY (sender_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // friends table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user1_id VARCHAR(128) NOT NULL,
        user2_id VARCHAR(128) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_friendship (user1_id, user2_id),
        FOREIGN KEY (user1_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    console.log("✅ Friends tables created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating friends tables:", error);
    process.exit(1);
  }
}

createFriendsTables();
