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
const historyPrevBtn = document.getElementById("historyPrevBtn");
const historyNextBtn = document.getElementById("historyNextBtn");
const historyThisMonthBtn = document.getElementById("historyThisMonthBtn");
const historyMonthLabel = document.getElementById("historyMonthLabel");
const historyDownloadBtn = document.getElementById("historyDownloadBtn");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// IST 기준 오늘의 year/month로 초기화
const { y: todayY, m: todayM } = (() => {
  const key = getTodayKeyIST(); // "YYYY-MM-DD"
  const [y, m] = key.split("-").map(Number);
  return { y, m };
})();

let historyYear = todayY;
let historyMonth = todayM; // 1-12
let historyLoaded = false; // 최소 한 번은 로드했는지

toggleBtn.addEventListener("click", async () => {
  const open = historySection.style.display === "block";
  historySection.style.display = open ? "none" : "block";
  toggleBtn.textContent = open ? "View more ▼" : "Hide ▲";

  if (!open && !historyLoaded) {
    historyLoaded = true;
    await loadHistoryMonth(historyYear, historyMonth);
  }
});

historyPrevBtn?.addEventListener("click", () => {
  historyMonth -= 1;
  if (historyMonth < 1) {
    historyMonth = 12;
    historyYear -= 1;
  }
  loadHistoryMonth(historyYear, historyMonth);
});

historyNextBtn?.addEventListener("click", () => {
  historyMonth += 1;
  if (historyMonth > 12) {
    historyMonth = 1;
    historyYear += 1;
  }
  loadHistoryMonth(historyYear, historyMonth);
});

historyThisMonthBtn?.addEventListener("click", () => {
  historyYear = todayY;
  historyMonth = todayM;
  loadHistoryMonth(historyYear, historyMonth);
});

historyDownloadBtn?.addEventListener("click", () => {
  exportHistoryMonthToExcel(historyYear, historyMonth);
});

/* ==============================
   📜 History (월 단위 + 병렬 로딩)

   기존 방식: 날짜 30개 x 직원 8명 = 최대 240번의
   개별 getDoc() 요청을 "순차적으로" 기다려서 매우 느렸음.

   개선: 하루치 출근 기록은 records 서브컬렉션 전체를
   getDocs() 한 번으로 가져오고, 날짜들도 Promise.all로
   동시에(병렬로) 로딩함. 또한 "최근 30일" 대신
   선택한 달(月) 하나만 로드해서 데이터량 자체를 줄임.
================================ */

function getMonthDateKeys(year, month) {
  // month: 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = getTodayKeyIST();

  const isCurrentMonth = year === todayY && month === todayM;
  const lastDay = isCurrentMonth ? Number(todayKey.slice(8, 10)) : daysInMonth;

  const keys = [];
  for (let d = 1; d <= lastDay; d++) {
    keys.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return keys.reverse(); // 최신 날짜부터
}

async function fetchMonthDayResults(year, month) {
  const dates = getMonthDateKeys(year, month);

  // 날짜별로 records 서브컬렉션 전체를 한 번에(1 query) 가져오고,
  // 모든 날짜를 동시에(병렬) 요청한다.
  return Promise.all(
    dates.map(async (date) => {
      const recordsSnap = await getDocs(collection(db, "attendance", date, "records"));
      const byName = new Map();
      recordsSnap.forEach((docSnap) => byName.set(docSnap.id, docSnap.data()));
      return { date, byName };
    })
  );
}

async function loadHistoryMonth(year, month) {
  const todayKey = getTodayKeyIST();
  const container = document.getElementById("historyContainer");

  if (historyMonthLabel) {
    historyMonthLabel.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
  }

  container.innerHTML = "Loading.";

  try {
    const dayResults = await fetchMonthDayResults(year, month);

    if (dayResults.length === 0) {
      container.innerHTML = "<p>No days in this month yet.</p>";
      return;
    }

    // 기록이 하나도 없는 날은 건너뛰어 목록을 더 짧고 빠르게 표시
    const daysWithData = dayResults.filter(({ byName }) => byName.size > 0);

    if (daysWithData.length === 0) {
      container.innerHTML = "<p>No records for this month.</p>";
      return;
    }

    const parts = daysWithData.map(({ date, byName }) => {
      const isToday = date === todayKey;

      const rows = EMPLOYEES.map((name) => {
        const data = byName.get(name);
        const attend = data?.attendAt ? formatTimeIST(data.attendAt.toDate().toISOString()) : "-";
        const leave = data?.leaveAt ? formatTimeIST(data.leaveAt.toDate().toISOString()) : "-";

        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(attend)}</td>
            <td>${escapeHtml(leave)}</td>
          </tr>
        `;
      }).join("");

      return `
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
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    });

    // 한 번에 렌더링 (반복 innerHTML += 로 인한 리플로우 방지)
    container.innerHTML = parts.join("");
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p style="color:red;">Failed to load history</p>`;
  }
}

/* ==============================
   📥 History → Excel 다운로드

   현재 선택된 달(historyYear/historyMonth)의 출퇴근 기록을
   SheetJS(xlsx)로 .xlsx 파일로 만들어 다운로드한다.
   (admin.html에 <script src=".../xlsx.full.min.js"> 로 로드된
   전역 XLSX 객체를 사용)
================================ */

async function exportHistoryMonthToExcel(year, month) {
  if (typeof XLSX === "undefined") {
    alert("Excel 라이브러리를 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.");
    return;
  }

  const originalText = historyDownloadBtn ? historyDownloadBtn.textContent : "";
  if (historyDownloadBtn) {
    historyDownloadBtn.disabled = true;
    historyDownloadBtn.textContent = "Preparing...";
  }

  try {
    const dayResults = await fetchMonthDayResults(year, month);

    // 날짜 오름차순으로 정렬 (엑셀에서 위→아래로 시간순 확인하기 편하게)
    const sorted = [...dayResults].sort((a, b) => a.date.localeCompare(b.date));

    const sheetRows = [["Date", "Name", "Attend", "Leave", "Status"]];

    for (const { date, byName } of sorted) {
      for (const name of EMPLOYEES) {
        const data = byName.get(name);
        const attendAt = data?.attendAt ? data.attendAt.toDate().toISOString() : null;
        const leaveAt = data?.leaveAt ? data.leaveAt.toDate().toISOString() : null;

        const attend = attendAt ? formatTimeIST(attendAt) : "";
        const leave = leaveAt ? formatTimeIST(leaveAt) : "";
        const status = attendAt ? (leaveAt ? "Present" : "Attended (no leave)") : "Absent";

        sheetRows.push([date, name, attend, leave, status]);
      }
    }

    if (sheetRows.length === 1) {
      alert("이 달에는 다운로드할 출퇴근 기록이 없습니다.");
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    worksheet["!cols"] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 10 }, // Attend
      { wch: 10 }, // Leave
      { wch: 20 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = `${MONTH_NAMES[month - 1]} ${year}`.slice(0, 31); // 시트명 31자 제한
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fileName = `attendance_${year}-${String(month).padStart(2, "0")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (e) {
    console.error(e);
    alert("엑셀 파일 생성에 실패했습니다.");
  } finally {
    if (historyDownloadBtn) {
      historyDownloadBtn.disabled = false;
      historyDownloadBtn.textContent = originalText;
    }
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