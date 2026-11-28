import Link from "next/link";

/**
 * Makes a whole table row a real link to `href`: put it in any cell of a row
 * whose className includes `relative`. It stretches over the row, so a click
 * anywhere opens the case, and the browser's own right-click "open in new
 * tab", Ctrl/Cmd-click and middle-click all work, which an onClick on the row
 * cannot offer.
 */
export function CaseRowLink({ href, label }: { href: string; label?: string }) {
  return <Link href={href} aria-label={label} className="absolute inset-0" />;
}
