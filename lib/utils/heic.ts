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

export async function toUploadableImage(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  // Loaded on demand: the library is large and touches `window`.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
