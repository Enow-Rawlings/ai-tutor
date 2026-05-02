import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase Configuration
 * These environment variables should be added to your .env.local file.
 * We use process.env.NEXT_PUBLIC_* to expose them to the client-side code safely.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized already.
// This prevents multiple initializations during hot reloads in Next.js development.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth and Firestore services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
