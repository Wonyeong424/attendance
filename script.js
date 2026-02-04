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

  const empSnap = await getDocs(collection(db, "employees"));

  for (const d of empSnap.docs) {
    const emp = d.data();
    if (!emp.active) continue;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.name}</td>
      <td><button data-attend="${d.id}">Attend</button></td>
      <td><button data-leave="${d.id}">Leave</button></td>
    `;
    body.appendChild(tr);
  }
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

  alert(
    type === "attend"
      ? `${name} has successfully attended.`
      : `${name} has successfully left.`
  );
}

body.addEventListener("click", async e => {
  const attendId = e.target.dataset.attend;
  const leaveId = e.target.dataset.leave;
  if (!attendId && !leaveId) return;

  const name = e.target.closest("tr").children[0].textContent;

  if (attendId) await record("attend", attendId, name);
  if (leaveId) await record("leave", leaveId, name);
});

loadEmployees();

