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

// A wall-clock "HH:mm" (or "HH:mm:ss") — work schedules, hourly leave, session
// times — in the same 12-hour form as formatTime: "08:30 ص", "02:15 م". It is
// not a UTC instant, so there is no company-offset shift. Anything that isn't a
// clock time comes back unchanged, so a value already formatted still reads.
export function formatClockTime(value?: string | null, locale = ar): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return value;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return value;
  return format(new Date(2000, 0, 1, h, min), "hh:mm a", { locale });
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
