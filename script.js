import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const employees = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee",
];

/* ==============================
   🇮🇳 IST 날짜키 유틸 (UTC+5:30)
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

