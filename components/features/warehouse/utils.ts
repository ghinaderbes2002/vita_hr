/** Arabic name where the locale is Arabic and one exists, else the base name. */
export function localizedName(
  entity: { name: string; nameAr?: string | null } | null | undefined,
  locale: string,
): string {
  if (!entity) return "";
  return locale === "ar" ? entity.nameAr || entity.name : entity.name;
}

/**
 * Drops blank strings so optional fields are omitted from the request body —
 * the API validates a present-but-empty value (e.g. an email) and rejects it.
 */
export function omitEmpty<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => !(typeof v === "string" && v.trim() === "")),
  ) as T;
}

/**
 * The update counterpart of omitEmpty: a blanked field is sent as null, which
 * is what actually clears it on the backend ("" would be stored as-is).
 */
export function nullEmpty<T extends Record<string, unknown>>(values: T): { [K in keyof T]: T[K] | null } {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]),
  ) as { [K in keyof T]: T[K] | null };
}

/** Radix Select has no empty value; this stands in for "nothing selected". */
export const NONE = "none";
