import { db } from "../firebase/config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const KEY = "neko-hopper-highscore";
// Scoped to this game specifically - "games-dd1a8" is a shared Firebase
// project with other apps' data already in it, so a generic "leaderboard"
// name risks colliding with something else writing there.
const LEADERBOARD_COLLECTION = "green_neko_leaderboard";
const LEADERBOARD_MAX = 50;

export function getHighScore() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function setHighScoreIfBetter(score) {
  try {
    if (score > getHighScore()) {
      localStorage.setItem(KEY, String(score));
      return true;
    }
  } catch {
    // private browsing / storage disabled - fail silently
  }
  return false;
}

// One row per player (case-insensitive) is enforced by using the lowercased
// name as the Firestore document ID, rather than de-duping a list client
// side - two devices submitting the same name can't both create a row.
function docIdForName(name) {
  return (name || "").trim().toLowerCase().slice(0, 100) || "player";
}

export async function getLeaderboard() {
  try {
    const q = query(collection(db, LEADERBOARD_COLLECTION), orderBy("score", "desc"), limit(LEADERBOARD_MAX));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ name: d.data().name, score: d.data().score }));
  } catch {
    return [];
  }
}

export async function addLeaderboardEntry(name, score) {
  try {
    const ref = doc(db, LEADERBOARD_COLLECTION, docIdForName(name));
    const existing = await getDoc(ref);
    if (!existing.exists() || score > existing.data().score) {
      await setDoc(ref, { name: (name || "Player").trim().slice(0, 40) || "Player", score, updatedAt: Date.now() });
    }
  } catch {
    // offline / blocked - the local high score above still saved
  }
  return getLeaderboard();
}
