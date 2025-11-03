import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

const usernameForm = document.getElementById("usernameForm");
const message = document.getElementById("message");

// === Guard so this runs only once per session ===
let checkedAuth = false;

onAuthStateChanged(auth, async (user) => {
  if (checkedAuth) return;      // prevents multiple triggers
  checkedAuth = true;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await user.reload();

  if (!user.emailVerified) {
    message.textContent = "Please verify your email before proceeding.";
    await auth.signOut();
    return;
  }

  // ✅ user verified, stay on this page until they pick username
  console.log("Auth state confirmed for:", user.email);
});

usernameForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const user = auth.currentUser;

  if (!username) {
    message.textContent = "Username cannot be empty.";
    return;
  }
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    await setDoc(doc(db, "users", user.uid), {
    username: username,
    email: user.email
    }, { merge: true });

    message.textContent = "Username saved successfully!";
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    console.error("Error saving username:", error);
    message.textContent = "Failed to save username.";
  }
});
