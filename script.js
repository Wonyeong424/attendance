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

const list = document.getElementById("employeeList");

async function loadEmployees() {
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "employees"));

  snap.forEach(docSnap => {
    const emp = docSnap.data();
    if (emp.active === false) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${emp.name}</strong>
      <button data-attend="${docSnap.id}">Attend</button>
      <button data-leave="${docSnap.id}">Leave</button>
    `;
    list.appendChild(li);
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

  // 🔒 Prevent duplicate actions
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
    type, // "attend" | "leave"
    timestamp: new Date()
  });

  alert(
    type === "attend"
      ? `${name} has successfully attended.`
      : `${name} has successfully left.`
  );
}

list.addEventListener("click", async e => {
  const attendId = e.target.dataset.attend;
  const leaveId = e.target.dataset.leave;

  if (!attendId && !leaveId) return;

  const name = e.target.parentElement.querySelector("strong").textContent;

  if (attendId) await record("attend", attendId, name);
  if (leaveId) await record("leave", leaveId, name);
});

loadEmployees();

