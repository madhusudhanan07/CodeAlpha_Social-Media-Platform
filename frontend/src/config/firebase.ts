import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const hasApiKey = !!import.meta.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key-for-load-safety",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "dummy-measurement-id",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const firebaseError = !hasApiKey
  ? "Firebase API key is missing. Please make sure VITE_FIREBASE_API_KEY is configured in your environment variables."
  : null;

export { auth, firebaseError };
export default app;
