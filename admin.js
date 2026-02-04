import { db } from "./firebase.js";
import {
  collection, getDocs, doc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===== LOGIN ===== */
window.login = () => {
  if (pinInput.value === "0317") {
    document.getElementById("pin-box").style.display = "none";
    document.getElementById("admin-app").style.display = "flex";
    loadToday();
  } else {
    alert("Wrong PIN");
  }
};

/* ===== SIDEBAR ===== */
window.openTab = (id, el) => {
  document.querySelectorAll("main > div").forEach(d => d.style.display = "none");
  document.getElementById(id).style.display = "block";

  document.querySelectorAll("aside li").forEach(li => li.classList.remove("active"));
  el.classList.add("active");

  if (id === "today") loadToday();
  if (id === "history") loadHistory();
  if (id === "employees") loadEmployees();
};

window.toggleSidebar = () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
};

/* ===== UTILS ===== */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/* ===== TODAY ===== */
async function loadToday() {
  const div = document.getElementById("today");
  div.innerHTML = "<h2>Today Attendance</h2>";

  const snap = await getDocs(collection(db, "attendance", todayKey(), "records"));

  let html = "<table><tr><th>Name</th><th>Attend</th><th>Leave</th></tr>";
  snap.forEach(d => {
    html += `<tr>
      <td>${d.id}</td>
      <td>${d.data().attend ?? "-"}</td>
      <td>${d.data().leave ?? "-"}</td>
    </tr>`;
  });
  html += "</table>";

  div.innerHTML += html;
}

/* ===== HISTORY ===== */
async function loadHistory() {
  const div = document.getElementById("history");
  div.innerHTML = "<h2>History</h2>";

  const days = await getDocs(collection(db, "attendance"));
  days.forEach(d => {
    div.innerHTML += `<p>📅 ${d.id}</p>`;
  });
}

/* ===== EMPLOYEES ===== */
async function loadEmployees() {
  const div = document.getElementById("employees");
  div.innerHTML = `
    <h2>Employees</h2>
    <input id="newName" placeholder="Employee name">
    <button class="add" onclick="addEmployee()">Add</button>
    <hr>
  `;

  const snap = await getDocs(collection(db, "employees"));
  snap.forEach(e => {
    div.innerHTML += `
      <div class="employee-row">
        <span>${e.id}</span>
        <button class="danger" onclick="fireEmployee('${e.id}')">Remove</button>
      </div>
    `;
  });
}

window.addEmployee = async () => {
  if (!newName.value) return;
  await setDoc(doc(db, "employees", newName.value), { active: true });
  loadEmployees();
};

window.fireEmployee = async (name) => {
  await updateDoc(doc(db, "employees", name), { active: false });
  loadEmployees();
};

