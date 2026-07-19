require('dotenv').config();

console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_PASSWORD =", process.env.DB_PASSWORD);
console.log("DB_NAME =", process.env.DB_NAME);

const db = require('../config/db');

async function createTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firebase_uid VARCHAR(128) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        bio VARCHAR(200) DEFAULT '',
        profile_picture VARCHAR(500) DEFAULT '',
        joined_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Users table initialized successfully.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error initializing tables:", error);
    process.exit(1);
  }
}

createTables();