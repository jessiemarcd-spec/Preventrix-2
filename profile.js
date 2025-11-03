// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

/* ---------- CONFIG - replace with your project's config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyA5oAMPGg8I6N1c5W8jlDkZUVltChk1Y8A",
  authDomain: "gamesite-9850d.firebaseapp.com",
  projectId: "gamesite-9850d",
  storageBucket: "gamesite-9850d.firebasestorage.app",
  messagingSenderId: "757972868175",
  appId: "1:757972868175:web:043b2969258cf0bdfdde3a"
};
/* ----------------------------------------------------------------- */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* DOM refs */
const usernameInput = document.getElementById("username");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");

const emailInput = document.getElementById("email");
const emailCurrentPw = document.getElementById("emailCurrentPw");
const changeEmailBtn = document.getElementById("changeEmailBtn");

const newPasswordInput = document.getElementById("newPassword");
const currentPasswordForPw = document.getElementById("currentPasswordForPw");
const changePasswordBtn = document.getElementById("changePasswordBtn");

const fileInput = document.getElementById("fileInput");
const avatarPreview = document.getElementById("avatarPreview");
const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
const uploadMessage = document.getElementById("uploadMessage");

const profileMessage = document.getElementById("profileMessage");
const saveBtn = document.getElementById("saveBtn");
const backBtn = document.getElementById("backBtn");

/* header dropdown elements (for continuity) */
const profilePicTop = document.getElementById("profilePicTop");
const dropdownMenu = document.getElementById("dropdownMenu");
const profileSettingsLink = document.getElementById("profileSettingsLink");
const logoutBtnTop = document.getElementById("logoutBtnTop");

/* hook up topbar dropdown */
if (profilePicTop) {
  profilePicTop.addEventListener("click", () => dropdownMenu.classList.toggle("show"));
  document.addEventListener("click", (e) => {
    if (!profilePicTop.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove("show");
    }
  });
}
if (profileSettingsLink) profileSettingsLink.addEventListener("click", (e) => { e.preventDefault(); /* already here */ });
if (logoutBtnTop) logoutBtnTop.addEventListener("click", async (e) => { e.preventDefault(); await signOut(auth); window.location.href = "login.html"; });

/* keep currently signed user locally */
let currentUser = null;
let currentUserDoc = null;

/* AUTH state - populate fields */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // load user doc if exists
  const udocRef = doc(db, "users", user.uid);
  const udocSnap = await getDoc(udocRef);

  if (!udocSnap.exists()) {
    // If there is no Firestore doc, create a minimal one to avoid errors
    await setDoc(udocRef, {
      email: user.email || "",
      username: user.displayName || "",
      score: 0,
      safety_first: false,
      maintenance_planner: false,
      system_guardian: false,
      elite_technician: false,
      admin: false
    });
    currentUserDoc = (await getDoc(udocRef)).data();
  } else {
    currentUserDoc = udocSnap.data();
  }

  // populate fields
  usernameInput.value = currentUserDoc.username || "";
  emailInput.value = currentUser.email || currentUserDoc.email || "";

  // avatar
  if (currentUserDoc.photoURL) {
    avatarPreview.src = currentUserDoc.photoURL;
    if (profilePicTop) profilePicTop.src = currentUserDoc.photoURL;
  } else if (currentUser.photoURL) {
    avatarPreview.src = currentUser.photoURL;
    if (profilePicTop) profilePicTop.src = currentUser.photoURL;
  } else {
    // leave default
  }
});

/* ---------- USERNAME change (merges) ---------- */
changeUsernameBtn.addEventListener("click", async () => {
  const newUsername = usernameInput.value.trim();
  if (!newUsername) { profileMessage.textContent = "Username cannot be empty."; return; }

  try {
    const uRef = doc(db, "users", currentUser.uid);
    await updateDoc(uRef, { username: newUsername });
    profileMessage.textContent = "Username updated.";
  } catch (err) {
    console.error(err);
    profileMessage.textContent = "Failed to update username.";
  }
});

