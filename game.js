// ✅ GAME.JS — Progress + Score Controlled by GameMaker Events

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { increment } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js"

/* Same Firebase config as other screens */
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

const iframe = document.getElementById("gameFrame");
const proceedBtn = document.getElementById("proceedBtn");
const backBtn = document.getElementById("backBtn");
const currentScoreEl = document.getElementById("currentScore");
const addedScoreEl = document.getElementById("addedScore");

// ✅ Default state: Proceed disabled & hidden
proceedBtn.disabled = true;
proceedBtn.style.opacity = "0.5";
proceedBtn.style.pointerEvents = "none";

const query = new URLSearchParams(window.location.search);
const gameId = query.get("id") || "1";
const resumeScene = query.get("resumeScene") || "";
iframe.src = `games/game${gameId}/index.html`;

let currentUser = null;
let addedScore = 0;
let completed = false;
let pendingUnlocks = {};  // ✅ Initialize the object
let pendingLevel = null;

// ✅ Check login
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "login.html";
  currentUser = user;

  // Load base score
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    currentScoreEl.textContent = snap.data().score || 0;
  }
});

function showBadgeModal(badge) {
  const modal = document.getElementById("badgeModal");
  const badgeImage = document.getElementById("badgeImage");
  const badgeText = document.getElementById("badgeText");

  // Assign badge art + name
  const badgeInfo = {
    safety_first: { img: "Images/Badges/safety_first.png", text: "Safety First!" },
    maintenance_planner: { img: "Images/Badges/maintenance_planner.png", text: "Maintenance Planner!" },
    system_guardian: { img: "Images/Badges/system_guardian.png", text: "System Guardian!" },
    elite_technician: { img: "Images/Badges/elite_technician.png", text: "Elite Technician!" }
  };

  if (badgeInfo[badge]) {
    badgeImage.src = badgeInfo[badge].img;
    badgeText.textContent = badgeInfo[badge].text;
  } else {
    badgeImage.src = "";
    badgeText.textContent = badge;
  }

  modal.style.display = "flex";

  // Close behavior
  document.getElementById("badgeClose").onclick = () => modal.style.display = "none";
  document.getElementById("badgeOkBtn").onclick = () => modal.style.display = "none";
}


window.addEventListener("message", async (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {

    case "scoreUpdate":
      addedScore = Number(msg.value || 0);
      if (addedScoreEl) addedScoreEl.textContent = addedScore;
      break;

    case "failedAttempt":
      if (currentUser && addedScore > 0) {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          score: increment(addedScore)
        });
        addedScore = 0;
        if (addedScoreEl) addedScoreEl.textContent = 0;

        // refresh visible score
        const snap = await getDoc(userRef);
        if (snap.exists() && currentScoreEl) {
          currentScoreEl.textContent = snap.data().score || 0;
        }
      }
      break;

    case "completed":
      completed = true;
      break;

    case "badgeUnlock":
      pendingUnlocks[msg.badge] = true;
      showBadgeModal(msg.badge);
      break;

  case "end": {
   // Save the scene destination sent from GM
   const nextScene = msg.nextScene || resumeScene || (parseInt(query.get("scene") || 1) + 1);
   proceedBtn.dataset.nextScene = nextScene;
   console.log("END received. NextScene from GM = ", msg.nextScene);

   // Show and enable button
   proceedBtn.style.display = "inline-block";
   proceedBtn.disabled = false;
   proceedBtn.classList.add("attention");
   break;
  }

  }
});

proceedBtn.addEventListener("click", async () => {
  if (!completed) return; // Prevent cheating

  const userRef = doc(db, "users", currentUser.uid);
  const updateData = {};

  // ✅ Apply pending score
  if (addedScore > 0) updateData.score = increment(addedScore);

  // ✅ Apply pending badges
  for (const badge in pendingUnlocks) {
    updateData[badge] = true;
  }

  // ✅ Determine next scene (stored in dataset by the "end" message)
  const nextScene = proceedBtn.dataset.nextScene || resumeScene || 1;
  updateData.progress = Number(nextScene);

  await updateDoc(userRef, updateData);

  // ✅ Prevent double-click glitch
  proceedBtn.disabled = true;

  // ✅ Continue story
  window.location.href = `story.html?scene=${nextScene}`;
});


// ✅ Back button → warning modal recommended later
backBtn.addEventListener("click", async () => {
  if (currentUser && addedScore > 0) {
    const userRef = doc(db, "users", currentUser.uid);

    await updateDoc(userRef, {
      score: increment(addedScore)
    });

    addedScore = 0;
    if (addedScoreEl) addedScoreEl.textContent = 0;

    // ✅ Refresh on-screen score before leaving
    const snap = await getDoc(userRef);
    if (snap.exists() && currentScoreEl) {
      currentScoreEl.textContent = snap.data().score || 0;
    }
  }

  // ✅ Exit without progressing story
  window.location.href = "dashboard.html";
});


// ✅ Save score + update story progress
async function finalizeAndContinue(nextScene) {
  // Save score permanently
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const newTotal = (snap.data().score || 0) + addedScore;

  await updateDoc(ref, {
    score: newTotal,
    progress: Number(nextScene),
    [`game${gameId}_complete`]: true
  });

  window.location.href = `story.html?scene=${nextScene}`;
}
