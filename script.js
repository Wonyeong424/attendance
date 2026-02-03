// 🔥 Firebase 설정 (네 config로 교체)
const firebaseConfig = {
    apiKey: "AIzaSyBDmKX2EzmZQYtLhGWHPhrNiAbYMQpsEPI",
    authDomain: "attendance-app-4cc52.firebaseapp.com",
    projectId: "attendance-app-4cc52",
    storageBucket: "attendance-app-4cc52.firebasestorage.app",
    messagingSenderId: "862990205208",
    appId: "1:862990205208:web:f6caa206cd05c86a8a9e6d",
    measurementId: "G-50DWEKYNKH"
  };


  
  // 초기화
  firebase.initializeApp(firebaseConfig);
  
  const auth = firebase.auth();
  const db = firebase.firestore();

  const ADMIN_EMAIL = "12brain1016@naver.com";
  
  const today = new Date().toISOString().split("T")[0];
  
  // 회원가입
  function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => alert("회원가입 완료"))
      .catch(err => alert(err.message));
  }
  
  // 로그인
  function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    auth.signInWithEmailAndPassword(email, password)
      .then(() => alert("로그인 성공"))
      .catch(err => alert(err.message));
  }
  
  // 출근
  function checkIn() {
    const user = auth.currentUser;
    if (!user) return alert("로그인 먼저 해줘!");
  
    db.collection("attendance")
      .doc(today)
      .collection("logs")
      .doc(user.uid)
      .set({
        email: user.email,
        checkIn: new Date().toLocaleTimeString(),
        date: today
      }, { merge: true });
  
    alert("출근 기록 완료!");
  }
  
  // 퇴근
  function checkOut() {
    const user = auth.currentUser;
    if (!user) return alert("로그인 먼저 해줘!");
  
    db.collection("attendance")
      .doc(today)
      .collection("logs")
      .doc(user.uid)
      .set({
        checkOut: new Date().toLocaleTimeString()
      }, { merge: true });
  
    alert("퇴근 기록 완료!");
  }
 
  


  function loadAllLogsForAdmin() {
    auth.onAuthStateChanged(user => {
      if (!user) {
        alert("로그인 필요");
        location.href = "index.html";
        return;
      }
  
      if (user.email !== ADMIN_EMAIL) {
        alert("관리자만 접근 가능합니다");
        location.href = "index.html";
        return;
      }
  
      db.collection("attendance")
        .get()
        .then(snapshot => {
          const table = document.getElementById("adminLogTable");
          table.innerHTML = "";
  
          snapshot.forEach(dateDoc => {
            const date = dateDoc.id;
  
            dateDoc.ref
              .collection("logs")
              .get()
              .then(logsSnap => {
                logsSnap.forEach(logDoc => {
                  const d = logDoc.data();
  
                  const row = `
                    <tr>
                      <td>${date}</td>
                      <td>${d.email}</td>
                      <td>${d.checkIn || "-"}</td>
                      <td>${d.checkOut || "-"}</td>
                    </tr>
                  `;
                  table.innerHTML += row;
                });
              });
          });
        });
    });
  }
    
  if (document.getElementById("adminLogTable")) {
    loadAllLogsForAdmin();
  }
  