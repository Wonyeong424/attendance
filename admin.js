console.log("admin.js loaded");

const firebaseConfig = {
  apiKey: "AIzaSyBDmKX2EzmZQYtLhGWHPhrNiAbYMQpsEPI",
  authDomain: "attendance-app-4cc52.firebaseapp.com",
  projectId: "attendance-app-4cc52",
  storageBucket: "attendance-app-4cc52.firebasestorage.app",
  messagingSenderId: "862990205208",
  appId: "1:862990205208:web:f6caa206cd05c86a8a9e6d"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const today = new Date().toISOString().split("T")[0];

document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("adminLogTable");
  table.innerHTML = "";

  db.collection("attendance")
    .where("date", "==", today)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        table.innerHTML = `
          <tr>
            <td colspan="4">No attendance records today</td>
          </tr>
        `;
        return;
      }

      snapshot.forEach(doc => {
        const d = doc.data();
        const row = `
          <tr>
            <td>${d.date}</td>
            <td>${d.name}</td>
            <td>${d.checkIn || "-"}</td>
            <td>${d.checkOut || "-"}</td>
          </tr>
        `;
        table.innerHTML += row;
      });
    });
});

