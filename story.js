// story.js
import './scenes/scene1.js?v=2'
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/* ---------- FIREBASE CONFIG: paste your config here ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyA5oAMPGg8I6N1c5W8jlDkZUVltChk1Y8A",
  authDomain: "gamesite-9850d.firebaseapp.com",
  projectId: "gamesite-9850d",
  storageBucket: "gamesite-9850d.firebasestorage.app",
  messagingSenderId: "757972868175",
  appId: "1:757972868175:web:043b2969258cf0bdfdde3a"
};
/* ------------------------------------------------------------ */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* DOM */
const bgEl = document.getElementById('bg');
const charEl = document.getElementById('character');
const speakerEl = document.getElementById('speakerName');
const textEl = document.getElementById('dialogueText');
const nextBtn = document.getElementById('nextBtn');
const skipBtn = document.getElementById('skipBtn');
const menuBtn = document.getElementById('menuBtn');

let sceneData = null;
let idx = 0;
let isTyping = false;
let currentUser = null;

// small helper to read query string
function getQuery(name, fallback) {
  const u = new URLSearchParams(window.location.search);
  return u.get(name) || fallback;
}

// load scene module dynamically (each scene exports `scene` array)
async function loadSceneModule(n) {
  // expects files at scenes/scene1.js, scene2.js ... each exporting `export const scene = [...]`
  try {
    const mod = await import(`./scenes/scene${n}.js`);
    return mod.scene;
  } catch (err) {
    console.error("Failed to load scene:", err);
    return null;
  }
}

function updateCharacters(characters) {
  const layer = document.getElementById("character-layer");
  layer.innerHTML = ""; // clear previous characters

  if (!characters || !Array.isArray(characters)) return;

  characters.forEach(c => {
    const img = document.createElement("img");
    img.src = c.img;
    img.classList.add("character");
    if (c.active) img.classList.add("active");
    img.id = `char-${c.id}`;
    layer.appendChild(img);
  });
}

let typingInterval = null;

