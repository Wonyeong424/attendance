import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===== UTIL ===== */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const isPM = h >= 12;
  h = h % 12 || 12;
  return `${isPM ? "PM" : "AM"} ${h}:${m}`;
}

/* ===== MAIN ===== */
const tbody = document.getElementById("attendance-list");
const today = todayKey();

const empSnap = await getDocs(collection(db, "employees"));

for (const emp of empSnap.docs) {
  if (!emp.data().active) continue;

  const name = emp.id;
  const ref = doc(db, "attendance", today, "records", name);
  const snap = await getDoc(ref);
  const record = snap.exists() ? snap.data() : {};

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${name}</td>
    <td>
      ${
        record.attend
          ? `<span class="status">${record.attend}</span>`
          : `<button class="attend">Attend</button>`
      }
    </td>
    <td>
      ${
        record.leave
          ? `<span class="status">${record.leave}</span>`
          : `<button class="leave">Leave</button>`
      }
    </td>
  `;

  tr.querySelectorAll("button").forEach(btn => {
    btn.onclick = async () => {
      const type = btn.textContent.toLowerCase();

      if (record[type]) {
        alert(`Already ${type}ed`);
        return;
      }

      await setDoc(ref, { [type]: formatTime() }, { merge: true });
      location.reload();
    };
  });

  tbody.appendChild(tr);
}

