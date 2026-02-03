// firebase.js
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

// 인도 시간 기준 오늘 날짜 (YYYY-MM-DD)
export function getTodayKey() {
    const now = new Date();
  
    // UTC 시간으로 변환 후 +5:30 (IST)
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utc + 5.5 * 60 * 60 * 1000);
  
    // 년, 월, 일 직접 가져오기
    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, "0"); // 월은 0부터 시작
    const day = String(istTime.getDate()).padStart(2, "0");
  
    return `${year}-${month}-${day}`;
  }
  
  

