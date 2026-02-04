import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const body = document.getElementById("empBody");
const addBtn = document.getElementById("addBtn");
const newName = document.getElementById("newName");

async function loadEmployees() {
  body.innerHTML = "";
  const snap = await getDocs(collection(db, "employees"));

  snap.forEach(d => {
    const emp = d.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${emp.name}</td>
      <td>${emp.active ? "Active" : "Inactive"}</td>
      <td>
        ${emp.active ? `<button data-id="${d.id}">Deactivate</button>` : ""}
      </td>
    `;

    body.appendChild(tr);
  });
}

addBtn.onclick = async () => {
  if (!newName.value.trim()) return;

  await addDoc(collection(db, "employees"), {
    name: newName.value.trim(),
    active: true,
    createdAt: new Date()
  });

  newName.value = "";
  loadEmployees();
};

body.addEventListener("click", async e => {
  const id = e.target.dataset.id;
  if (!id) return;

  await updateDoc(doc(db, "employees", id), {
    active: false
  });

  loadEmployees();
});

loadEmployees();

