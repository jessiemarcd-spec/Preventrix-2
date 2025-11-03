import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Firebase config
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

// ✅ Make currentUser accessible everywhere
let currentUser = null;

// Auth listener
onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login.html";
    currentUser = user;
    loadUserScore();
    loadLeaderboard();
});

// Profile dropdown logic
const profilePic = document.getElementById("profilePic");
const dropdownMenu = document.getElementById("dropdownMenu");

// Toggle profile menu when profile picture is clicked
profilePic.addEventListener("click", () => {
  dropdownMenu.classList.toggle("show");
});

// Close the dropdown if clicked outside of it
document.addEventListener("click", (e) => {
  if (!profilePic.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.remove("show");
  }
});

// Handle logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
});

// Load user data and score
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("userScore").textContent = userData.score ?? 0; // Display the user's score
  } else {
    window.location.href = "create_username.html";
  }
});

// Listen for score updates from GameMaker game
window.addEventListener("message", async (event) => {
  if (event.data.type === "updateScore") {
    const newScore = event.data.newScore;
    const user = auth.currentUser;
    if (!user) return;

    // Update Firestore with the new score
    const userDocRef = doc(db, "users", user.uid);
    try {
      await setDoc(userDocRef, { score: newScore }, { merge: true });
      document.getElementById("userScore").textContent = newScore; // Update the displayed score
    } catch (error) {
      console.error("Error updating score:", error);
    }
  }
});

// Story Mode Open Button
document.getElementById("storyModeBtn").addEventListener("click", async () => {
  document.getElementById("storyModal").classList.remove("hidden");

  // Get latest user progress
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const progress = userDoc.data().progress || 1;

  const continueBtn = document.getElementById("continueBtn");

  // If progress > 1, allow Continue
  if (progress > 1) {
    continueBtn.classList.remove("hidden");
  } else {
    continueBtn.classList.add("hidden");
  }
});

// New Game Button
document.getElementById("newGameBtn").addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUser.uid), { progress: 1 });
  window.location.href = "story.html?scene=1";
});

// Continue Button
document.getElementById("continueBtn").addEventListener("click", async () => {
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const progress = userDoc.data().progress || 1;
  window.location.href = `story.html?scene=${progress}`;
});

// Close modal
document.getElementById("closeStoryModal").addEventListener("click", () => {
  document.getElementById("storyModal").classList.add("hidden");
});


// =============================
// LOAD LEADERBOARD
// =============================
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

async function loadLeaderboard() {
  const leaderboardBody = document.getElementById("leaderboardBody");
  leaderboardBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    let users = [];
    leaderboardBody.innerHTML = ""; // clear existing rows
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        name: data.username || data.email || "Unknown User",
        score: data.score || 0,
        badges: {
          safety_first: !!data.safety_first,
          maintenance_planner: !!data.maintenance_planner,
          system_guardian: !!data.system_guardian,
          elite_technician: !!data.elite_technician,
        },
      });
    });

    // Sort by score (descending)
    users.sort((a, b) => b.score - a.score);

    leaderboardBody.innerHTML = "";

    users.forEach((player, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>
          ${renderBadges(player.badges)}
        </td>
        <td>${player.score}</td>
      `;
      leaderboardBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    leaderboardBody.innerHTML = `<tr><td colspan="4">Failed to load leaderboard.</td></tr>`;
  }
}

// Badge display helper
function renderBadges(badges) {
  const keys = ["safety_first", "maintenance_planner", "system_guardian", "elite_technician"];
  return keys
    .map(key => `<span class="badge ${badges[key] ? "unlocked" : ""}" title="${key.replace("_", " ")}"></span>`)
    .join("");
}

// Run leaderboard loader once user is authenticated
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadLeaderboard();
  }
});


console.log("Loading leaderboard..."); 
