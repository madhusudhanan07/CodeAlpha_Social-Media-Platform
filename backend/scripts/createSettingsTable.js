require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function run() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      VARCHAR(128) NOT NULL UNIQUE,
        theme        ENUM('light','dark','system') DEFAULT 'system',
        language     VARCHAR(10)  DEFAULT 'en',
        font_size    ENUM('small','medium','large') DEFAULT 'medium',
        privacy      JSON         DEFAULT NULL,
        notifications JSON        DEFAULT NULL,
        created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(firebase_uid) ON DELETE CASCADE
      )
    `);
    console.log('✅ settings table ready');
    process.exit(0);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
}
run();
