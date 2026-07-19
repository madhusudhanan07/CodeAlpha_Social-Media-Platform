require('dotenv').config();
const db = require('../config/db');

async function adjustDB() {
  try {
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'
    `);
    
    const columnNames = columns.map(c => c.COLUMN_NAME);

    if (!columnNames.includes('image_url')) {
      await db.execute(`
        ALTER TABLE messages ADD COLUMN image_url VARCHAR(255) DEFAULT NULL
      `);
    }

    if (!columnNames.includes('message') && columnNames.includes('content')) {
      await db.execute(`
        ALTER TABLE messages CHANGE COLUMN content message TEXT
      `);
    } else if (!columnNames.includes('message')) {
      await db.execute(`
        ALTER TABLE messages ADD COLUMN message TEXT
      `);
    }

    if (!columnNames.includes('status')) {
      await db.execute(`
        ALTER TABLE messages ADD COLUMN status ENUM('sent', 'delivered', 'read') DEFAULT 'sent'
      `);
    }

    console.log("✅ Messages table updated successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error altering tables:", error);
    process.exit(1);
  }
}

adjustDB();
