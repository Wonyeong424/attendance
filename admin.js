import { db } from "./firebase.js";

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc
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
  loadStaff();
}

if (localStorage.getItem("admin") === "true") {
  initAdmin();
}

/* =====================
   TODAY
===================== */
const today = new Date().toISOString().slice(0, 10);

async function loadToday() {
  const box = document.getElementById("today");
  box.innerHTML = `<h2>Today (${today})</h2>`;

  const snap = await getDocs(collection(db, "attendance", today, "records"));

  if (snap.empty) {
    box.innerHTML += "<p>No attendance records.</p>";
    return;
  }

  snap.forEach(docSnap => {
    const r = docSnap.data();
    box.innerHTML += `
      <p>
        ${docSnap.id} |
        Attend: ${r.attendAt ? r.attendAt.toDate().toLocaleTimeString() : "-"} |
        Leave: ${r.leaveAt ? r.leaveAt.toDate().toLocaleTimeString() : "-"}
      </p>
    `;
  });
}

/* =====================
   HISTORY
===================== */
async function loadHistory() {
  const box = document.getElementById("history");
  box.innerHTML = "<h2>History</h2>";

  const snap = await getDocs(collection(db, "attendance"));
  snap.forEach(d => {
    box.innerHTML += `<p>📅 ${d.id}</p>`;
  });
}

/* =====================
   STAFF
===================== */
async function loadStaff() {
  const box = document.getElementById("staff");
  box.innerHTML = `
    <h2>Staff</h2>
    <input id="newStaff" placeholder="Employee name">
    <button onclick="addStaff()">Add</button>
    <hr>
    <div id="staffList"></div>
  `;

  const list = document.getElementById("staffList");
  const snap = await getDocs(collection(db, "employees"));

  snap.forEach(d => {
    if (!d.data().active) return;

    list.innerHTML += `
      <p>
        ${d.data().name}
        <button onclick="removeStaff('${d.id}')">Remove</button>
      </p>
    `;
  });
}

window.addStaff = async () => {
  const name = document.getElementById("newStaff").value.trim();
  if (!name) return alert("Enter a name");

  await addDoc(collection(db, "employees"), {
    name,
    active: true
  });

  document.getElementById("newStaff").value = "";
  loadStaff();
};

window.removeStaff = async (id) => {
  await updateDoc(doc(db, "employees", id), {
    active: false
  });
  loadStaff();
};

