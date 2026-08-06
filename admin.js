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
   📅 오늘 출석 (Promise.all 병렬 로딩)
================================ */

// 다운로드 버튼에서 쓸 수 있도록 최근 로드된 오늘 데이터를 저장해 둠
let todayData = []; // [{ name, attend, leave }]

async function loadTodayAttendance() {
  const todayKey = getTodayKeyIST();
  document.getElementById("title").textContent =
    `Today's Attendance - ${todayKey}`;

  const tbody = document.getElementById("attendanceTable");
  tbody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

  try {
    // ✅ 8명을 순차(await 반복)가 아니라 동시에 요청 → 훨씬 빠름
    const results = await Promise.all(
      EMPLOYEES.map(async (name) => {
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

        return { name, attend, leave };
      })
    );

    todayData = results;

    tbody.innerHTML = results
      .map(
        (r) => `
        <tr>
          <td>${r.name}</td>
          <td>${r.attend}</td>
          <td>${r.leave}</td>
        </tr>
      `
      )
      .join("");
  } catch (e) {
    console.error(e);
    todayData = [];
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
   📜 History (월별 탭 + Promise.all 병렬/지연 로딩)
   ✅ IST "오늘"도 History에 포함 (필터 없음)
================================ */

// monthKey(YYYY-MM) -> 날짜 배열(내림차순)
let monthDatesMap = {};
// 최신순 정렬된 monthKey 목록
let monthKeys = [];
// monthKey -> [{ date, isToday, records }]  (조회한 달만 캐시됨 = 지연 로딩)
let monthCache = {};
// 현재 선택된 달
let selectedMonth = null;

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  return `${y}년 ${parseInt(m, 10)}월`;
}

// attendance 컬렉션의 날짜 문서 ID 전체를 가져와 월별로 묶기 (가벼운 조회)
async function loadHistory() {
  const container = document.getElementById("historyContainer");
  const tabsEl = document.getElementById("monthTabs");
  container.innerHTML = "Loading...";
  tabsEl.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "attendance"));
    const allDates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a));

    monthDatesMap = {};
    for (const date of allDates) {
      const monthKey = date.slice(0, 7); // "YYYY-MM"
      if (!monthDatesMap[monthKey]) monthDatesMap[monthKey] = [];
      monthDatesMap[monthKey].push(date);
    }
    monthKeys = Object.keys(monthDatesMap).sort((a, b) => b.localeCompare(a));
    monthCache = {};
    selectedMonth = null;

    if (monthKeys.length === 0) {
      renderMonthTabs();
      container.innerHTML = "<p>No history yet.</p>";
      return;
    }

    // 가장 최근 달을 기본으로 열기 (해당 달만 실제 데이터 조회 = 지연 로딩)
    await selectMonth(monthKeys[0]);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p style="color:red;">Failed to load history</p>`;
  }
}

function renderMonthTabs() {
  const tabsEl = document.getElementById("monthTabs");
  tabsEl.innerHTML = monthKeys
    .map(
      (mk) => `
      <button class="month-tab-btn${mk === selectedMonth ? " active" : ""}" data-month="${mk}">
        ${monthLabel(mk)} (${monthDatesMap[mk].length})
      </button>
    `
    )
    .join("");
}

// 특정 달의 날짜별 x 직원별 데이터를 병렬로 조회 (캐시에 있으면 재사용)
async function ensureMonthLoaded(monthKey) {
  if (monthCache[monthKey]) return monthCache[monthKey];

  const todayKey = getTodayKeyIST();
  const dates = monthDatesMap[monthKey] || [];

  // ✅ 그 달의 모든 날짜 x 직원 조합을 동시에 요청
  const days = await Promise.all(
    dates.map(async (date) => {
      const records = await Promise.all(
        EMPLOYEES.map(async (name) => {
          const ref = doc(db, "attendance", date, "records", name);
          const s = await getDoc(ref);

          const attend =
            s.exists() && s.data().attendAt
              ? formatTimeIST(s.data().attendAt.toDate().toISOString())
              : "-";

          const leave =
            s.exists() && s.data().leaveAt
              ? formatTimeIST(s.data().leaveAt.toDate().toISOString())
              : "-";

          return { name, attend, leave };
        })
      );

      return { date, isToday: date === todayKey, records };
    })
  );

  monthCache[monthKey] = days;
  return days;
}

async function selectMonth(monthKey) {
  selectedMonth = monthKey;
  renderMonthTabs();

  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading...";

  const days = await ensureMonthLoaded(monthKey);
  renderHistoryDays(days);
}

// 선택된 달의 일자별 테이블을 그리기 (삭제 후 재사용을 위해 함수로 분리)
function renderHistoryDays(days) {
  const container = document.getElementById("historyContainer");

  if (!days || days.length === 0) {
    container.innerHTML = "<p>이 달에는 기록이 없습니다.</p>";
    return;
  }

  container.innerHTML = days
    .map(({ date, isToday, records }) => {
      const rows = records
        .map(
          (r) => `
          <tr>
            <td>${r.name}</td>
            <td>${r.attend}</td>
            <td>${r.leave}</td>
          </tr>
        `
        )
        .join("");

      return `
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
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");
}

