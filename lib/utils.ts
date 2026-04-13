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
export function formatCurrency(value: string | number | null | undefined, currency = "SAR"): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Extract error message from API error response (supports both old and new backend error formats).
 */
export function getApiErrorMessage(error: any, fallback = "حدث خطأ"): string {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || fallback;
}
