const { getAuth } = require("firebase-admin/auth");
const { db } = require("../config/firebase");
require("../config/firebase");

const usersCol = db.collection('users');

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

    // Auto-sync user to Firestore to prevent missing-user errors
    try {
      const userRef = usersCol.doc(decodedToken.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        const email = decodedToken.email || 'no-email@unknown.com';
        const name = decodedToken.name || 'Unknown User';
        // Append part of UID to guarantee uniqueness for auto-synced users
        const username = email.split('@')[0] + '_' + decodedToken.uid.substring(0, 5);

        await userRef.set({
          firebase_uid: decodedToken.uid,
          email,
          full_name: name,
          username,
          bio: '',
          profile_picture: '',
          cover_photo: null,
          location: '',
          website: '',
          joined_date: new Date()
        });
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