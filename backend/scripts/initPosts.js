require('dotenv').config();
const db = require('../config/db');

async function createPostsTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        content VARCHAR(500) NOT NULL,
        image_url VARCHAR(500) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);
    console.log("✅ Posts table created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing posts table:", error);
    process.exit(1);
  }
}

createPostsTable();
