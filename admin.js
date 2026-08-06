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
   📜 History (Promise.all 병렬 로딩)
   ✅ IST "오늘"도 History에 포함 (필터 없음)
================================ */

// 다운로드/삭제에서 재사용할 수 있도록 저장
// [{ date, isToday, records: [{ name, attend, leave }] }]
let historyData = [];

async function loadHistory() {
  const todayKey = getTodayKeyIST();
  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading...";

  try {
    const snap = await getDocs(collection(db, "attendance"));

    // ✅ 날짜 문서 ID만 추출 (YYYY-MM-DD), 최근 30일
    const dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 30);

    if (dates.length === 0) {
      historyData = [];
      container.innerHTML = "<p>No history yet.</p>";
      return;
    }

    // ✅ 날짜 x 직원 전체를 동시에 요청 (예: 30일 x 8명 = 최대 240건을 병렬로)
    historyData = await Promise.all(
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

    renderHistory();
  } catch (e) {
    console.error(e);
    historyData = [];
    container.innerHTML = `
      <p style="color:red;">Failed to load history</p>
    `;
  }
}

// historyData 배열을 화면에 그리기 (삭제 후 재사용)
function renderHistory() {
  const container = document.getElementById("historyContainer");

  if (historyData.length === 0) {
    container.innerHTML = "<p>No history yet.</p>";
    return;
  }

  container.innerHTML = historyData
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

document.getElementById("downloadHistoryBtn").addEventListener("click", async () => {
  if (!historyLoaded) {
    await loadHistory();
    historyLoaded = true;
  }
  if (historyData.length === 0) {
    alert("다운로드할 History 데이터가 없습니다.");
    return;
  }

  const rows = [["Date", "Name", "Attend", "Leave"]];
  for (const { date, records } of historyData) {
    for (const r of records) {
      rows.push([date, r.name, r.attend, r.leave]);
    }
  }
  downloadCSV(`attendance_history.csv`, toCSV(rows));
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

    // 화면에서도 즉시 제거 (재조회 없이 빠르게 반영)
    historyData = historyData.filter((d) => d.date !== date);
    renderHistory();

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
    // 화면에 보이는 최근 30일뿐 아니라 실제 컬렉션 전체를 기준으로 삭제 대상 조회
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