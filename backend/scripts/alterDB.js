require('dotenv').config();
const db = require('../config/db');

async function alterTables() {
  try {
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    
    const columnNames = columns.map(c => c.COLUMN_NAME);

    if (!columnNames.includes('location')) {
      await db.execute(`
        ALTER TABLE users
        ADD COLUMN location VARCHAR(100) DEFAULT ''
      `);
    }

    if (!columnNames.includes('website')) {
      await db.execute(`
        ALTER TABLE users
        ADD COLUMN website VARCHAR(255) DEFAULT ''
      `);
    }

    if (!columnNames.includes('cover_photo')) {
      await db.execute(`
        ALTER TABLE users
        ADD COLUMN cover_photo VARCHAR(255) DEFAULT NULL
      `);
    }

    // Ensure follows table exists for profile statistics
    await db.execute(`
      CREATE TABLE IF NOT EXISTS follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id VARCHAR(128) NOT NULL,
        following_id VARCHAR(128) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // Ensure notifications table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        source_user_id VARCHAR(128) NOT NULL,
        type VARCHAR(20) NOT NULL,
        post_id INT DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (source_user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // Ensure conversations table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user1_id VARCHAR(128) NOT NULL,
        user2_id VARCHAR(128) NOT NULL,
        last_message TEXT,
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_users (user1_id, user2_id),
        FOREIGN KEY (user1_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // Ensure messages table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id VARCHAR(128) NOT NULL,
        receiver_id VARCHAR(128) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // Ensure post_images table exists for multi-image uploads
    await db.execute(`
      CREATE TABLE IF NOT EXISTS post_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ Tables altered/created seamlessly.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error altering tables:", error);
    process.exit(1);
  }
}

alterTables();
