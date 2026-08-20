import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,

  // Holiday manager
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded (IST production)");

const ADMIN_PIN = "0317";

const EMPLOYEES = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sundarlal",
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
    initHolidayAdmin(); // ✅ Holiday 관리자 기능 초기화
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
  document.getElementById("title").textContent = `Today's Attendance - ${todayKey}`;

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
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(attend)}</td>
          <td>${escapeHtml(leave)}</td>
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
================================ */

async function loadHistory() {
  const todayKey = getTodayKeyIST();
  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading.";

  try {
    const snap = await getDocs(collection(db, "attendance"));

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
          <h4>${escapeHtml(date)}${isToday ? " (Today)" : ""}</h4>
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
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(attend)}</td>
            <td>${escapeHtml(leave)}</td>
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
    container.innerHTML = `<p style="color:red;">Failed to load history</p>`;
  }
}

/* ==============================
   🎉 Holiday Manager
   저장 형식:
   holidays 컬렉션
   { name: string, date: "YYYY-MM-DD", year: number, createdAt: serverTimestamp() }
================================ */

const holidaySection = document.getElementById("holidaySection");
const holidayYearEl = document.getElementById("holidayYear");
const holidayRefreshBtn = document.getElementById("holidayRefresh");
const holidayNameEl = document.getElementById("holidayName");
const holidayDateEl = document.getElementById("holidayDate");
const addHolidayBtn = document.getElementById("addHolidayBtn");
const holidayTbody = document.getElementById("holidayTableBody");

let holidayUnsub = null;
let holidayInited = false;

function initHolidayAdmin() {
  if (holidayInited) return;
  holidayInited = true;

  // 기본 year = 올해
  const nowYear = new Date().getFullYear();
  holidayYearEl.value = String(nowYear);

  // Add
  addHolidayBtn.addEventListener("click", async () => {
    const name = (holidayNameEl.value || "").trim();
    const dateStr = (holidayDateEl.value || "").trim(); // YYYY-MM-DD

    if (!name) return;
    if (!dateStr) return;

    const year = Number(dateStr.slice(0, 4));
    if (!Number.isFinite(year)) return;

    try {
      await addDoc(collection(db, "holidays"), {
        name,
        date: dateStr,
        year,
        createdAt: serverTimestamp(),
      });

      holidayNameEl.value = "";
      // date는 유지해도 됨
    } catch (e) {
      console.error(e);
    }
  });

  // Refresh
  holidayRefreshBtn.addEventListener("click", () => {
    const y = Number(holidayYearEl.value);
    subscribeHolidays(Number.isFinite(y) ? y : new Date().getFullYear());
  });

  // year input Enter
  holidayYearEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") holidayRefreshBtn.click();
  });

  // 처음 구독
  subscribeHolidays(nowYear);

  // 섹션이 숨겨져 있어도 구독은 계속 유지(원하면 nav 눌렀을 때만 subscribe 하도록 바꿀 수도 있음)
  holidaySection.style.display = holidaySection.style.display || "none";
}

function subscribeHolidays(year) {
  if (holidayUnsub) holidayUnsub();

  const q = query(
    collection(db, "holidays"),
    where("year", "==", Number(year)),
    orderBy("date", "asc")
  );

  holidayUnsub = onSnapshot(
    q,
    (snap) => {
      holidayTbody.innerHTML = "";

      if (snap.empty) return;

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${escapeHtml(d.date || "-")}</td>
          <td>${escapeHtml(d.name || "-")}</td>
          <td><button class="btn secondary" data-del="${docSnap.id}">Delete</button></td>
        `;

        tr.querySelector("button").addEventListener("click", async () => {
          try {
            await deleteDoc(doc(db, "holidays", docSnap.id));
          } catch (e) {
            console.error(e);
          }
        });

        holidayTbody.appendChild(tr);
      });
    },
    (err) => {
      console.error(err);
      holidayTbody.innerHTML = `
        <tr><td colspan="3" style="color:red;">Failed to load</td></tr>
      `;
    }
  );
}

/* ==============================
   Utils
================================ */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
