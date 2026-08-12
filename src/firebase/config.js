import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Firebase's apiKey is not a secret - it just identifies the project to
// Google's servers. Access control is enforced by Firestore security rules
// (see firestore.rules), not by hiding this config.
const firebaseConfig = {
  apiKey: "AIzaSyAF80e7iFM87xCr7jRzE8jtrmFSAPUzrTE",
  authDomain: "games-dd1a8.firebaseapp.com",
  projectId: "games-dd1a8",
  storageBucket: "games-dd1a8.firebasestorage.app",
  messagingSenderId: "533748049252",
  appId: "1:533748049252:web:2baebd312d7a572103c671",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
