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

/* ==============================
   Employees
================================ */
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
   IST Date Utility (UTC+5:30)
================================ */
function getTodayKeyIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function confirmSelectedName(action, name) {
  return window.confirm(
    `Is this you?\nSelected name: "${name}"\n\nPress OK to ${action}, or Cancel to go back.`
  );
}

async function ensureDayDocExists(dateKey) {
  const dayRef = doc(db, "attendance", dateKey);
  await setDoc(
    dayRef,
    { date: dateKey, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/* ==============================
   Sidebar + View Switch
================================ */
const STORAGE_VIEW_KEY = "main_active_view_v1";

const $sidebar = document.getElementById("sidebar");
const $sidebarToggle = document.getElementById("sidebarToggle");
const $navAttendance = document.getElementById("navAttendance");
const $navHoliday = document.getElementById("navHoliday");

const $viewAttendance = document.getElementById("viewAttendance");
const $viewHoliday = document.getElementById("viewHoliday");
const $pageTitle = document.getElementById("pageTitle");
const $todayKeyBadge = document.getElementById("todayKeyBadge");

if ($todayKeyBadge) {
  $todayKeyBadge.textContent = `Today (IST): ${getTodayKeyIST()}`;
}

$sidebarToggle?.addEventListener("click", () => {
  $sidebar.classList.toggle("is-collapsed");
});

function setActiveView(view) {
  const isAttendance = view === "attendance";

  $viewAttendance.classList.toggle("is-active", isAttendance);
  $viewHoliday.classList.toggle("is-active", !isAttendance);

  $navAttendance.classList.toggle("is-active", isAttendance);
  $navHoliday.classList.toggle("is-active", !isAttendance);

  $pageTitle.textContent = isAttendance ? "Attendance" : "Holiday";

  localStorage.setItem(STORAGE_VIEW_KEY, view);

  if (!isAttendance) holidayRenderAll();
}

$navAttendance?.addEventListener("click", () =>
  setActiveView("attendance")
);
$navHoliday?.addEventListener("click", () =>
  setActiveView("holiday")
);

setActiveView(localStorage.getItem(STORAGE_VIEW_KEY) || "attendance");

/* ==============================
   Attendance
================================ */
const select = document.getElementById("employeeSelect");
const attendBtn = document.getElementById("attendBtn");
const leaveBtn = document.getElementById("leaveBtn");

employees.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
});

/* Attend */
attendBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");

  if (!confirmSelectedName("Attend", name)) return;

  const todayKey = getTodayKeyIST();
  await ensureDayDocExists(todayKey);

  const ref = doc(db, "attendance", todayKey, "records", name);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().attendAt) {
    alert("Already attended today");
    return;
  }

  await setDoc(
    ref,
    { attendAt: serverTimestamp(), leaveAt: null },
    { merge: true }
  );

  await ensureDayDocExists(todayKey);
  alert("Attendance recorded");
};

/* Leave */
leaveBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");

  if (!confirmSelectedName("Leave", name)) return;

  const todayKey = getTodayKeyIST();
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

  await updateDoc(ref, { leaveAt: serverTimestamp() });
  await ensureDayDocExists(todayKey);

  alert("Leave recorded");
};

/* ==============================
   Holiday (List + Month View)
================================ */

const $holidayList = document.getElementById("holidayList");
const $monthCalendar = document.getElementById("monthCalendar");
const $hyYear = document.getElementById("hyYear");
const $hyMonth = document.getElementById("hyMonth");

let holidayByDate = new Map();

async function loadHolidaysForYear(yearNum) {
  const q = query(
    collection(db, "holidays"),
    where("year", "==", Number(yearNum)),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  const map = new Map();

  snap.forEach((d) => {
    const data = d.data();
    if (!data?.date) return;

    const arr = map.get(data.date) || [];
    arr.push({ name: data.name, date: data.date });
    map.set(data.date, arr);
  });

  return map;
}

async function holidayRenderAll() {
  const yearNum = Number($hyYear?.value);
  if (!Number.isFinite(yearNum)) return;

  holidayByDate = await loadHolidaysForYear(yearNum);

  renderHolidayList();
}

function renderHolidayList() {
  if (!$holidayList) return;

  const items = [];
  for (const [date, arr] of holidayByDate.entries()) {
    for (const h of arr) items.push(h);
  }
  items.sort((a, b) => a.date.localeCompare(b.date));

  $holidayList.innerHTML = "";

  for (const h of items) {
    const el = document.createElement("div");
    el.className = "holiday-item";
    el.innerHTML = `
      <div class="name">${h.name}</div>
      <div class="date">${h.date}</div>
    `;
    $holidayList.appendChild(el);
  }
}
