// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5vzQp3AIOapIZmPMX3FG4bqgqypsTeNM",
  authDomain: "billing---copy.firebaseapp.com",
  projectId: "billing---copy",
  storageBucket: "billing---copy.firebasestorage.app",
  messagingSenderId: "413569654927",
  appId: "1:413569654927:web:94448eab84f17482ec10fa",
  measurementId: "G-FDR3KH55M8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;