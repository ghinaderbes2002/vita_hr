// Regenerates lib/clinic/measurement-sheet-fields.ts from the drawings in
// public/prosthetics. Run it whenever a drawing is added or replaced:
//
//   npm run measurement:fields
//
// Each field in a drawing is a <g class="fld"> carrying its own geometry:
//
//   <g class="fld" data-for="circ_03" data-type="circumference"
//      data-x="651" data-y="277" data-w="71" data-h="39" data-limb="affected">
//
// data-limb ("affected" | "sound") says which limb the measurement belongs to.
// Drawings that omit it fall back to the house convention: the sound limb is
// drawn on the left, the residual limb on the right.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public", "prosthetics");
const OUT = path.join(ROOT, "lib", "clinic", "measurement-sheet-fields.ts");

// Some drawings ship as a flat bitmap with no vector shapes to read, so their
// field boxes were measured off the image once and recorded here. A sheet listed
// in this file wins over whatever the SVG declares.
const MANUAL_PATH = path.join(import.meta.dirname, "measurement-fields.manual.json");
const MANUAL = existsSync(MANUAL_PATH) ? JSON.parse(readFileSync(MANUAL_PATH, "utf8")) : {};

// sheet key → drawing file name (without .svg)
const SHEETS = [
  ["ankle_disarticulation", "عبر الكاحل"],
  ["below_knee", "تحت الركبة"],
  ["knee_disarticulation", "عبر الركبة"],
  ["above_knee", "فوق الركبة"],
  ["hemipelvectomy", "عبر الحوض"],
  ["elbow_disarticulation", "عبر المرفق"],
  ["transhumeral", "فوق المرفق"],
  ["transradial", "تحت المرفق"],
];

// Corrections for drawings that don't declare data-limb, kept here rather than
// in the SVGs so they survive the artwork being regenerated. Open the sheet,
// compare with the printed form, and set the sheet to:
//   "swap"  — the guess picked the wrong side of the drawing
//   "all-affected" — the sheet only measures the residual limb
// Anything listed here overrides the guess; a drawing carrying data-limb wins
// over both.
const LIMB_OVERRIDES = {
  // elbow_disarticulation: "swap",
  // transhumeral: "swap",
  // hemipelvectomy: "all-affected",
};

const attr = (tag, name) => tag.match(new RegExp(`\\sdata-${name}="([^"]*)"`))?.[1];

function parse(svg) {
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) ?? [];
  const W = Number(w);
  const H = Number(h);
  const fields = [];
  for (const tag of svg.match(/<g class="fld"[^>]*>/g) ?? []) {
    const key = attr(tag, "for") ?? tag.match(/\sid="([^"]+)"/)?.[1];
    const x = Number(attr(tag, "x"));
    const y = Number(attr(tag, "y"));
    const fw = Number(attr(tag, "w"));
    const fh = Number(attr(tag, "h"));
    if (!key || [x, y, fw, fh].some(Number.isNaN)) continue;
    fields.push({
      key,
      type: attr(tag, "type") ?? "",
      limb: attr(tag, "limb"),
      cx: ((x + fw / 2) / W) * 100,
      cy: ((y + fh / 2) / H) * 100,
      w: (fw / W) * 100,
      h: (fh / H) * 100,
    });
  }

  // Older drawings declare a plain <rect class="fld-box"> per field with no id.
  // They get positional keys from document order — meaning the keys shift if the
  // artwork is redrawn with boxes added or removed, unlike the named groups above.
  if (fields.length === 0) {
    let n = 0;
    for (const tag of svg.match(/<rect class="fld-box"[^>]*\/?>/g) ?? []) {
      const num = (name) => Number(tag.match(new RegExp(`\\s${name}="([\\d.-]+)"`))?.[1]);
      const x = num("x");
      const y = num("y");
      const fw = num("width");
      const fh = num("height");
      if ([x, y, fw, fh].some(Number.isNaN)) continue;
      n += 1;
      fields.push({
        key: `box_${String(n).padStart(2, "0")}`,
        type: "length",
        limb: undefined,
        cx: ((x + fw / 2) / W) * 100,
        cy: ((y + fh / 2) / H) * 100,
        w: (fw / W) * 100,
        h: (fh / H) * 100,
      });
    }
  }
  return fields;
}

