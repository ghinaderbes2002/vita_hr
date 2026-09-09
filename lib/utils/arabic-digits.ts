// أرقام عربية-هندية (٠-٩) وفارسية (۰-۹). النظام يخزّن ويعرض الأرقام اللاتينية
// فقط — رقم مكتوب بالعربي يفشل التحقق في الباك أو يُخزَّن كنص لا يُقارن.
const ARABIC_INDIC = /[٠-٩۰-۹]/g;

export const hasArabicDigits = (value: string): boolean =>
  /[٠-٩۰-۹]/.test(value);

/** Drops every Arabic-Indic digit, leaving the rest of the text untouched. */
export const stripArabicDigits = (value: string): string =>
  value.replace(ARABIC_INDIC, "");

/** The same digits mapped onto 0-9, for the places that would rather convert. */
export const toLatinDigits = (value: string): string =>
  value.replace(ARABIC_INDIC, (d) => {
    const cp = d.codePointAt(0)!;
    const base = cp >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(cp - base);
  });
