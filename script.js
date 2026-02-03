// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBDmKX2EzmZQYtLhGWHPhrNiAbYMQpsEPI",
  authDomain: "attendance-app-4cc52.firebaseapp.com",
  projectId: "attendance-app-4cc52",
  storageBucket: "attendance-app-4cc52.firebasestorage.app",
  messagingSenderId: "862990205208",
  appId: "1:862990205208:web:f6caa206cd05c86a8a9e6d"
};

// Init Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const today = new Date().toISOString().split("T")[0];

// Check In
function checkIn() {
  const name = document.getElementById("nameSelect").value;
  if (!name) {
    alert("Please select a name");
    return;
  }

  db.collection("attendance").add({
    name: name,
    date: today,
    checkIn: new Date().toLocaleTimeString(),
    checkOut: "",
    workTime: ""
  }).then(() => {
    alert("Check-in saved");
  });
}

// Check Out
function checkOut() {
  const name = document.getElementById("nameSelect").value;
  if (!name) {
    alert("Please select a name");
    return;
  }

  db.collection("attendance")
    .where("name", "==", name)
    .where("date", "==", today)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        alert("No check-in record found");
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const start = new Date(`${today} ${data.checkIn}`);
        const end = new Date();

        const diff = end - start;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);

        db.collection("attendance").doc(doc.id).update({
          checkOut: end.toLocaleTimeString(),
          workTime: `${h}h ${m}m`
        });
      });

      alert("Check-out saved");
    });
}

