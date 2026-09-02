// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFDYjKQUa0mk31KeODE1QfSYqo9hGEvYI",
  authDomain: "porprov-koni-solo.firebaseapp.com",
  projectId: "porprov-koni-solo",
  storageBucket: "porprov-koni-solo.firebasestorage.app",
  messagingSenderId: "133873959965",
  appId: "1:133873959965:web:444f4dc9dd196e188232f4",
  measurementId: "G-E7ZVZXYCEQ"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
const auth = getAuth(app);

// Enable offline persistence only in browser environment
let db: ReturnType<typeof getFirestore>;

if (typeof window !== "undefined") {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} else {
  db = getFirestore(app);
}

export { app, auth, db, firebaseConfig };
