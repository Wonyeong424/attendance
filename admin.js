import { db, getTodayKey } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded");

const ADMIN_PIN = "0317";

const EMPLOYEES = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee"
];

function formatTime(timestamp){
  if(!timestamp) return "-";
  const d = timestamp.toDate();
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h<12?"AM":"PM";
  const hour12 = h%12===0?12:h%12;
  return `${period} ${hour12}:${m.toString().padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded", ()=>{
  const pinBtn = document.getElementById("pinBtn");
  const pinInput = document.getElementById("pinInput");
  const pinError = document.getElementById("pinError");
  const pinSection = document.getElementById("pinSection");
  const adminSection = document.getElementById("adminSection");

  async function checkPin(){
    if(pinInput.value===ADMIN_PIN){
      pinSection.style.display="none";
      adminSection.style.display="block";
      await loadTodayAttendance();
    } else pinError.textContent="PIN이 올바르지 않습니다.";
  }

  pinBtn.addEventListener("click",checkPin);
  pinInput.addEventListener("keydown",e=>{ if(e.key==="Enter") checkPin(); });

  async function loadTodayAttendance(){
    const todayKey=getTodayKey();
    document.getElementById("title").textContent=`Today's Attendance (${todayKey})`;
    const tbody=document.getElementById("attendanceTable");
    tbody.innerHTML="";
    for(const name of EMPLOYEES){
      const ref=doc(db,"attendance",todayKey,"records",name);
      const snap=await getDoc(ref);
      const attend = snap.exists()&&snap.data().attendAt ? formatTime(snap.data().attendAt) : "-";
      const leave  = snap.exists()&&snap.data().leaveAt  ? formatTime(snap.data().leaveAt)  : "-";
      tbody.innerHTML+=`<tr><td>${name}</td><td>${attend}</td><td>${leave}</td></tr>`;
    }
  }

  const toggleBtn=document.getElementById("toggleHistory");
  const historySection=document.getElementById("historySection");
  let historyLoaded=false;

  toggleBtn.addEventListener("click",async ()=>{
    const open=historySection.style.display==="block";
    historySection.style.display=open?"none":"block";
    toggleBtn.textContent=open?"View more ▼":"Hide ▲";
    if(!historyLoaded){ await loadHistory(); historyLoaded=true; }
  });

  async function loadHistory(){
    const todayKey=getTodayKey();
    const container=document.getElementById("historyContainer");
    container.innerHTML="";
    const snap=await getDocs(collection(db,"attendance"));
    const dates=snap.docs.map(d=>d.id).filter(d=>d!==todayKey).sort((a,b)=>b.localeCompare(a));

    for(const date of dates){
      let html=`<div class="history-day"><h4>${date}</h4><table><tr><th>Name</th><th>Attend</th><th>Leave</th></tr>`;
      for(const name of EMPLOYEES){
        const ref=doc(db,"attendance",date,"records",name);
        const snap=await getDoc(ref);
        const attend = snap.exists()&&snap.data().attendAt ? formatTime(snap.data().attendAt) : "-";
        const leave  = snap.exists()&&snap.data().leaveAt  ? formatTime(snap.data().leaveAt)  : "-";
        html+=`<tr><td>${name}</td><td>${attend}</td><td>${leave}</td></tr>`;
      }
      html+="</table></div>";
      container.innerHTML+=html;
    }
  }
});