/**
 * House convention for drawings that don't declare data-limb: the sound limb is
 * drawn on the left, the residual limb on the right. Sides are found by
 * splitting the circumference ovals around their midpoint — when they all sit in
 * one column the sheet measures the residual limb only.
 */
function limbBySide(fields) {
  const circ = fields.filter((f) => f.type === "circumference");
  const xs = circ.map((f) => f.cx);
  const mid = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const twoSided =
    xs.length > 1 && circ.some((f) => f.cx < mid) && circ.some((f) => f.cx > mid);
  return fields.map((f) => ({
    ...f,
    limb: twoSided && f.cx < mid ? "sound" : "affected",
  }));
}

const report = [];
const guessed = [];
let body = "";

for (const [key, file] of SHEETS) {
  const full = path.join(SRC, `${file}.svg`);
  if (!existsSync(full)) {
    report.push(`//   ${key.padEnd(22)} — no drawing (${file}.svg)`);
    continue;
  }
  let fields = MANUAL[key] ?? parse(readFileSync(full, "utf8"));
  if (MANUAL[key]) {
    const affected = fields.filter((f) => f.limb === "affected").length;
    report.push(
      `//   ${key.padEnd(22)} ${String(fields.length).padStart(2)} fields ` +
        `(affected ${affected} / sound ${fields.length - affected})  [measured]`,
    );
    body += `  ${key}: [\n${fields
      .map((f) => `    { key: "${f.key}", map: "${f.limb}", cx: ${f.cx.toFixed(2)}, cy: ${f.cy.toFixed(2)}, w: ${f.w.toFixed(2)}, h: ${f.h.toFixed(2)} },`)
      .join("\n")}\n  ],\n`;
    continue;
  }
  const declared = fields.every((f) => f.limb === "affected" || f.limb === "sound");
  const override = LIMB_OVERRIDES[key];
  let source = "data-limb";
  if (!declared) {
    fields = limbBySide(fields);
    if (override === "swap") {
      fields = fields.map((f) => ({ ...f, limb: f.limb === "sound" ? "affected" : "sound" }));
      source = "override";
    } else if (override === "all-affected") {
      fields = fields.map((f) => ({ ...f, limb: "affected" }));
      source = "override";
    } else {
      source = "left=sound";
      guessed.push(`${key} (${file}.svg)`);
    }
  }
  const affected = fields.filter((f) => f.limb === "affected").length;
  report.push(
    `//   ${key.padEnd(22)} ${String(fields.length).padStart(2)} fields ` +
      `(affected ${affected} / sound ${fields.length - affected})  [${source}]`,
  );
  const rows = fields
    .map(
      (f) =>
        `    { key: "${f.key}", map: "${f.limb}", cx: ${f.cx.toFixed(2)}, ` +
        `cy: ${f.cy.toFixed(2)}, w: ${f.w.toFixed(2)}, h: ${f.h.toFixed(2)} },`,
    )
    .join("\n");
  body += `  ${key}: [\n${rows}\n  ],\n`;
}

writeFileSync(
  OUT,
  `// GENERATED by scripts/extract-measurement-fields.mjs — do not edit by hand.
// Geometry comes from each drawing's own <g class="fld"> data attributes, as a
// percentage of that file's viewBox. Limb comes from data-limb when the drawing
// declares it.
//
${report.join("\n")}
import type { DiagramField } from "@/components/clinic/measurement-diagram";
import type { MeasureSheetKey } from "@/lib/clinic/measurement-sheet-images";

export const MEASUREMENT_SHEET_FIELDS: Partial<Record<MeasureSheetKey, DiagramField[]>> = {
${body}};
`,
  "utf8",
);

console.log(report.join("\n"));
if (guessed.length) {
  console.warn(
    `\n  ${guessed.length} sheet(s) rely on the left=sound convention rather than a` +
      `\n  declared data-limb. Add data-limb to the drawing to make it explicit, or` +
      `\n  list the sheet in LIMB_OVERRIDES at the top of this script.`,
  );
}
