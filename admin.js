// admin.js
import { db, getTodayKey } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadTodayAttendance() {
  const todayKey = getTodayKey();
  const usersRef = collection(db, "attendance", todayKey, "users");
  const snapshot = await getDocs(usersRef);

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  if (snapshot.empty) {
    table.innerHTML = "<tr><td colspan='3'>No attendance records today</td></tr>";
    return;
  }

  snapshot.forEach(doc => {
    const d = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.name}</td><td>${d.attend || "-"}</td><td>${d.leave || "-"}</td>`;
    table.appendChild(tr);
  });
}

loadTodayAttendance();

