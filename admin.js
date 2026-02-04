import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================
   ADMIN LOGIN
===================== */
window.login = () => {
  const pw = document.getElementById("password").value;
  if (pw === "0317") {
    localStorage.setItem("admin", "true");
    initAdmin();
  } else {
    alert("Wrong password");
  }
};

window.logout = () => {
  localStorage.removeItem("admin");
  location.reload();
};

function initAdmin() {
  document.getElementById("login").style.display = "none";
  document.getElementById("admin").style.display = "flex";
  loadToday();
  loadHistory();
  watchToday();
}

if (localStorage.getItem("admin") === "true") {
  initAdmin();
}

/* =====================
   TODAY
===================== */
const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
const employees = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee"
];

async function loadToday() {
  const box = document.getElementById("today");
  box.innerHTML = `<h2>Today (${today})</h2>`;

  let html = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Attend</th>
          <th>Leave</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let name of employees) {
    html += `
      <tr>
        <td>${name}</td>
        <td id="attend-${name}">-</td>
        <td id="leave-${name}">-</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  box.innerHTML += html;

  // 오늘 출석 기록 초기 로딩
  const snap = await getDocs(collection(db, "attendance", today, "records"));
  snap.forEach(docSnap => {
    const r = docSnap.data();
    if (r.attendAt) document.getElementById(`attend-${docSnap.id}`).textContent = r.attendAt.toDate().toLocaleTimeString();
    if (r.leaveAt) document.getElementById(`leave-${docSnap.id}`).textContent = r.leaveAt.toDate().toLocaleTimeString();
  });
}

/* =====================
   WATCH TODAY (실시간 업데이트)
===================== */
function watchToday() {
  const col = collection(db, "attendance", today, "records");
  onSnapshot(col, snap => {
    snap.forEach(docSnap => {
      const r = docSnap.data();
      if (r.attendAt) document.getElementById(`attend-${docSnap.id}`)?.textContent = r.attendAt.toDate().toLocaleTimeString();
      if (r.leaveAt) document.getElementById(`leave-${docSnap.id}`)?.textContent = r.leaveAt.toDate().toLocaleTimeString();
    });
  });
}

/* =====================
   HISTORY
===================== */
async function loadHistory() {
  const box = document.getElementById("history");
  box.innerHTML = "<h2>History</h2>";

  const snap = await getDocs(collection(db, "attendance"));

  if (snap.empty) {
    box.innerHTML += "<p>No history found.</p>";
    return;
  }

  let html = "<ul>";
  snap.forEach(docSnap => {
    const dateId = docSnap.id;

    // 날짜 형식 체크 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateId)) return;

    html += `<li><button onclick="loadHistoryRecords('${dateId}')">📅 ${dateId}</button></li>`;
  });
  html += "</ul>";

  box.innerHTML += html;
  box.innerHTML += `<div id="history-records" style="margin-top:20px;"></div>`;
}

/* =====================
   HISTORY RECORDS
===================== */
window.loadHistoryRecords = async (dateId) => {
  const container = document.getElementById("history-records");
  container.innerHTML = `<h3>Records for ${dateId}</h3>`;

  const snap = await getDocs(collection(db, "attendance", dateId, "records"));

  if (snap.empty) {
    container.innerHTML += "<p>No attendance records.</p>";
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Attend</th>
          <th>Leave</th>
        </tr>
      </thead>
      <tbody>
  `;

  snap.forEach(docSnap => {
    const r = docSnap.data();
    html += `
      <tr>
        <td>${docSnap.id}</td>
        <td>${r.attendAt ? r.attendAt.toDate().toLocaleTimeString() : "-"}</td>
        <td>${r.leaveAt ? r.leaveAt.toDate().toLocaleTimeString() : "-"}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML += html;
};

