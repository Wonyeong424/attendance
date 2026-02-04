import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * 🔹 초기 직원 목록
 * (Firestore에 없을 때만 한 번 생성)
 */
const INITIAL_EMPLOYEES = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee"
];

const list = document.getElementById("empList");
const addBtn = document.getElementById("addBtn");
const newName = document.getElementById("newName");

async function seedEmployeesIfEmpty() {
  const snap = await getDocs(collection(db, "employees"));
  if (!snap.empty) return;

  for (const name of INITIAL_EMPLOYEES) {
    await addDoc(collection(db, "employees"), {
      name,
      active: true,
      createdAt: new Date()
    });
  }
}

async function loadEmployees() {
  list.innerHTML = "";
  const snap = await getDocs(collection(db, "employees"));

  snap.forEach(d => {
    const emp = d.data();

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${emp.name}</strong>
      (${emp.active ? "Active" : "Inactive"})
      ${emp.active ? `<button data-id="${d.id}">Deactivate</button>` : ""}
    `;
    list.appendChild(li);
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

list.addEventListener("click", async e => {
  const id = e.target.dataset.id;
  if (!id) return;

  await updateDoc(doc(db, "employees", id), {
    active: false
  });

  loadEmployees();
});

// 최초 실행
await seedEmployeesIfEmpty();
loadEmployees();

