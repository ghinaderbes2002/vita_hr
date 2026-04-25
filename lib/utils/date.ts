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

export function formatDuration(minutes?: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}د`;
  if (m === 0) return `${h}س`;
  return `${h}س ${m}د`;
}
