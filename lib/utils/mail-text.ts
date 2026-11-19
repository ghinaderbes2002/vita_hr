/** Reply / forward prefixes in either language: «رد:», «تحويل:», RE:, FW:, Fwd:. */
const PREFIX = /^\s*(رد|تحويل|re|fwd?)\s*[:：]\s*/i;

/** Splits "رد: رد: FW: x" into its leading prefixes and the subject itself. */
function splitPrefixes(subject: string): { prefixes: string[]; rest: string } {
  const prefixes: string[] = [];
  let rest = subject ?? "";
  let m: RegExpExecArray | null;
  while ((m = PREFIX.exec(rest))) {
    prefixes.push(m[1]);
    rest = rest.slice(m[0].length);
  }
  return { prefixes, rest };
}

/**
 * Subject for a new reply / forward: one prefix, never stacked —
 * «رد: رد: موعد» replied to again stays «رد: موعد».
 */
export function prefixedSubject(prefix: string, subject: string): string {
  return `${prefix}${splitPrefixes(subject).rest}`;
}

/**
 * For display only: collapses repeated prefixes already stored on old
 * messages («رد: رد: رد: موعد» → «رد: موعد»). The saved subject is untouched.
 */
export function displaySubject(subject: string): string {
  const { prefixes, rest } = splitPrefixes(subject);
  if (prefixes.length <= 1) return subject;
  const kept = prefixes.filter((p, i) => i === 0 || p.toLowerCase() !== prefixes[i - 1].toLowerCase());
  return `${kept.map((p) => `${p}: `).join("")}${rest}`;
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** HTML body → one line of plain text for the list preview. */
export function bodySnippet(html: string | null | undefined, max = 120): string {
  if (!html) return "";
  const text = html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? " ")
    .replace(/[─—_-]{5,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Words that suggest a file should be attached. */
const ATTACHMENT_WORDS = /(مرفق|مرفقات|أرفقت|ارفقت|أرفق|ارفق|attach)/i;

export function mentionsAttachment(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => !!t && ATTACHMENT_WORDS.test(t.replace(/<[^>]+>/g, " ")));
}
