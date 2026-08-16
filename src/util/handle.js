// Instagram handles are letters, numbers, periods and underscores, up to 30
// characters, and are case-insensitive. Storing them normalised matters more
// here than it looks: the leaderboard uses the handle as its document id, so
// "@Mochi", "mochi" and a pasted profile link all have to collapse to the same
// row, or one player quietly ends up occupying three places on the board.
export function normalizeHandle(raw) {
  return String(raw || "")
    .trim()
    // people paste the profile URL as often as they type the handle
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    // drop any trailing path, query or fragment left over from a pasted link
    .replace(/[/?#].*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
}

export function isValidHandle(handle) {
  return /^[a-z0-9._]{1,30}$/.test(handle);
}

// Handles are shown with the @ everywhere a player sees them, but stored
// without it - keeping the sigil out of the stored value is what stops
// "@@name" appearing the moment anything round-trips.
export function displayHandle(handle) {
  return handle ? `@${handle}` : "";
}
