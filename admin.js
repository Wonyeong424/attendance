import { db } from "./firebase.js";
import {
  collection,
  getDocs
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
}

if (localStorage.getItem("admin") === "true") {
  initAdmin();
}

/* =====================
   TODAY
===================== */
const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

async function loadToday() {
  const box = document.getElementById("today");
  box.innerHTML = `<h2>Today (${today})</h2>`;

  const snap = await getDocs(
    collection(db, "attendance", today, "records")
  );

  if (snap.empty) {
    box.innerHTML += "<p>No attendance records.</p>";
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
  box.innerHTML += html;
}

/* =====================
   HISTORY
===================== */
async function loadHistory() {
  const box = document.getElementById("history");
  box.innerHTML = "<h2>History</h2>";

  const snap = await getDocs(collection(db, "attendance"));

  snap.forEach(d => {
    // 날짜 형식(YYYY-MM-DD)만 표시
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.id)) return;

    box.innerHTML += `<p>📅 ${d.id}</p>`;
  });
}

