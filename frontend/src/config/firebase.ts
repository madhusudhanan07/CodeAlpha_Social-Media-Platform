import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1Ux2132wL9Ttkv4_VSV_udBZvfALeXdA",
  authDomain: "codealphasocial-media-platform.firebaseapp.com",
  projectId: "codealphasocial-media-platform",
  storageBucket: "codealphasocial-media-platform.firebasestorage.app",
  messagingSenderId: "14179781922",
  appId: "1:14179781922:web:c4825b51ab54807e0ea97b",
  measurementId: "G-JEL1KQFX9H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;