import { generateScoreCard, CAFE_HANDLE } from "./scoreCard.js";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function captionFor(score, username) {
  // The prize is the reason a stranger scrolling past would tap through, so it
  // goes in the caption too - not just burned into the image, which anyone
  // reposting without the picture would lose.
  // The tag is not decoration - it is the claim step from the Terms, so it has
  // to survive into the caption a winner actually posts.
  return (
    `@${username} just scored ${score} at Green Neko Cafe! 🧋 ` +
    `Top 3 this week win a FREE BOBA - tag ${CAFE_HANDLE} to claim. ` +
    `Think you can beat it? ${location.href}`
  );
}

// Rendering the card is the slow part: a 1080x1920 canvas, a sprite decode and
// a PNG encode, which together can run into seconds on a phone. Doing that
// inside the share tap is what pushed people into the download fallback -
// navigator.share() has to be called while the tap's transient user activation
// is still valid, and iOS Safari rejects it once that has lapsed. So the card
// is rendered ahead of time, when the scoreboard opens, and the tap only has
// to hand over an already-finished file.
let prepared = null;

export async function prepareScoreCard(score, username) {
  const key = `${score}|${username}`;
  if (prepared && prepared.key === key) return prepared;
  const blob = await generateScoreCard(score, username);
  prepared = {
    key,
    blob,
    file: new File([blob], "green-neko-score.png", { type: "image/png" }),
    caption: captionFor(score, username),
  };
  return prepared;
}

// Instagram has no web API for posting straight to a story, and the
// instagram-stories:// handoff needs custom iOS pasteboard types
// (com.instagram.sharedSticker.*) that only a native app can write - a page
// that opens that URL scheme lands the user on an empty story, which is worse
// than not trying. The native share sheet is the real integration point: the
// user taps Instagram in the sheet and Instagram opens with the card already
// loaded, no download and no camera-roll detour.
export async function shareScore(score, username) {
  const ready = prepared && prepared.key === `${score}|${username}`
    ? prepared
    : await prepareScoreCard(score, username);
  const { blob, file, caption } = ready;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      // Files only. Passing `text` alongside them makes some targets treat it
      // as a text share and drop the image - and a Story ignores share text
      // regardless, so the caption goes to the clipboard instead.
      await navigator.share({ files: [file], title: "Green Neko" });
      navigator.clipboard?.writeText(caption).catch(() => {});
      return { method: "share" };
    } catch (err) {
      if (err.name === "AbortError") return { method: "cancelled" };
      // otherwise fall through to the download fallback below
    }
  }

  downloadBlob(blob, "green-neko-score.png");
  try {
    await navigator.clipboard.writeText(caption);
    return { method: "download+clipboard" };
  } catch {
    return { method: "download" };
  }
}
