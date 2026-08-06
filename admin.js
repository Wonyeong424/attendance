import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  deleteDoc,
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
  "Bhanu Pratap",
  "Jakir Hossain",
  "Suvimal Saha",
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
console.log("✅ projectId =", db.app?.options?.projectId);


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
   🗑️ 데이터 삭제
================================ */

// 특정 날짜의 모든 기록(직원별 records + 날짜 부모 문서) 삭제
async function deleteDayData(date) {
  const ok = confirm(
    `"${date}" 날짜의 출석 데이터를 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
  );
  if (!ok) return;

  try {
    for (const name of EMPLOYEES) {
      await deleteDoc(doc(db, "attendance", date, "records", name)).catch(() => {});
    }
    await deleteDoc(doc(db, "attendance", date)).catch(() => {});

    alert(`"${date}" 데이터가 삭제되었습니다.`);

    historyLoaded = false;
    await loadHistory();
    historyLoaded = true;
  } catch (e) {
    console.error(e);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// 오늘을 제외한 모든 과거 기록 삭제 (컬렉션 크기를 줄여 로딩 속도 개선)
async function deleteAllHistoryExceptToday() {
  const todayKey = getTodayKeyIST();
  const ok = confirm(
    "오늘(" + todayKey + ")을 제외한 모든 과거 출석 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 시간이 다소 걸릴 수 있습니다."
  );
  if (!ok) return;

  const deleteAllHistoryBtn = document.getElementById("deleteAllHistoryBtn");
  deleteAllHistoryBtn.disabled = true;
  deleteAllHistoryBtn.textContent = "삭제 중...";

  try {
    const snap = await getDocs(collection(db, "attendance"));
    const dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== todayKey);

    for (const date of dates) {
      for (const name of EMPLOYEES) {
        await deleteDoc(doc(db, "attendance", date, "records", name)).catch(() => {});
      }
      await deleteDoc(doc(db, "attendance", date)).catch(() => {});
    }

    alert(`${dates.length}개 날짜의 기록을 삭제했습니다.`);

    historyLoaded = false;
    await loadHistory();
    historyLoaded = true;
  } catch (e) {
    console.error(e);
    alert("삭제 중 오류가 발생했습니다.");
  } finally {
    deleteAllHistoryBtn.disabled = false;
    deleteAllHistoryBtn.textContent = "🗑 지난 기록 전체 삭제 (오늘 제외)";
  }
}

// 날짜별 삭제 버튼 (이벤트 위임: history가 다시 그려져도 동작)
document.getElementById("historyContainer").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete-day");
  if (!btn) return;
  deleteDayData(btn.dataset.date);
});

// 전체 과거 기록 삭제 버튼
document.getElementById("deleteAllHistoryBtn").addEventListener("click", () => {
  deleteAllHistoryExceptToday();
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

    const testRef = doc(db, "attendance", "2026-02-07");
    const testSnap = await getDoc(testRef);
    console.log("🧪 getDoc(attendance/2026-02-07) exists =", testSnap.exists());
    console.log("🧪 getDoc data =", testSnap.exists() ? testSnap.data() : null);


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
          <div class="history-day-header">
            <h4 style="margin:0;">${date}${isToday ? " (Today)" : ""}</h4>
            <button class="btn-delete-day" data-date="${date}">🗑 이 날짜 삭제</button>
          </div>
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