/* typewriter (simple) */
function typeWriter(text, element, speed = 10, onComplete) {
  // 🔧 Convert shorthand <span color=red> → <span style="color:red">
  text = text.replace(/<span color=(['"]?)(.*?)\1>/g, '<span style="color:$2">');

  element.innerHTML = "";
  let i = 0;
  let isTag = false;
  let tagBuffer = "";
  let output = "";

  isTyping = true;

  typingInterval = setInterval(() => {
    if (i < text.length) {
      const char = text.charAt(i);

      if (char === "<") {
        isTag = true;
        tagBuffer = "<";
      } else if (char === ">" && isTag) {
        tagBuffer += ">";
        output += tagBuffer;
        element.innerHTML = output;
        tagBuffer = "";
        isTag = false;
      } else if (isTag) {
        tagBuffer += char;
      } else {
        output += char;
        element.innerHTML = output;
      }

      i++;
    } else {
      clearInterval(typingInterval);
      isTyping = false;
      if (onComplete) onComplete();
    }
  }, speed);
}


// update background & character images if present
function setVisuals(item) {
  // ✅ Background
  if (item.bg) {
    bgEl.classList.add("bg-fade"); // fade out

    setTimeout(() => {
      bgEl.style.backgroundImage = `url("${item.bg}")`;
      bgEl.classList.remove("bg-fade"); // fade back in
    }, 400);
  }

const layer = document.getElementById("character-layer");
layer.innerHTML = "";

if (item.characters && Array.isArray(item.characters)) {

  const count = item.characters.length;
  const autoPositions = {
    1: ["center"],
    2: ["left", "right"],
    3: ["far-left", "center", "far-right"],
    4: ["far-left", "left", "right", "far-right"]
  };

item.characters.forEach((c, index) => {
  const img = document.createElement("img");
  img.src = c.img;

  // ✅ base class
  img.className = "character";

  // ✅ auto-position if none defined
  const pos = c.pos || autoPositions[count][index];
  img.classList.add(pos);

  // ✅ active speaker highlight
  const isActive =
    c.active !== undefined
      ? c.active
      : c.id.toLowerCase() === item.name?.toLowerCase();
  if (isActive) img.classList.add("active");

  // ✅ EMOTION handling
  if (c.emotion) {
    // clear possible previous animations
    img.classList.remove(
      "emotion-shock",
      "emotion-laugh",
      "emotion-intense",
      "emotion-sad"
    );

    // ✅ Force reflow so repeating same animation works
    void img.offsetWidth;

    img.classList.add(`emotion-${c.emotion}`);
  }

  img.id = `char-${c.id}`;
  layer.appendChild(img);
});


} else if (item.char) {
  // ✅ Backward compatibility mode
  layer.innerHTML = "";
  const img = document.createElement("img");
  img.src = item.char;
  img.classList.add("character", "active");
  layer.appendChild(img);

} else {
  layer.innerHTML = "";
}
}
async function handleAction(action) {
  if (action.type === "gotoGame") {
    const next = action.resumeScene || (parseInt(getQuery('scene', 1)) + 1);

    await saveProgress(next);

    window.location.href = `game.html?id=${action.id}&resumeScene=${action.resumeScene || ''}`;
    return;
  }

  if (action.type === "saveProgress") {
    await saveProgress(action.value);
  }
}

// show the next dialogue item
async function showNext() {
  if (!sceneData || idx >= sceneData.length) {
    // scene done
    await onSceneEnd();
    return;
  }

  const item = sceneData[idx++];
  // If this entry is only an action → immediately trigger it
  if (!item.text && item.action) {
    await handleAction(item.action);
    return;
  }

  // item { name, text, bg, char, action }
  setVisuals(item);

  if (item.name) speakerEl.textContent = item.name;
  else speakerEl.textContent = '';

  // show text via typewriter (or show immediately if skip)
  await typeWriter(item.text || '', textEl);

  // if the item includes an "action" that tells us to go to a game, handle here
  // supported actions: { type: "gotoGame", id: 3 } or { type:"saveProgress", value: 5 }
  if (item.action) {
    if (item.action.type === 'gotoGame') {
      // save progress pointing to the next scene (if you want to resume after the game)
      await saveProgress(item.action.resumeScene || (parseInt(getQuery('scene', 1)) + 1));
      // redirect to generic game wrapper
      window.location.href = `game.html?id=${item.action.id}&resumeScene=${item.action.resumeScene || ''}`;
      return;
    }
    if (item.action.type === 'saveProgress') {
      await saveProgress(item.action.value);
    }
  }
}

// invoked when the scene array ends (no more items)
async function onSceneEnd() {
  // default behavior: advance to next scene id (scene+1)
  const sceneId = parseInt(getQuery('scene', 1));
  const nextScene = sceneId + 1;
  // if nextScene > 10 -> send to dashboard
  if (nextScene > 10) {
    // last scene -> go to dashboard
    await saveProgress(10);
    window.location.href = 'dashboard.html';
  } else {
    // save progress and go to next scene
    await saveProgress(nextScene);
    window.location.href = `story.html?scene=${nextScene}`;
  }
}

// save progress to Firestore under users/<uid>.progress
async function saveProgress(sceneNumber) {
  if (!currentUser) return;
  try {
    const uRef = doc(db, 'users', currentUser.uid);
    await updateDoc(uRef, { progress: sceneNumber });
  } catch (err) {
    console.warn('Failed to save progress:', err);
  }
}

/* click/keyboard handlers */
let isAdvancing = false;

nextBtn.addEventListener('click', async () => {
  if (isAdvancing) return;

  // ✅ If still typing → instantly finish text
  if (isTyping) {
    clearInterval(typingInterval);
    isTyping = false;

    const lastItem = sceneData[idx - 1];
    const fullHTML = (lastItem.text || "")
      .replace(/\n/g, "<br>")
      .replace(/<span color="?([^">]+)"?>/g, "<span style='color:$1'>");

    textEl.innerHTML = fullHTML;

    // allow immediate second click
    return;
  }

  // ✅ Fully done → proceed normally
  isAdvancing = true;
  await showNext();
  setTimeout(() => (isAdvancing = false), 120);
});

function parseMarkup(text) {
  return text
    .replace(/\n/g, "<br>")
    .replace(/<span color="?([^">]+)"?>/g, "<span style='color:$1'>");
}

document.addEventListener("keydown", async (e) => {
  if (e.key !== " " && e.key !== "Enter") return;

  e.preventDefault(); // prevent scrolling / shortcuts

  if (isAdvancing) return; // avoid double triggers

  if (isTyping) {
    // ✅ End typing instantly
    clearInterval(typingInterval);
    isTyping = false;

    // ✅ Instantly finish text render
    const current = sceneData[idx - 1];
    if (current?.text) textEl.innerHTML = parseMarkup(current.text);

    return;
  }

  await showNext(); // ✅ advance properly
});

skipBtn.addEventListener('click', async () => {
  if (isAdvancing) return;

  // ✅ Skip means: jump to LAST scene element
  idx = sceneData.length - 1;

  const finalItem = sceneData[idx];

  // ✅ Render final visuals just for seamlessness
  setVisuals(finalItem);

  // ✅ If it has text, type or reveal immediately
  if (finalItem.text) {
    isTyping = false;
    clearInterval(typingInterval);
    textEl.innerHTML = finalItem.text
      .replace(/\n/g, "<br>")
      .replace(/<span color="?([^">]+)"?>/g, "<span style='color:$1'>");
  }

  // ✅ Trigger final action (ex: go to game)
  if (finalItem.action?.type === "gotoGame") {
    const nextGame = finalItem.action.id;
    const resumeScene = finalItem.action.resumeScene || (parseInt(getQuery('scene', 1)) + 1);

    // ✅ Save progress first
    await saveProgress(resumeScene);

    window.location.href = `game.html?id=${nextGame}&resumeScene=${resumeScene}`;
  } else {
    // Fallback: finish scene cleanly
    await onSceneEnd();
  }
});

