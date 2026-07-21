const { initializeApp, cert } = require("firebase-admin/app");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Use environment variable in production
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Fallback for local development
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (error) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT env variable or serviceAccountKey.json");
  }
}

const app = initializeApp({
    credential: cert(serviceAccount),
});

module.exports = app;