/* ---------- EMAIL change (requires reauth) ---------- */
changeEmailBtn.addEventListener("click", async () => {
  const newEmail = emailInput.value.trim();
  const currentPw = emailCurrentPw.value || "";

  if (!newEmail) { profileMessage.textContent = "Email cannot be empty."; return; }
  if (!currentPw) { profileMessage.textContent = "Current password required to change email."; return; }

  try {
    // reauthenticate
    const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
    await reauthenticateWithCredential(currentUser, cred);

    // perform email update
    await updateEmail(currentUser, newEmail);

    // store new email in Firestore
    const uRef = doc(db, "users", currentUser.uid);
    await updateDoc(uRef, { email: newEmail });

    profileMessage.textContent = "Email updated successfully. Please re-login if prompted.";
    emailCurrentPw.value = "";
  } catch (err) {
    console.error("Email change failed:", err);
    profileMessage.textContent = `Failed to change email: ${err.message || err}`;
  }
});

/* ---------- PASSWORD change (reauth required) ---------- */
changePasswordBtn.addEventListener("click", async () => {
  const newPw = newPasswordInput.value || "";
  const currentPw = currentPasswordForPw.value || "";

  if (!newPw || newPw.length < 6) { profileMessage.textContent = "New password must be at least 6 characters."; return; }
  if (!currentPw) { profileMessage.textContent = "Current password required to change password."; return; }

  try {
    const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
    await reauthenticateWithCredential(currentUser, cred);
    await updatePassword(currentUser, newPw);
    profileMessage.textContent = "Password changed successfully.";
    newPasswordInput.value = ""; currentPasswordForPw.value = "";
  } catch (err) {
    console.error("Password change failed:", err);
    profileMessage.textContent = `Failed to change password: ${err.message || err}`;
  }
});

/* ---------- Avatar preview (client-side) ---------- */
fileInput.addEventListener("change", () => {
  uploadMessage.textContent = "";
  const file = fileInput.files[0];
  if (!file) return;

  // quick client-side size & type check
  if (file.size > 1 * 1024 * 1024) {
    uploadMessage.textContent = "File too large. Max 1 MB.";
    fileInput.value = "";
    return;
  }
  const url = URL.createObjectURL(file);
  avatarPreview.src = url;
});

/* ---------- Upload avatar to Firebase Storage ---------- */
uploadAvatarBtn.addEventListener("click", async () => {
  uploadMessage.textContent = "";
  if (!fileInput.files[0]) { uploadMessage.textContent = "No file selected."; return; }
  const file = fileInput.files[0];

  // final safety checks
  if (!file.type.startsWith("image/")) { uploadMessage.textContent = "Please upload an image file."; return; }
  if (file.size > 1 * 1024 * 1024) { uploadMessage.textContent = "File too large. Max 1 MB."; return; }

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `profilePictures/${currentUser.uid}.${ext}`;
    const sRef = storageRef(storage, storagePath);

    // upload
    await uploadBytes(sRef, file);

    // get public URL
    const url = await getDownloadURL(sRef);

    // update Firestore & optionally Firebase Auth photoURL
    const uRef = doc(db, "users", currentUser.uid);
    await updateDoc(uRef, { photoURL: url });

    // If you want: also set auth photoURL (optional)
    // await updateProfile(currentUser, { photoURL: url });

    // update UI
    avatarPreview.src = url;
    if (profilePicTop) profilePicTop.src = url;
    uploadMessage.style.color = "#007700";
    uploadMessage.textContent = "Uploaded successfully.";
    fileInput.value = "";
  } catch (err) {
    console.error("Upload failed:", err);
    uploadMessage.style.color = "#b00020";
    uploadMessage.textContent = "Upload failed. Try again.";
  }
});

/* ---------- Save & Back (simple) ---------- */
saveBtn.addEventListener("click", (e) => {
  profileMessage.textContent = "All changes saved (if any).";
});

backBtn.addEventListener("click", (e) => {
  window.location.href = "dashboard.html";
});

/* safety: hide dropdown on outside click (already wired in other pages, but double ensure) */
document.addEventListener("click", (e) => {
  if (dropdownMenu && profilePicTop && !profilePicTop.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.remove("show");
  }
});
