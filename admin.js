import { db, getTodayKey } from "./firebase.js";
import {
  doc, getDoc, getDocs, setDoc, updateDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const ADMIN_PIN = "0317";

  /* PIN */
  pinBtn.onclick = () => {
    if (pinInput.value === ADMIN_PIN) {
      pinSection.style.display = "none";
      adminSection.style.display = "block";
      loadEmployees();
      loadTodayAttendance();
    } else {
      pinError.textContent = "Wrong PIN";
    }
  };

  /* Sidebar navigation */
  document.querySelectorAll(".sidebar button").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".sidebar button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".view")
        .forEach(v => v.style.display = "none");
      document.getElementById(btn.dataset.view).style.display = "block";
    };
  });

  /* 직원 로드 */
  async function loadEmployees() {
    employeeTable.innerHTML = "";
    const snap = await getDocs(collection(db, "employees"));

    snap.forEach(d => {
      employeeTable.innerHTML += `
        <tr>
          <td>${d.id}</td>
          <td>${d.data().active ? "Active" : "Inactive"}</td>
          <td>
            <button onclick="toggleEmployee('${d.id}', ${d.data().active})">
              ${d.data().active ? "Deactivate" : "Activate"}
            </button>
          </td>
        </tr>
      `;
    });
  }

  addEmployeeBtn.onclick = async () => {
    const name = newEmployeeName.value.trim();
    if (!name) return;

    await setDoc(doc(db, "employees", name), {
      active: true,
      joinedAt: new Date().toISOString()
    });

    newEmployeeName.value = "";
    loadEmployees();
    loadTodayAttendance();
  };

  window.toggleEmployee = async (name, active) => {
    await updateDoc(doc(db, "employees", name), { active: !active });
    loadEmployees();
    loadTodayAttendance();
  };

  /* 오늘 출석 */
  async function loadTodayAttendance() {
    const todayKey = getTodayKey();
    title.textContent = `Today's Attendance (${todayKey})`;
    attendanceTable.innerHTML = "";

    const empSnap = await getDocs(collection(db, "employees"));
    for (const emp of empSnap.docs) {
      if (!emp.data().active) continue;

      const snap = await getDoc(
        doc(db, "attendance", todayKey, "users", emp.id)
      );

      attendanceTable.innerHTML += `
        <tr>
          <td>${emp.id}</td>
          <td>${snap.data()?.attend || "-"}</td>
          <td>${snap.data()?.leave || "-"}</td>
        </tr>
      `;
    }
  }

  /* History */
  async function loadHistory() {
    historyContainer.innerHTML = "";
    const snap = await getDocs(collection(db, "attendance"));

    snap.forEach(d => {
      historyContainer.innerHTML += `<p>${d.id}</p>`;
    });
  }

});

