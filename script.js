import { db } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const employees = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee"
];

const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

const select = document.getElementById("employeeSelect");
const attendBtn = document.getElementById("attendBtn");
const leaveBtn = document.getElementById("leaveBtn");

employees.forEach(name=>{
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
});

attendBtn.onclick = async ()=>{
  const name = select.value;
  if(!name) return alert("Select your name");

  const ref = doc(db,"attendance",today,"records",name);
  const snap = await getDoc(ref);

  if(snap.exists() && snap.data().attendAt){
    alert("Already attended today");
    return;
  }

  await setDoc(ref,{
    attendAt: serverTimestamp(),
    leaveAt: null
  },{merge:true});

  alert("Attendance recorded");
};

leaveBtn.onclick = async ()=>{
  const name = select.value;
  if(!name) return alert("Select your name");

  const ref = doc(db,"attendance",today,"records",name);
  const snap = await getDoc(ref);

  if(!snap.exists() || !snap.data().attendAt){
    alert("Attend first");
    return;
  }

  if(snap.data().leaveAt){
    alert("Already left");
    return;
  }

  await updateDoc(ref,{
    leaveAt: serverTimestamp()
  });

  alert("Leave recorded");
};

