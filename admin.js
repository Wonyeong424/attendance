import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded (IST production)");

const ADMIN_PIN = "0317";

const EMPLOYEES = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee",
];

/* ==============================
   🇮🇳 IST 유틸 (UTC+5:30)
================================ */

// IST 기준 오늘 날짜 (YYYY-MM-DD)
function getTodayKeyIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);

  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Firestore Timestamp → IST 시간 표시
function formatTimeIST(isoStr) {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "-";

  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);

  const h = ist.getHours();
  const m = ist.getMinutes();
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  return `${period} ${hour12}:${m.toString().padStart(2, "0")}`;
}

/* ==============================
   🔐 PIN
================================ */

const pinBtn = document.getElementById("pinBtn");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const pinSection = document.getElementById("pinSection");
const adminSection = document.getElementById("adminSection");

window.checkPin = async function () {
  pinError.textContent = "";

  if (pinInput.value === ADMIN_PIN) {
    pinSection.style.display = "none";
    adminSection.style.display = "block";
    await loadTodayAttendance();
  } else {
    pinError.textContent = "PIN이 올바르지 않습니다.";
  }
};

pinBtn.addEventListener("click", checkPin);
pinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkPin();
});

/* ==============================
   📅 오늘 출석
================================ */

async function loadTodayAttendance() {
  const todayKey = getTodayKeyIST();
  document.getElementById("title").textContent =
    `Today's Attendance - ${todayKey}`;

  const tbody = document.getElementById("attendanceTable");
  tbody.innerHTML = "";

  try {
    for (const name of EMPLOYEES) {
      const ref = doc(db, "attendance", todayKey, "records", name);
      const snap = await getDoc(ref);

      const attend =
        snap.exists() && snap.data().attendAt
          ? formatTimeIST(snap.data().attendAt.toDate().toISOString())
          : "-";

      const leave =
        snap.exists() && snap.data().leaveAt
          ? formatTimeIST(snap.data().leaveAt.toDate().toISOString())
          : "-";

      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${attend}</td>
          <td>${leave}</td>
        </tr>
      `;
    }
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="color:red;">
          Failed to load today's data
        </td>
      </tr>
    `;
  }
}

/* ==============================
   📜 History 토글
================================ */

const toggleBtn = document.getElementById("toggleHistory");
const historySection = document.getElementById("historySection");
let historyLoaded = false;

toggleBtn.addEventListener("click", async () => {
  const open = historySection.style.display === "block";
  historySection.style.display = open ? "none" : "block";
  toggleBtn.textContent = open ? "View more ▼" : "Hide ▲";

  if (!open && !historyLoaded) {
    await loadHistory();
    historyLoaded = true;
  }
});

/* ==============================
   📜 History
   ✅ 변경: IST "오늘"도 History에 포함 (필터 제거)
================================ */

async function loadHistory() {
  const todayKey = getTodayKeyIST();
  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading...";

  try {
    const snap = await getDocs(collection(db, "attendance"));
    
    console.log("📌 attendance doc count =", snap.size);
    console.log("📌 attendance doc ids =", snap.docs.map(d => d.id));
    console.log("📌 todayKeyIST =", todayKey);


    // ✅ 날짜 문서 ID만 추출 (YYYY-MM-DD)
    // ✅ 변경: 오늘(todayKey)도 제외하지 않음
    const dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 30);

    if (dates.length === 0) {
      container.innerHTML = "<p>No history yet.</p>";
      return;
    }

    container.innerHTML = "";

    for (const date of dates) {
      const isToday = date === todayKey;

      let html = `
        <div class="history-day">
          <h4>${date}${isToday ? " (Today)" : ""}</h4>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Attend</th>
                <th>Leave</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const name of EMPLOYEES) {
        const ref = doc(db, "attendance", date, "records", name);
        const snap = await getDoc(ref);

        const attend =
          snap.exists() && snap.data().attendAt
            ? formatTimeIST(snap.data().attendAt.toDate().toISOString())
            : "-";

        const leave =
          snap.exists() && snap.data().leaveAt
            ? formatTimeIST(snap.data().leaveAt.toDate().toISOString())
            : "-";

        html += `
          <tr>
            <td>${name}</td>
            <td>${attend}</td>
            <td>${leave}</td>
          </tr>
        `;
      }

      html += `
            </tbody>
          </table>
        </div>
      `;

      container.innerHTML += html;
    }
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <p style="color:red;">Failed to load history</p>
    `;
  }
}

