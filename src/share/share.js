import { generateScoreCard } from "./scoreCard.js";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isIOS() {
  // iPadOS 13+ identifies as "MacIntel" in the UA string; touch points is
  // what actually distinguishes it from a real Mac.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Facebook App ID Instagram expects as source_application for attribution.
// This project doesn't have one registered in Meta's developer console yet
// - Instagram still honors the pasteboard handoff without a valid ID, it
// just won't be able to attribute/brand the referral.
const INSTAGRAM_SOURCE_APP_ID = "green_neko_game";

// Instagram's documented mobile-Safari bridge for jumping straight into the
// Stories camera with an image pre-loaded: put the image on the system
// pasteboard, then open the instagram-stories:// URL scheme. This only
// exists on iOS (Android has no equivalent web-facing scheme - there, the
// Web Share API below already lands the user inside Instagram's own
// share-to-story picker once they choose it from the OS sheet).
async function tryInstagramStories(blob) {
  if (!isIOS()) return false;
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return false;

  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  } catch {
    return false; // clipboard write needs a live user gesture; if it's gone, fall back
  }

  return new Promise((resolve) => {
    const onHide = () => {
      document.removeEventListener("visibilitychange", onHide);
      resolve(true); // page backgrounded - Instagram took over
    };
    document.addEventListener("visibilitychange", onHide);
    window.location.href = `instagram-stories://share?source_application=${INSTAGRAM_SOURCE_APP_ID}`;
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      resolve(document.hidden); // still here after a beat - Instagram isn't installed
    }, 1200);
  });
}

// Instagram has no public web API for posting to a feed/story from an
// arbitrary site, so beyond the iOS Stories bridge above, this falls back
// to the standard Web Share API: on mobile browsers that support it, it
// opens the native OS share sheet, which lists Instagram as one of the
// apps a person can pick - that's the actual, honest integration point
// available here. On desktop / unsupported browsers it falls back to
// downloading the image and copying the caption so it can still be posted
// manually.
export async function shareScore(score, username) {
  const caption = `${username} just scored ${score} in Green Neko! Think you can beat it? ${location.href}`;
  const blob = await generateScoreCard(score, username);
  const file = new File([blob], "green-neko-score.png", { type: "image/png" });

  if (await tryInstagramStories(blob)) {
    return { method: "instagram-stories" };
  }

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Green Neko", text: caption });
      return { method: "share" };
    } catch (err) {
      if (err.name === "AbortError") return { method: "cancelled" };
      // fall through to the download fallback below
    }
  } else if (navigator.share) {
    try {
      await navigator.share({ title: "Green Neko", text: caption });
      return { method: "share-text-only" };
    } catch (err) {
      if (err.name === "AbortError") return { method: "cancelled" };
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
