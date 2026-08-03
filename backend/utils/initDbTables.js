const db = require('../config/db');

async function initDbTables() {
  try {
    console.log('🔄 Checking and initializing database tables...');

    // 1. Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firebase_uid VARCHAR(128) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        bio VARCHAR(200) DEFAULT '',
        profile_picture VARCHAR(500) DEFAULT '',
        location VARCHAR(100) DEFAULT '',
        website VARCHAR(255) DEFAULT '',
        cover_photo VARCHAR(500) DEFAULT NULL,
        joined_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure extra columns on users table exist if created previously
    try {
      const [cols] = await db.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      `);
      const colNames = cols.map(c => c.COLUMN_NAME);
      if (!colNames.includes('location')) {
        await db.execute(`ALTER TABLE users ADD COLUMN location VARCHAR(100) DEFAULT ''`);
      }
      if (!colNames.includes('website')) {
        await db.execute(`ALTER TABLE users ADD COLUMN website VARCHAR(255) DEFAULT ''`);
      }
      if (!colNames.includes('cover_photo')) {
        await db.execute(`ALTER TABLE users ADD COLUMN cover_photo VARCHAR(500) DEFAULT NULL`);
      }
    } catch (e) {
      console.warn('⚠️ Non-fatal user column check error:', e.message);
    }

    // 2. Posts table
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

    // 3. Comments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // 4. Likes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // 5. Follows table
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

    // 6. Notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        sender_id VARCHAR(128) NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(128) DEFAULT NULL,
        message TEXT DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // 7. Conversations table
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

    // 8. Messages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id VARCHAR(128) NOT NULL,
        receiver_id VARCHAR(128) NOT NULL,
        message TEXT,
        image_url VARCHAR(500) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'sent',
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(firebase_uid) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    try {
      const [cols] = await db.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'
      `);
      const colNames = cols.map(c => c.COLUMN_NAME);
      if (!colNames.includes('message')) {
        await db.execute(`ALTER TABLE messages ADD COLUMN message TEXT`);
      }
      if (!colNames.includes('image_url')) {
        await db.execute(`ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) DEFAULT NULL`);
      }
      if (!colNames.includes('status')) {
        await db.execute(`ALTER TABLE messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent'`);
      }
    } catch (e) {
      console.warn('⚠️ Non-fatal messages column check error:', e.message);
    }

    // 9. Post Images table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS post_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    // 10. Friend Requests table
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

    // 11. Friends table
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

    // 12. Saved Collections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS saved_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    // 13. Saved Posts table
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

    // 14. Settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL UNIQUE,
        theme ENUM('light','dark','system') DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'en',
        font_size ENUM('small','medium','large') DEFAULT 'medium',
        privacy JSON DEFAULT NULL,
        notifications JSON DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);

    console.log('✅ All database tables verified and initialized successfully.');
  } catch (err) {
    console.error('❌ Error during database initialization:', err);
  }
}

module.exports = initDbTables;
