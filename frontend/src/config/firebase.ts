import { initializeApp, getApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";

const hasApiKey = !!import.meta.env.VITE_FIREBASE_API_KEY;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firebaseError: string | null = null;

if (!hasApiKey) {
  firebaseError =
    "Firebase API key is missing. Please make sure VITE_FIREBASE_API_KEY is configured in your environment variables (Vercel → Project Settings → Environment Variables).";
} else {
  try {
    const firebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (err: any) {
    firebaseError = `Firebase initialization failed: ${err.message || err}`;
    console.error("Firebase initialization error:", err);
  }
}

export { auth, firebaseError };
export default app;