menuBtn.addEventListener('click', () => {
  // small menu: back to dashboard
  if (confirm('Return to Dashboard? Your progress will be saved.')) {
    const currentScene = parseInt(getQuery('scene', 1));
    saveProgress(currentScene);
    window.location.href = 'dashboard.html';
  }
});

/* AUTH gating + scene load */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;

  // load requested scene
  const sceneId = parseInt(getQuery('scene', 1));
  sceneData = await loadSceneModule(sceneId);

  if (!sceneData) {
    // fallback: show message and go to dashboard
    textEl.innerHTML = 'Scene not found.';
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
    return;
  }
// 📘 Glossary PDF Modal Support
const pdfModal = document.getElementById("pdfModal");
const pdfViewer = document.getElementById("pdfViewer");
const closePdfBtn = document.getElementById("closePdfBtn");

function openGlossaryModal(pdfName) {
  // TODO: Update with real Firebase storage path later
  pdfViewer.src = `assets/glossary/${pdfName}`;
  pdfModal.classList.remove("hidden");
}

function closeGlossaryModal() {
  pdfModal.classList.add("hidden");
  pdfViewer.src = ""; // stop PDF download when closed
}

// Close button handler
closePdfBtn.addEventListener("click", closeGlossaryModal);

// Click outside closes modal
pdfModal.addEventListener("click", (e) => {
  if (e.target === pdfModal) closeGlossaryModal();
});

// Detect clicks on glossary text in the dialogue text
dialogueText.addEventListener("click", (e) => {
  if (e.target.classList.contains("glossary")) {
    const doc = e.target.dataset.doc;
    openGlossaryModal(doc);
  }
});

  idx = 0;
  // start the scene
  await showNext();
});

