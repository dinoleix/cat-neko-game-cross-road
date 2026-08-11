const KEY = "neko-hopper-highscore";
const LEADERBOARD_KEY = "green-neko-leaderboard";
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

// One row per player (case-insensitive), keeping their best score. Applied
// on every read so any duplicate rows saved before this rule existed also
// get cleaned up, not just new ones going forward.
function dedupeByName(list) {
  const byName = new Map();
  for (const entry of list) {
    const key = entry.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || entry.score > existing.score) {
      byName.set(key, entry);
    }
  }
  return Array.from(byName.values()).sort((a, b) => b.score - a.score);
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const deduped = dedupeByName(list);
    if (deduped.length !== list.length) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(deduped));
    }
    return deduped;
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(name, score) {
  try {
    const list = getLeaderboard();
    list.push({ name, score });
    const deduped = dedupeByName(list).slice(0, LEADERBOARD_MAX);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(deduped));
    return deduped;
  } catch {
    return [];
  }
}
