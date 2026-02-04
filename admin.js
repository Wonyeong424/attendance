import {
    collection, doc, getDocs,
    addDoc, updateDoc
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
  
  /* ===== 로그인 ===== */
  window.login = () => {
    const pw = document.getElementById("password").value;
    if (pw === "0317") {
      localStorage.setItem("admin", "true");
      initAdmin();
    } else {
      alert("Wrong password");
    }
  };
  
  window.logout = () => {
    localStorage.removeItem("admin");
    location.reload();
  };
  
  function initAdmin() {
    document.getElementById("login").style.display = "none";
    document.getElementById("admin").style.display = "flex";
    loadToday();
    loadHistory();
    loadStaff();
  }
  
  if (localStorage.getItem("admin") === "true") {
    initAdmin();
  }
  
  /* ===== 데이터 ===== */
  const today = new Date().toISOString().slice(0,10);
  
  /* TODAY */
  async function loadToday() {
    const box = document.getElementById("today");
    box.innerHTML = `<h2>Today (${today})</h2>`;
  
    const snap = await getDocs(collection(db,"attendance",today,"records"));
    if (snap.empty) {
      box.innerHTML += "<p>No records</p>";
      return;
    }
  
    snap.forEach(d=>{
      const r = d.data();
      box.innerHTML += `
        <p>
          ${d.id} |
          Attend: ${r.attendAt ? r.attendAt.toDate().toLocaleTimeString() : "-"} |
          Leave: ${r.leaveAt ? r.leaveAt.toDate().toLocaleTimeString() : "-"}
        </p>`;
    });
  }
  
  /* HISTORY */
  async function loadHistory() {
    const box = document.getElementById("history");
    box.innerHTML = "<h2>History</h2>";
  
    const snap = await getDocs(collection(db,"attendance"));
    snap.forEach(d=>{
      box.innerHTML += `<p>📅 ${d.id}</p>`;
    });
  }
  
  /* STAFF */
  async function loadStaff() {
    const box = document.getElementById("staff");
    box.innerHTML = `
      <h2>Staff</h2>
      <input id="newStaff" placeholder="Name">
      <button onclick="addStaff()">Add</button>
      <hr>
      <div id="staffList"></div>
    `;
  
    const list = document.getElementById("staffList");
    const snap = await getDocs(collection(db,"employees"));
  
    snap.forEach(d=>{
      if(!d.data().active) return;
      list.innerHTML += `
        <p>
          ${d.data().name}
          <button onclick="removeStaff('${d.id}')">Remove</button>
        </p>`;
    });
  }
  
  window.addStaff = async () => {
    const name = document.getElementById("newStaff").value;
    if (!name) return;
    await addDoc(collection(db,"employees"), { name, active:true });
    loadStaff();
  };
  
  window.removeStaff = async (id) => {
    await updateDoc(doc(db,"employees",id), { active:false });
    loadStaff();
  };
  
  