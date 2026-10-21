/**
 * Phone cameras (every iPhone, many Samsungs) save photos as HEIC/HEIF, which
 * the API rejects ("JPEG/PNG/PDF only") and desktop browsers cannot display.
 * Such a file is converted to JPEG in the browser before upload; anything else
 * is returned untouched.
 */
export function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type === "image/heic" || type === "image/heif"
    || type === "image/heic-sequence" || type === "image/heif-sequence"
    || name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * Invisible direction and zero-width marks. WhatsApp and Telegram put them in
 * Arabic file names — often right after the extension ("صورة.jpg\u200F") — so
 * the name no longer ends in ".jpg", the browser can't tell its type, and both
 * file pickers and the API turn it away.
 */
const INVISIBLE_MARKS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
  heic: "image/heic", heif: "image/heif", pdf: "application/pdf",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};

/** The file with its name cleaned of invisible marks and, if the browser left it blank, its type filled in. */
export function withCleanName(file: File): File {
  const name = file.name.replace(INVISIBLE_MARKS, "").trim();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = file.type || TYPE_BY_EXTENSION[ext] || "";
  if (name === file.name && type === file.type) return file;
  return new File([file], name || "file", { type, lastModified: file.lastModified });
}

/** Whether a (cleaned) file fits an `accept` list such as "image/*,application/pdf". */
export function matchesAccept(file: File, accept: string): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return accept.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean).some((a) =>
    a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a,
  );
}

export async function toUploadableImage(input: File): Promise<File> {
  const file = withCleanName(input);
  if (!isHeic(file)) return file;
  // Loaded on demand: the library is large and touches `window`.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
