"use client";

// Anatomical measurement diagram: renders the VitaSyr SVG (from /public) and
// overlays a transparent input inside each drawn box/oval, positioned by
// percentage. Each field writes to either the sound- or affected-limb map.
// Same overlay technique as body-pain-map (relative container + absolute boxes).
import { FlipHorizontal } from "lucide-react";
import { MEASUREMENT_SHEET_FIELDS } from "@/lib/clinic/measurement-sheet-fields";
import { measurementSheetImage, MeasureSheetKey } from "@/lib/clinic/measurement-sheet-images";

export interface DiagramField {
  /** Key stored in the limb map (e.g. the SVG shape id "circ_01" / "len_07"). */
  key: string;
  /** Which limb map this field belongs to. */
  map: "sound" | "affected";
  /** Center position + size, as a percentage of the image (0–100). */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/**
 * The measurement sheet for one amputation level: its drawing with an input
 * sitting inside every box and oval the drawing already has.
 */
export function MeasurementSheet({
  sheet, sound, affected, onChange, disabled, side,
}: {
  sheet: MeasureSheetKey;
  sound: Record<string, string>;
  affected: Record<string, string>;
  onChange: (map: "sound" | "affected", key: string, value: string) => void;
  disabled?: boolean;
  /** The limb this sheet records. The drawings depict the left side, so a
   *  right-side case is the one that gets flipped. */
  side?: "LEFT" | "RIGHT";
}) {
  const mirrored = side === "RIGHT";
  const image = measurementSheetImage(sheet);
  const fields = MEASUREMENT_SHEET_FIELDS[sheet];
  if (!image || !fields) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <FlipHorizontal
          className={`h-3.5 w-3.5 transition-transform duration-500 ${mirrored ? "-scale-x-100" : ""}`}
        />
        {mirrored ? "الرسم معكوس — الجهة اليمنى" : "الجهة اليسرى"}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[680px] sm:min-w-0">
          <MeasurementDiagram
            imageSrc={image}
            fields={fields}
            sound={sound}
            affected={affected}
            onChange={onChange}
            disabled={disabled}
            mirrored={mirrored}
          />
        </div>
      </div>
    </div>
  );
}

