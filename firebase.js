import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDmK2EzmZQYtLhGWHPhrNiAbYMQpsEPI",
  authDomain: "attendance-app-4cc52.firebaseapp.com",
  projectId: "attendance-app-4cc52",
  storageBucket: "attendance-app-4cc52.appspot.com",
  messagingSenderId: "862990205208",
  appId: "1:862990205208:web:f6caa206cd05c86a8a9e6d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export function getTodayKey(){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = (today.getMonth()+1).toString().padStart(2,"0");
  const dd = today.getDate().toString().padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

