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

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(name, score) {
  try {
    const list = getLeaderboard();
    // one row per player: keep their best score instead of a row per run
    const existing = list.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.name = name;
      }
    } else {
      list.push({ name, score });
    }
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, LEADERBOARD_MAX);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}