export function MeasurementDiagram({
  imageSrc,
  fields,
  sound,
  affected,
  onChange,
  disabled = false,
  mirrored = false,
  maxWidth = 1040,
  className,
}: {
  imageSrc: string;
  fields: DiagramField[];
  sound: Record<string, string>;
  affected: Record<string, string>;
  onChange: (map: "sound" | "affected", key: string, value: string) => void;
  disabled?: boolean;
  /** Flip the artwork horizontally; the inputs move with it but stay readable. */
  mirrored?: boolean;
  maxWidth?: number;
  className?: string;
}) {
  return (
    // The sheet turns over like a card: the whole plate rotates, and each input
    // counter-flips so the digits stay upright at rest and while typing.
    <div className={`mx-auto ${className ?? ""}`} style={{ maxWidth, perspective: 1600 }} dir="ltr">
      <div
        className="relative transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: mirrored ? "rotateY(180deg)" : "rotateY(0deg)", transformStyle: "preserve-3d" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static overlay image */}
        <img src={imageSrc} alt="مخطط القياس" className="block h-auto w-full select-none" draggable={false} />
        {fields.map((f) => {
          const value = (f.map === "sound" ? sound : affected)[f.key] ?? "";
          return (
            <input
              key={`${f.map}:${f.key}`}
              value={value}
              onChange={(e) => onChange(f.map, f.key, e.target.value)}
              disabled={disabled}
              inputMode="decimal"
              title={f.key}
              // Saved sheets render disabled; keep the numbers fully legible there.
              className="measurement-field absolute rounded bg-transparent text-center text-[11px] font-semibold text-foreground outline-none focus:bg-primary/10 disabled:cursor-default disabled:opacity-100"
              style={{
                left: `${f.cx}%`,
                top: `${f.cy}%`,
                width: `${f.w}%`,
                height: `${f.h}%`,
                transform: `translate(-50%, -50%)${mirrored ? " scaleX(-1)" : ""}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Legacy layout for the retired /prosthetics/vitasyr.svg, kept only so records
// captured against that drawing still map to their old keys.
export const VITASYR_LOWER_LIMB_FIELDS: DiagramField[] = [
  // ── Affected limb (right side) ──────────────────────────────────────────
  { key: "circ_01", map: "affected", cx: 52.83, cy: 29.64, w: 6.97, h: 4.59 },
  { key: "circ_02", map: "affected", cx: 52.73, cy: 39.06, w: 6.64, h: 4.69 },
  { key: "len_01",  map: "affected", cx: 84.93, cy: 40.19, w: 6.84, h: 4.79 },
  { key: "circ_03", map: "affected", cx: 52.73, cy: 45.56, w: 6.64, h: 4.59 },
  { key: "len_02",  map: "affected", cx: 60.42, cy: 45.46, w: 6.25, h: 4.39 },
  { key: "len_03",  map: "affected", cx: 80.24, cy: 45.51, w: 6.18, h: 4.30 },
  { key: "len_04",  map: "affected", cx: 90.27, cy: 49.02, w: 6.18, h: 4.88 },
  { key: "len_05",  map: "affected", cx: 74.64, cy: 49.76, w: 5.66, h: 4.00 },
  { key: "circ_04", map: "affected", cx: 52.73, cy: 50.63, w: 6.64, h: 4.59 },
  { key: "len_06",  map: "affected", cx: 60.42, cy: 50.54, w: 6.25, h: 4.39 },
  { key: "len_07",  map: "affected", cx: 67.90, cy: 50.54, w: 6.12, h: 4.39 },
  { key: "len_08",  map: "affected", cx: 96.16, cy: 54.54, w: 5.99, h: 4.59 },
  { key: "len_09",  map: "affected", cx: 63.83, cy: 56.45, w: 6.18, h: 4.30 },
  { key: "circ_05", map: "affected", cx: 52.73, cy: 57.32, w: 6.64, h: 4.69 },
  { key: "len_10",  map: "affected", cx: 70.35, cy: 57.71, w: 5.79, h: 4.30 },
  { key: "len_11",  map: "affected", cx: 80.37, cy: 57.91, w: 6.05, h: 4.49 },
  { key: "circ_07", map: "affected", cx: 52.73, cy: 62.65, w: 6.64, h: 4.79 },
  { key: "len_12",  map: "affected", cx: 74.45, cy: 63.13, w: 5.79, h: 4.39 },
  { key: "len_13",  map: "affected", cx: 84.93, cy: 63.38, w: 6.58, h: 4.69 },
  { key: "circ_08", map: "affected", cx: 52.73, cy: 69.09, w: 6.64, h: 4.79 },
  { key: "len_18",  map: "affected", cx: 89.23, cy: 96.09, w: 6.71, h: 4.69 },
  // ── Sound limb (left side) ──────────────────────────────────────────────
  { key: "circ_06", map: "sound", cx: 20.05, cy: 61.77, w: 5.86, h: 4.59 },
  { key: "len_14",  map: "sound", cx: 4.26,  cy: 68.75, w: 6.58, h: 4.69 },
  { key: "len_15",  map: "sound", cx: 9.70,  cy: 75.00, w: 6.12, h: 4.69 },
  { key: "circ_09", map: "sound", cx: 20.02, cy: 78.66, w: 5.93, h: 4.59 },
  { key: "len_16",  map: "sound", cx: 14.81, cy: 83.06, w: 5.93, h: 4.20 },
  { key: "len_17",  map: "sound", cx: 16.86, cy: 95.07, w: 6.77, h: 4.79 },
];
