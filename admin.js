import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded (IST + History Preview)");

const ADMIN_PIN = "0317";

// ✅ 과거 데이터가 없어도 History UI를 미리 보기
const PREVIEW_HISTORY = true; // 미리보기 끄려면 false

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
   🇮🇳 IST(UTC+5:30) 유틸
================================ */

// IST 기준 오늘 날짜 키 (YYYY-MM-DD)
function getTodayKeyIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);

  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ISO(UTC) → IST 로 변환해서 AM/PM 표시
function formatTimeIST(isoStr) {
  if (!isoStr || isoStr === "-") return "-";
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

// todayKey(YYYY-MM-DD) 기준으로 n일 전 날짜 키 만들기
function getPastKeyFromYYYYMMDD(todayKey, daysAgo) {
  const y = Number(todayKey.slice(0, 4));
  const m = Number(todayKey.slice(5, 7)) - 1;
  const d = Number(todayKey.slice(8, 10));

  // 날짜 문자열 기반이므로 UTC로 안전하게 계산
  const base = new Date(Date.UTC(y, m, d));
  base.setUTCDate(base.getUTCDate() - daysAgo);

  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/* ==============================
   🔐 PIN 처리
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
   📅 오늘 출석 (IST)
================================ */

async function loadTodayAttendance() {
  const todayKey = getTodayKeyIST();
  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.textContent = `Today's Attendance (IST) - ${todayKey}`;

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
    console.error("Today load failed:", e);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="color:red;">Today load failed: ${e.message}</td>
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

  // ✅ 열 때(=open이 false였을 때) + 처음 한 번만 로딩
  if (!open && !historyLoaded) {
    await loadHistory();
    historyLoaded = true;
  }
});

/* ==============================
   📜 History (IST + Preview)
================================ */

async function loadHistory() {
  const todayKey = getTodayKeyIST();
  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading...";

  try {
    // 인덱스 없이: 전부 가져와서 JS에서 정렬
    const snap = await getDocs(collection(db, "attendance"));

    let dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .filter((d) => d !== todayKey)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 30);

    // ✅ 과거 데이터가 아예 없을 때: PREVIEW 모드면 가짜 날짜 3개 생성
    if (dates.length === 0) {
      if (!PREVIEW_HISTORY) {
        container.innerHTML = "<p>No history yet.</p>";
        return;
      }

      dates = [
        getPastKeyFromYYYYMMDD(todayKey, 1),
        getPastKeyFromYYYYMMDD(todayKey, 2),
        getPastKeyFromYYYYMMDD(todayKey, 3),
      ];
    }

    container.innerHTML = "";

    for (const date of dates) {
      const isPreview = PREVIEW_HISTORY && snap.docs.length === 0;

      let html = `
        <div class="history-day">
          <h4>${date}${isPreview ? " (PREVIEW)" : ""}</h4>
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
        // ✅ Preview면 가짜 시간, 실제 데이터면 Firestore 조회
        let attend = "-";
        let leave = "-";

        if (isPreview) {
          attend = "AM 9:10";
          leave = "PM 6:20";
        } else {
          const ref = doc(db, "attendance", date, "records", name);
          const d = await getDoc(ref);

          attend =
            d.exists() && d.data().attendAt
              ? formatTimeIST(d.data().attendAt.toDate().toISOString())
              : "-";

          leave =
            d.exists() && d.data().leaveAt
              ? formatTimeIST(d.data().leaveAt.toDate().toISOString())
              : "-";
        }

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
    console.error("History load failed:", e);
    container.innerHTML = `
      <p style="color:red;">
        History load failed: ${e.message}
      </p>
    `;
  }
}

