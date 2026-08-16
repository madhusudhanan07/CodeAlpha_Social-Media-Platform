const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'codealphasocial-media-platform',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else {
    serviceAccount = require("../serviceAccountKey.json");
  }
} catch (e) {
  console.error("⚠️ Firebase admin setup warning:", e.message);
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (err2) {
    console.error("❌ Failed to load serviceAccountKey.json:", err2.message);
  }
}

const app = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

// Export Firestore database instance and Admin Auth
const db = getFirestore(app);
const adminAuth = getAuth(app);

module.exports = { app, db, adminAuth };