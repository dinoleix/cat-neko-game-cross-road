import { db } from "../firebase/config.js";
import { currentWeekKey, lastWeekKey } from "./week.js";
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
const NAME_KEY = "green-neko-username";
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

// The name is what ties a browser to its leaderboard row (the doc ID is
// derived from it), so persisting it locally is what lets a returning player
// keep updating their own row instead of silently creating a second one
// under a slightly different spelling.
export function getUsername() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setUsername(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // private browsing / storage disabled - fail silently
  }
}

// One row per player (case-insensitive) is enforced by using the lowercased
// name as the Firestore document ID, rather than de-duping a list client
// side - two devices submitting the same name can't both create a row.
function docIdForName(name) {
  return (name || "").trim().toLowerCase().slice(0, 100) || "player";
}

// Each week's scores live under their own document path rather than being
// filtered out of one big collection. Two reasons: a week's board is then a
// plain "order by score" read, which Firestore indexes automatically (an
// equality filter plus a sort on a different field would need a composite
// index deployed by hand), and a finished week needs no cleanup - its path
// simply stops being the current one.
const WEEKLY_ROOT = "green_neko_weeks";

function weeklyScores(weekKey) {
  return collection(db, WEEKLY_ROOT, weekKey, "scores");
}

// "week" = Monday-to-Sunday now, "last" = the week before, "all" = every score
// ever recorded, which is the original one-row-per-player collection.
function collectionForRange(range) {
  if (range === "week") return weeklyScores(currentWeekKey());
  if (range === "last") return weeklyScores(lastWeekKey());
  return collection(db, LEADERBOARD_COLLECTION);
}

export async function getLeaderboard(range = "all") {
  try {
    const q = query(collectionForRange(range), orderBy("score", "desc"), limit(LEADERBOARD_MAX));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ name: d.data().name, score: d.data().score }));
  } catch {
    return [];
  }
}

// Keeps the player's best for that scope, so replaying a worse run never
// knocks their own better score off the board.
async function writeBestScore(ref, name, score) {
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().score >= score) return;
  await setDoc(ref, { name, score, updatedAt: Date.now() });
}

export async function addLeaderboardEntry(name, score) {
  const id = docIdForName(name);
  const clean = (name || "Player").trim().slice(0, 40) || "Player";
  try {
    // All-time and this-week are tracked separately: a player's best ever and
    // their best this week are different numbers, and the weekly board has to
    // keep showing this week's figure even after they beat it in a later one.
    await Promise.all([
      writeBestScore(doc(db, LEADERBOARD_COLLECTION, id), clean, score),
      writeBestScore(doc(db, WEEKLY_ROOT, currentWeekKey(), "scores", id), clean, score),
    ]);
  } catch {
    // offline / blocked - the local high score above still saved
  }
}
