require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function createSavedTables() {
  try {
    // 1. saved_collections table (must exist BEFORE saved_posts references it)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS saved_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);
    console.log('✅ saved_collections table ready');

    // 2. saved_posts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS saved_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        post_id INT NOT NULL,
        collection_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_save (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (collection_id) REFERENCES saved_collections(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ saved_posts table ready');

    console.log('🎉 All saved tables initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating saved tables:', error.message);
    process.exit(1);
  }
}

createSavedTables();
