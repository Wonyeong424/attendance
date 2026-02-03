// script.js
import { db, getTodayKey } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.Attend = async function() {
  const name = document.getElementById("nameSelect").value;
  if (!name) { alert("Please select your name."); return; }

  const todayKey = getTodayKey();
  const docRef = doc(db, "attendance", todayKey, "users", name);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists() && snapshot.data().attend) {
    alert("You have already attended today.");
    return;
  }

  await setDoc(docRef, {
    name: name,
    attend: new Date().toLocaleTimeString(),
    leave: "" // 초기값
  });

  alert("Attendance recorded!");
};

window.Leave = async function() {
  const name = document.getElementById("nameSelect").value;
  if (!name) { alert("Please select your name."); return; }

  const todayKey = getTodayKey();
  const docRef = doc(db, "attendance", todayKey, "users", name);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists() || !snapshot.data().attend) {
    alert("You have not attended yet today.");
    return;
  }

  await setDoc(docRef, {
    leave: new Date().toLocaleTimeString()
  }, { merge: true });

  alert("Leave recorded!");
};

