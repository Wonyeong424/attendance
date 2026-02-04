console.log("🔥 admin.js loaded");

import { db, getTodayKey } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const ADMIN_PIN = "0317";

  const EMPLOYEES = [
    "Jakir",
    "Jeenat Khan",
    "Kamal Hassain",
    "Kiran Barthwal",
    "Robin Dixit",
    "Sam Lee",
    "Sudarla"
  ];

  /*****************
   * 🔐 어떤 시간 문자열이 와도 안전한 포맷
   *****************/
  function formatTime(timeStr) {
    if (!timeStr || timeStr === "-") return "-";

    // 숫자만 추출 (예: 2026-02-04T13:25:44 → [13,25,44])
    const nums = timeStr.match(/\d+/g);
    if (!nums || nums.length < 2) return "-";

    const h = Number(nums[nums.length >= 3 ? nums.length - 3 : 0]);
    const m = Number(nums[nums.length - 2]);

    if (isNaN(h) || isNaN(m)) return "-";

    const period = h < 12 ? "오전" : "오후";
    const hour12 = h % 12 === 0 ? 12 : h % 12;

    return `${period} ${hour12}시 ${m.toString().padStart(2, "0")}분`;
  }

  const pinBtn = document.getElementById("pinBtn");
  const pinInput = document.getElementById("pinInput");
  const pinError = document.getElementById("pinError");
  const pinSection = document.getElementById("pinSection");
  const adminSection = document.getElementById("adminSection");

  pinBtn.addEventListener("click", checkPin);
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPin();
  });

  function checkPin() {
    if (pinInput.value === ADMIN_PIN) {
      pinSection.style.display = "none";
      adminSection.style.display = "block";
      loadTodayAttendance();
    } else {
      pinError.textContent = "PIN이 올바르지 않습니다.";
    }
  }

  async function loadTodayAttendance() {
    const todayKey = getTodayKey();
    document.getElementById("title").textContent =
      `Today's Attendance (${todayKey})`;

    const tbody = document.getElementById("attendanceTable");
    tbody.innerHTML = "";

    for (const name of EMPLOYEES) {
      const ref = doc(db, "attendance", todayKey, "users", name);
      const snap = await getDoc(ref);

      const attend = snap.exists() && snap.data().attend
        ? formatTime(snap.data().attend)
        : "-";

      const leave = snap.exists() && snap.data().leave
        ? formatTime(snap.data().leave)
        : "-";

      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${attend}</td>
          <td>${leave}</td>
        </tr>
      `;
    }
  }

  const toggleBtn = document.getElementById("toggleHistory");
  const historySection = document.getElementById("historySection");
  let historyLoaded = false;

  toggleBtn.addEventListener("click", async () => {
    const open = historySection.style.display === "block";
    historySection.style.display = open ? "none" : "block";
    toggleBtn.textContent = open ? "View more ▼" : "Hide ▲";

    if (!historyLoaded) {
      await loadHistory();
      historyLoaded = true;
    }
  });

  async function loadHistory() {
    const todayKey = getTodayKey();
    const container = document.getElementById("historyContainer");
    container.innerHTML = "";

    const snap = await getDocs(collection(db, "attendance"));
    const dates = snap.docs
      .map(d => d.id)
      .filter(d => d !== todayKey)
      .sort((a, b) => b.localeCompare(a));

    for (const date of dates) {
      let html = `
        <div class="history-day">
          <h4>${date}</h4>
          <table>
            <tr>
              <th>Name</th>
              <th>Check-in</th>
              <th>Check-out</th>
            </tr>
      `;

      for (const name of EMPLOYEES) {
        const ref = doc(db, "attendance", date, "users", name);
        const snap = await getDoc(ref);

        const attend = snap.exists() && snap.data().attend
          ? formatTime(snap.data().attend)
          : "-";

        const leave = snap.exists() && snap.data().leave
          ? formatTime(snap.data().leave)
          : "-";

        html += `
          <tr>
            <td>${name}</td>
            <td>${attend}</td>
            <td>${leave}</td>
          </tr>
        `;
      }

      html += "</table></div>";
      container.innerHTML += html;
    }
  }
});

