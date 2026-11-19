import DOMPurify from "dompurify";

let hooked = false;

/**
 * Cleans message HTML before it is put on the page: drops scripts, event
 * handlers and javascript: links, keeps formatting (inline styles, tables,
 * data: images). Every link opens in a new tab without access to this one.
 * Server-side there is no DOM, so nothing is rendered there.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  if (!hooked) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A" && node.getAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  });
}
