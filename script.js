import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const employees = [
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
   🇮🇳 IST 날짜키 유틸 (UTC+5:30)
================================ */
function getISTDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

function getTodayKeyIST() {
  const ist = getISTDate();
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function confirmSelectedName(action, name) {
  // action: "Attend" | "Leave"
  return window.confirm(
    `Is this you?\nSelected name: "${name}"\n\nPress OK to ${action}, or Cancel to go back.`
  );
}

// ✅ 날짜(부모) 문서를 "실제로 존재"하게 만들기 (History list가 가능해짐)
async function ensureDayDocExists(dateKey) {
  const dayRef = doc(db, "attendance", dateKey);
  await setDoc(
    dayRef,
    {
      date: dateKey,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* ==============================
   UI elements
================================ */
const select = document.getElementById("employeeSelect");
const attendBtn = document.getElementById("attendBtn");
const leaveBtn = document.getElementById("leaveBtn");

// 드롭다운 채우기
employees.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
});

/* ==============================
   Attend
================================ */
attendBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");

  // ✅ 실수 방지 확인 팝업
  if (!confirmSelectedName("Attend", name)) return;

  const todayKey = getTodayKeyIST();

  // ✅ 날짜 문서 생성/갱신 (History를 위해 필수)
  await ensureDayDocExists(todayKey);

  const ref = doc(db, "attendance", todayKey, "records", name);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().attendAt) {
    alert("Already attended today");
    return;
  }

  await setDoc(
    ref,
    {
      attendAt: serverTimestamp(),
      leaveAt: null,
    },
    { merge: true }
  );

  // ✅ 날짜 문서 갱신(선택이지만 유용)
  await ensureDayDocExists(todayKey);

  alert("Attendance recorded");
};

/* ==============================
   Leave
================================ */
leaveBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");

  // ✅ 실수 방지 확인 팝업
  if (!confirmSelectedName("Leave", name)) return;

  const todayKey = getTodayKeyIST();

  // ✅ 날짜 문서 생성/갱신 (History를 위해 필수)
  await ensureDayDocExists(todayKey);

  const ref = doc(db, "attendance", todayKey, "records", name);
  const snap = await getDoc(ref);

  if (!snap.exists() || !snap.data().attendAt) {
    alert("Attend first");
    return;
  }

  if (snap.data().leaveAt) {
    alert("Already left");
    return;
  }

  await updateDoc(ref, {
    leaveAt: serverTimestamp(),
  });

  // ✅ 날짜 문서 갱신
  await ensureDayDocExists(todayKey);

  alert("Leave recorded");
};

/* ==============================
   📅 Company Holidays Calendar
   관리자(admin.html)에서 등록한 "holidays" 컬렉션을
   { name, date:"YYYY-MM-DD", year:Number } 스키마 그대로 읽어와서
   달력 형태로 표시하고, 휴일 날짜 아래에 이름을 보여줍니다.
================================ */
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const calMonthLabel = document.getElementById("calMonthLabel");
const calWeekdaysEl = document.getElementById("calWeekdays");
const calGridEl = document.getElementById("calGrid");
const calPrevBtn = document.getElementById("calPrevBtn");
const calNextBtn = document.getElementById("calNextBtn");
const calTodayBtn = document.getElementById("calTodayBtn");

let calYear, calMonth; // calMonth: 1-12
let holidayByDate = new Map(); // "YYYY-MM-DD" -> [name, ...]

function initCalendarDefaults() {
  const ist = getISTDate();
  calYear = ist.getFullYear();
  calMonth = ist.getMonth() + 1;
}

function toISO(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function loadHolidaysForYear(year) {
  const map = new Map();
  try {
    const qy = query(
      collection(db, "holidays"),
      where("year", "==", Number(year)),
      orderBy("date", "asc")
    );
    const snap = await getDocs(qy);
    snap.forEach((d) => {
      const data = d.data();
      if (!data?.date) return;
      const arr = map.get(data.date) || [];
      arr.push(data.name || "Holiday");
      map.set(data.date, arr);
    });
  } catch (e) {
    console.error("Failed to load holidays", e);
  }
  return map;
}

function renderWeekdayHeader() {
  calWeekdaysEl.innerHTML = weekdayLabels.map((w) => `<span>${w}</span>`).join("");
}

function renderCalendarGrid() {
  calMonthLabel.textContent = `${monthNames[calMonth - 1]} ${calYear}`;

  const mIndex = calMonth - 1;
  const first = new Date(calYear, mIndex, 1);
  const last = new Date(calYear, mIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startDow = first.getDay();
  const prevLastDate = new Date(calYear, mIndex, 0).getDate();
  const todayKey = getTodayKeyIST();

  calGridEl.innerHTML = "";

  for (let cell = 0; cell < 42; cell++) {
    const dayNum = cell - startDow + 1;
    let displayNum, iso;
    let muted = false;

    if (dayNum <= 0) {
      displayNum = prevLastDate + dayNum;
      const py = mIndex === 0 ? calYear - 1 : calYear;
      const pm = mIndex === 0 ? 12 : mIndex;
      iso = toISO(py, pm, displayNum);
      muted = true;
    } else if (dayNum > daysInMonth) {
      displayNum = dayNum - daysInMonth;
      const ny = mIndex === 11 ? calYear + 1 : calYear;
      const nm = mIndex === 11 ? 1 : mIndex + 2;
      iso = toISO(ny, nm, displayNum);
      muted = true;
    } else {
      displayNum = dayNum;
      iso = toISO(calYear, calMonth, displayNum);
    }

    const dayEl = document.createElement("div");
    dayEl.className = "cal-day";
    if (muted) dayEl.classList.add("is-muted");
    if (iso === todayKey) dayEl.classList.add("is-today");

    const names = holidayByDate.get(iso);
    if (names && names.length) {
      dayEl.classList.add("is-holiday");
      dayEl.title = names.join(", ");
    }

    const numEl = document.createElement("div");
    numEl.className = "num";
    numEl.textContent = String(displayNum);
    dayEl.appendChild(numEl);

    if (names && names.length) {
      const nameEl = document.createElement("div");
      nameEl.className = "cal-holiday-name";
      nameEl.textContent = names.join(", ");
      dayEl.appendChild(nameEl);
    }

    calGridEl.appendChild(dayEl);
  }
}

async function refreshCalendar() {
  holidayByDate = await loadHolidaysForYear(calYear);
  renderCalendarGrid();
}

calPrevBtn.addEventListener("click", () => {
  calMonth -= 1;
  if (calMonth < 1) {
    calMonth = 12;
    calYear -= 1;
  }
  refreshCalendar();
});

calNextBtn.addEventListener("click", () => {
  calMonth += 1;
  if (calMonth > 12) {
    calMonth = 1;
    calYear += 1;
  }
  refreshCalendar();
});

calTodayBtn.addEventListener("click", () => {
  initCalendarDefaults();
  refreshCalendar();
});

initCalendarDefaults();
renderWeekdayHeader();
refreshCalendar();
