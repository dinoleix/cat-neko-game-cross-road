import { generateScoreCard } from "./scoreCard.js";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Instagram has no public web API for posting to a feed/story from an
// arbitrary site, so this uses the standard Web Share API instead: on
// mobile browsers that support it, it opens the native OS share sheet,
// which lists Instagram (Stories and Feed) as one of the apps a person
// can pick - that's the actual, honest integration point available here.
// On desktop / unsupported browsers it falls back to downloading the
// image and copying the caption so it can still be posted manually.
export async function shareScore(score, username) {
  const caption = `${username} just scored ${score} in Green Neko! Think you can beat it? ${location.href}`;
  const blob = await generateScoreCard(score, username);
  const file = new File([blob], "green-neko-score.png", { type: "image/png" });

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
