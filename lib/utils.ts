import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely convert a Prisma Decimal string (e.g. "5000.00") to a number.
 * Returns 0 if the value is null/undefined/NaN.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(n) ? 0 : n;
}

/**
 * Format a number as currency with Arabic locale.
 */
export function formatCurrency(value: string | number | null | undefined, currency = "USD"): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Extract error message from API error response (supports both old and new backend error formats).
 */
export function formatUSD(
  value: number | string | null | undefined,
): string {
  const n = Number(value ?? 0);
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatUSDRounded(
  value: number | string | null | undefined,
): string {
  const n = Math.round(Number(value ?? 0));
  return "$" + n.toLocaleString("en-US");
}

export function getApiErrorMessage(error: any, fallback = "حدث خطأ"): string {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || fallback;
}

const SERVER_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").origin;
  } catch {
    return "http://localhost:8000";
  }
})();

/**
 * Resolves a backend asset path (e.g. "/app/uploads/file.png") to a full URL.
 * Absolute URLs and data/blob URLs are returned as-is.
 */
export function assetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `${SERVER_ORIGIN}/${url.replace(/^\//, "")}`;
}

/**
 * A clinic time as it is spoken: "1:30", not "13:30". The clinic day runs
 * 10:00–18:00, so the hour alone is unambiguous and needs no AM/PM marker —
 * which also keeps it short enough to fit inside a timeline block.
 *
 * Accepts either a full ISO timestamp or a bare "HH:mm".
 */
export function formatClinicTime(value?: string | null): string {
  if (!value) return "";
  let hours: number;
  let minutes: number;
  if (value.length > 5) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    hours = d.getHours();
    minutes = d.getMinutes();
  } else {
    const parsed = /^(\d{1,2}):(\d{2})/.exec(value);
    if (!parsed) return value;
    hours = Number(parsed[1]);
    minutes = Number(parsed[2]);
  }
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")}`;
}
