import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBDmK2EzmZQYtLhGWHPhrNiAbYMQpsEPI",
  authDomain: "attendance-app-4cc52.firebaseapp.com",
  projectId: "attendance-app-4cc52",
  storageBucket: "attendance-app-4cc52.firebasestorage.app",
  messagingSenderId: "862990205208",
  appId: "1:862990205208:web:f6caa206cd05c86a8a9e6d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 오늘 키 YYYY-MM-DD
export function getTodayKey() {
  return new Date().toISOString().slice(0,10);
}

