require('dotenv').config();
const db = require('../config/db');

async function adjustSavedDB() {
  try {
    // Create saved_collections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS saved_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // Create saved_posts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS saved_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        post_id INT NOT NULL,
        collection_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_saved (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (collection_id) REFERENCES saved_collections(id) ON DELETE SET NULL
      )
    `);

    console.log("✅ Saved tables created successfully.");
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log("✅ Saved tables and indexes already exist.");
      process.exit(0);
    }
    console.error("❌ Error altering saved tables:", error);
    process.exit(1);
  }
}

adjustSavedDB();
