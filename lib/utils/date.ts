import { format, isValid } from "date-fns";
import { ar } from "date-fns/locale";

// Company operates on Asia/Riyadh time (UTC+3, no DST). Attendance timestamps
// are stored in UTC and must display consistently for every viewer — pinning
// to this fixed offset instead of the browser/OS local timezone means a
// misconfigured device clock can no longer shift the displayed time or date.
const COMPANY_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

// Builds a Date whose LOCAL fields equal the UTC instant shifted by the
// company offset, so date-fns' format() (which reads local getters) renders
// company time regardless of the viewer's own timezone.
function toCompanyLocal(utcString: string): Date | null {
  const d = new Date(utcString);
  if (!isValid(d)) return null;
  const shifted = new Date(d.getTime() + COMPANY_UTC_OFFSET_MS);
  return new Date(
    shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(),
    shifted.getUTCHours(), shifted.getUTCMinutes(), shifted.getUTCSeconds(), shifted.getUTCMilliseconds(),
  );
}

export function formatTime(utcString?: string | null, locale = ar): string {
  if (!utcString) return "—";
  try {
    const d = toCompanyLocal(utcString);
    if (!d) return "—";
    return format(d, "hh:mm a", { locale });
  } catch {
    return "—";
  }
}

export function formatDate(utcString?: string | null, pattern = "dd/MM/yyyy"): string {
  if (!utcString) return "—";
  try {
    const d = toCompanyLocal(utcString);
    if (!d) return "—";
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
