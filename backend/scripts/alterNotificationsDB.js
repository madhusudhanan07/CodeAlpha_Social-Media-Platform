require('dotenv').config();
const db = require('../config/db');

async function adjustNotificationsDB() {
  try {
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
    `);
    
    const columnNames = columns.map(c => c.COLUMN_NAME);

    // Change source_user_id to sender_id if it exists and sender_id does not exist
    if (columnNames.includes('source_user_id') && !columnNames.includes('sender_id')) {
       // Need to drop foreign key first
       const [fkResult] = await db.execute(`
         SELECT CONSTRAINT_NAME 
         FROM information_schema.KEY_COLUMN_USAGE 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'notifications' 
         AND COLUMN_NAME = 'source_user_id'
       `);
       if(fkResult.length > 0 && fkResult[0].CONSTRAINT_NAME) {
          await db.execute(`ALTER TABLE notifications DROP FOREIGN KEY ${fkResult[0].CONSTRAINT_NAME}`);
       }
       await db.execute(`ALTER TABLE notifications CHANGE COLUMN source_user_id sender_id VARCHAR(128) NOT NULL`);
       await db.execute(`ALTER TABLE notifications ADD FOREIGN KEY (sender_id) REFERENCES users(firebase_uid) ON DELETE CASCADE`);
    } else if (!columnNames.includes('sender_id')) {
       await db.execute(`ALTER TABLE notifications ADD COLUMN sender_id VARCHAR(128) NOT NULL`);
       await db.execute(`ALTER TABLE notifications ADD FOREIGN KEY (sender_id) REFERENCES users(firebase_uid) ON DELETE CASCADE`);
    }

    // Change post_id to reference_id
    if (columnNames.includes('post_id') && !columnNames.includes('reference_id')) {
      await db.execute(`ALTER TABLE notifications CHANGE COLUMN post_id reference_id VARCHAR(128) DEFAULT NULL`);
    } else if (!columnNames.includes('reference_id')) {
      await db.execute(`ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(128) DEFAULT NULL`);
    }

    // Add message column
    if (!columnNames.includes('message')) {
      await db.execute(`ALTER TABLE notifications ADD COLUMN message TEXT DEFAULT NULL`);
    }

    console.log("✅ Notifications table adjusted successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error altering notifications tables:", error);
    process.exit(1);
  }
}

adjustNotificationsDB();