// 월 탭 클릭 (이벤트 위임)
document.getElementById("monthTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".month-tab-btn");
  if (!btn) return;
  if (btn.dataset.month === selectedMonth) return;
  selectMonth(btn.dataset.month);
});

/* ==============================
   ⬇️ CSV 다운로드 (Excel에서 바로 열림)
================================ */

function toCSV(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");
}

function downloadCSV(filename, csvContent) {
  // UTF-8 BOM 추가 → Excel에서 한글 깨짐 방지
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById("downloadTodayBtn").addEventListener("click", () => {
  if (todayData.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }
  const todayKey = getTodayKeyIST();
  const rows = [
    ["Name", "Attend", "Leave"],
    ...todayData.map((r) => [r.name, r.attend, r.leave]),
  ];
  downloadCSV(`attendance_${todayKey}.csv`, toCSV(rows));
});

// 현재 선택된 달만 다운로드
document.getElementById("downloadMonthBtn").addEventListener("click", async () => {
  if (!historyLoaded) {
    await loadHistory();
    historyLoaded = true;
  }
  if (!selectedMonth) {
    alert("선택된 달이 없습니다.");
    return;
  }

  const days = await ensureMonthLoaded(selectedMonth);
  if (days.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const rows = [["Date", "Name", "Attend", "Leave"]];
  for (const { date, records } of days) {
    for (const r of records) rows.push([date, r.name, r.attend, r.leave]);
  }
  downloadCSV(`attendance_${selectedMonth}.csv`, toCSV(rows));
});

// 전체 달을 모두 불러와서 한 번에 다운로드
document.getElementById("downloadHistoryBtn").addEventListener("click", async () => {
  if (!historyLoaded) {
    await loadHistory();
    historyLoaded = true;
  }
  if (monthKeys.length === 0) {
    alert("다운로드할 History 데이터가 없습니다.");
    return;
  }

  const btn = document.getElementById("downloadHistoryBtn");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "불러오는 중...";

  try {
    // 아직 조회하지 않은 달들도 병렬로 모두 불러오기
    await Promise.all(monthKeys.map((mk) => ensureMonthLoaded(mk)));

    const rows = [["Date", "Name", "Attend", "Leave"]];
    for (const mk of monthKeys) {
      for (const { date, records } of monthCache[mk]) {
        for (const r of records) rows.push([date, r.name, r.attend, r.leave]);
      }
    }
    downloadCSV("attendance_history_all.csv", toCSV(rows));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
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
    await Promise.all(
      EMPLOYEES.map((name) =>
        deleteDoc(doc(db, "attendance", date, "records", name)).catch(() => {})
      )
    );
    await deleteDoc(doc(db, "attendance", date)).catch(() => {});

    // 화면/캐시에서도 즉시 제거 (재조회 없이 빠르게 반영)
    const monthKey = date.slice(0, 7);

    if (monthCache[monthKey]) {
      monthCache[monthKey] = monthCache[monthKey].filter((d) => d.date !== date);
    }
    if (monthDatesMap[monthKey]) {
      monthDatesMap[monthKey] = monthDatesMap[monthKey].filter((d) => d !== date);

      if (monthDatesMap[monthKey].length === 0) {
        delete monthDatesMap[monthKey];
        delete monthCache[monthKey];
        monthKeys = monthKeys.filter((mk) => mk !== monthKey);
        if (selectedMonth === monthKey) {
          selectedMonth = monthKeys[0] || null;
        }
      }
    }

    renderMonthTabs();
    if (selectedMonth) {
      renderHistoryDays(monthCache[selectedMonth] || []);
    } else {
      document.getElementById("historyContainer").innerHTML = "<p>No history yet.</p>";
    }

    alert(`"${date}" 데이터가 삭제되었습니다.`);
  } catch (e) {
    console.error(e);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// 오늘을 제외한 모든 과거 기록 삭제 (컬렉션 크기를 줄여 로딩 속도 개선)
async function deleteAllHistoryExceptToday() {
  const todayKey = getTodayKeyIST();
  const ok = confirm(
    `오늘(${todayKey})을 제외한 모든 과거 출석 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 시간이 다소 걸릴 수 있습니다.`
  );
  if (!ok) return;

  const deleteAllHistoryBtn = document.getElementById("deleteAllHistoryBtn");
  deleteAllHistoryBtn.disabled = true;
  deleteAllHistoryBtn.textContent = "삭제 중...";

  try {
    // 화면에 보이는 달뿐 아니라 실제 컬렉션 전체를 기준으로 삭제 대상 조회
    const snap = await getDocs(collection(db, "attendance"));
    const dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== todayKey);

    // ✅ 날짜별로 병렬 삭제 (각 날짜 내부의 직원 기록도 병렬 삭제)
    await Promise.all(
      dates.map(async (date) => {
        await Promise.all(
          EMPLOYEES.map((name) =>
            deleteDoc(doc(db, "attendance", date, "records", name)).catch(() => {})
          )
        );
        await deleteDoc(doc(db, "attendance", date)).catch(() => {});
      })
    );

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