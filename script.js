import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const body = document.getElementById("attendanceBody");

async function loadEmployees() {
  body.innerHTML = "";
  const snap = await getDocs(collection(db, "employees"));

  snap.forEach(d => {
    const emp = d.data();
    if (!emp.active) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.name}</td>
      <td><button data-attend="${d.id}" data-name="${emp.name}">Attend</button></td>
      <td><button data-leave="${d.id}" data-name="${emp.name}">Leave</button></td>
    `;
    body.appendChild(tr);
  });
}

async function record(type, employeeId, name) {
  const q = query(
    collection(db, "attendance"),
    where("employeeId", "==", employeeId),
    orderBy("timestamp", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);

  if (!snap.empty && snap.docs[0].data().type === type) {
    alert(
      type === "attend"
        ? "This employee has already attended."
        : "This employee has already left."
    );
    return;
  }

  await addDoc(collection(db, "attendance"), {
    employeeId,
    name,
    type,
    timestamp: new Date()
  });

  alert(`${name} ${type === "attend" ? "attended" : "left"} successfully.`);
}

body.addEventListener("click", async e => {
  const attendId = e.target.dataset.attend;
  const leaveId = e.target.dataset.leave;
  const name = e.target.dataset.name;

  if (attendId) await record("attend", attendId, name);
  if (leaveId) await record("leave", leaveId, name);
});

loadEmployees();

