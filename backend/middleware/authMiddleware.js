const { getAuth } = require("firebase-admin/auth");
const db = require("../config/db");
require("../config/firebase");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized: No token provided"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);

    // Auto-sync user to MySQL to prevent Foreign Key errors
    try {
      const [existing] = await db.execute('SELECT id FROM users WHERE firebase_uid = ?', [decodedToken.uid]);
      if (existing.length === 0) {
        const email = decodedToken.email || 'no-email@unknown.com';
        const name = decodedToken.name || 'Unknown User';
        // Append part of UID to guarantee uniqueness for auto-synced users
        const username = email.split('@')[0] + '_' + decodedToken.uid.substring(0, 5);
        
        await db.execute(
          `INSERT INTO users (firebase_uid, email, full_name, username) VALUES (?, ?, ?, ?)`,
          [decodedToken.uid, email, name, username]
        );
      }
    } catch (dbError) {
      console.error("Auto-sync user error:", dbError);
    }

    console.log("✅ Firebase User:", decodedToken.uid);

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("❌ Firebase Token Error:");
    console.error(error);

    return res.status(403).json({
      message: "Unauthorized: Invalid token",
      error: error.message
    });
  }
};

module.exports = verifyToken;