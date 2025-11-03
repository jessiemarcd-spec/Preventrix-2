// --- imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// --- Firebase setup ---
const firebaseConfig = {
  apiKey: "AIzaSyA5oAMPGg8I6N1c5W8jlDkZUVltChk1Y8A",
  authDomain: "gamesite-9850d.firebaseapp.com",
  projectId: "gamesite-9850d",
  storageBucket: "gamesite-9850d.firebasestorage.app",
  messagingSenderId: "757972868175",
  appId: "1:757972868175:web:043b2969258cf0bdfdde3a"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Single login button handler ---
document.getElementById("loginBtn").addEventListener("click", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await user.reload();

    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      await auth.signOut();
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().username) {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "create_username.html";
    }
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    alert("Invalid email or password. Please try again.");
  }
});

// --- Background session auto-redirect ---
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  await user.reload();
  console.log("Auth state changed:", user ? user.email : "No user logged in");

  if (window.redirecting) return;
  window.redirecting = true;

  if (!user.emailVerified) {
    await auth.signOut();
    window.redirecting = false;
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().username) {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "create_username.html";
    }
  } catch (error) {
    console.error("Error checking username:", error);
    window.redirecting = false;
  }
});


