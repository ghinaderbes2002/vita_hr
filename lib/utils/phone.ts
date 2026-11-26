/**
 * Checks an employee phone number the way the WhatsApp sender reads it:
 *  - 00… or +…           → international, sent as is (any country).
 *  - 0…  (one zero)       → Syrian local, sent as 963 + the rest.
 *  - 9 digits starting 9  → Syrian local written without its zero.
 * So a foreign number stored with a single zero (Turkish 0534…) would be read
 * as Syrian and never arrive — it has to be written with 00 or +.
 * Returns an Arabic error, or null when the value is fine (empty is fine).
 */
export function phoneError(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  // Spaces, dashes, dots and brackets are accepted while typing; nothing else.
  const compact = value.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(compact)) return "الرقم يجب أن يحتوي على أرقام فقط (مع + أو 00 في بدايته للأرقام الدولية)";

  const digits = compact.replace(/^\+/, "");
  if (compact.startsWith("+") || digits.startsWith("00")) {
    const national = compact.startsWith("+") ? digits : digits.slice(2);
    if (national.length < 7 || national.length > 15) return "رقم دولي غير صالح — تحقّق من عدد الأرقام";
    return null;
  }

  if (digits.startsWith("0")) {
    // Syrian numbers are at most 10 digits with their zero (09xxxxxxxx).
    if (digits.length > 10) return "يبدو رقماً غير سوري — اكتبه بـ 00 أو + ثم رمز الدولة (مثال: 00905xxxxxxxxx)";
    if (digits.length < 7) return "الرقم قصير جداً";
    return null;
  }

  if (digits.length === 9 && digits.startsWith("9")) return null;
  // A full international number without its + (963912345678) — sent as is.
  if (digits.length >= 11 && digits.length <= 15) return null;

  return "اكتب الرقم السوري بصفره (09xxxxxxxx)، وغير السوري بـ 00 أو + ثم رمز الدولة";
}

/** Hint shown under phone inputs. */
export const PHONE_HINT = "الرقم السوري بصفره (09…)، وغير السوري بـ 00 أو + ثم رمز الدولة";
