import { format, isValid } from "date-fns";
import { ar } from "date-fns/locale";

export function formatTime(utcString?: string | null, locale = ar): string {
  if (!utcString) return "—";
  try {
    const d = new Date(utcString);
    if (!isValid(d)) return "—";
    return format(d, "hh:mm a", { locale });
  } catch {
    return "—";
  }
}

export function formatDate(utcString?: string | null, pattern = "dd/MM/yyyy"): string {
  if (!utcString) return "—";
  try {
    const d = new Date(utcString);
    if (!isValid(d)) return "—";
    return format(d, pattern, { locale: ar });
  } catch {
    return "—";
  }
}

// "H:MM" (e.g. "8:15") — plain digits/colon avoid the bidi glyph-reordering
// glitch that mixing Arabic letters (س/د) with numbers causes in RTL layout.
export function formatDuration(minutes?: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}
