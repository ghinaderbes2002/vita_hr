// The orthotics measurement sheets in public/orthotics. Field geometry comes
// from each drawing's own <g class="fld"> data attributes, as a percentage of
// that file's viewBox. The keys are the drawing's field ids and are what the
// API stores — they must stay exactly as they are. The same key means a
// different spot on each sheet, which is why every saved sheet carries `sheet`.
//
// One limb only (the one being braced), so every field sits on the "affected"
// map of MeasurementDiagram.
import type { DiagramField } from "@/components/clinic/measurement-diagram";
import type { OrthoticsMeasurementSheet } from "@/lib/api/clinic-orthotics";

/** Form order — the order the sheet picker shows them in. */
export const ORTHOTICS_MEASUREMENT_SHEETS: OrthoticsMeasurementSheet[] = [
  "BELOW_KNEE", "FULL_LEG", "FOOT_ACCESSORIES",
];

export const ORTHOTICS_MEASUREMENT_IMAGE: Record<OrthoticsMeasurementSheet, string> = {
  BELOW_KNEE:       "/orthotics/form_orthotics.svg",
  FULL_LEG:         "/orthotics/form_orthotics1.svg",
  FOOT_ACCESSORIES: "/orthotics/form_orthotics2.svg",
};

export const ORTHOTICS_MEASUREMENT_FIELDS: Record<OrthoticsMeasurementSheet, DiagramField[]> = {
  // form_orthotics.svg — 891×670, 20 fields
  BELOW_KNEE: [
    { key: "circ_01", map: "affected", cx: 70.37, cy: 7.84, w: 6.29, h: 5.22 },
    { key: "circ_02", map: "affected", cx: 28.51, cy: 9.18, w: 6.29, h: 5.22 },
    { key: "circ_03", map: "affected", cx: 70.37, cy: 14.85, w: 6.29, h: 5.22 },
    { key: "circ_04", map: "affected", cx: 28.56, cy: 15.37, w: 6.17, h: 5.07 },
    { key: "circ_05", map: "affected", cx: 70.31, cy: 21.94, w: 6.40, h: 5.07 },
    { key: "len_01", map: "affected", cx: 6.12, cy: 24.40, w: 6.40, h: 5.22 },
    { key: "circ_06", map: "affected", cx: 28.62, cy: 27.16, w: 6.29, h: 5.07 },
    { key: "len_02", map: "affected", cx: 13.86, cy: 27.84, w: 6.40, h: 5.22 },
    { key: "circ_07", map: "affected", cx: 70.43, cy: 29.03, w: 6.40, h: 5.22 },
    { key: "len_03", map: "affected", cx: 20.76, cy: 33.66, w: 6.51, h: 5.22 },
    { key: "len_04", map: "affected", cx: 45.17, cy: 35.60, w: 5.72, h: 5.22 },
    { key: "len_05", map: "affected", cx: 28.56, cy: 37.69, w: 6.40, h: 5.22 },
    { key: "len_06", map: "affected", cx: 56.00, cy: 44.70, w: 6.51, h: 5.22 },
    { key: "len_07", map: "affected", cx: 63.41, cy: 47.39, w: 6.51, h: 5.22 },
    { key: "len_08", map: "affected", cx: 46.86, cy: 47.69, w: 5.72, h: 5.22 },
    { key: "len_09", map: "affected", cx: 9.54, cy: 51.27, w: 6.51, h: 5.22 },
    { key: "len_10", map: "affected", cx: 56.73, cy: 58.73, w: 6.40, h: 5.22 },
    { key: "len_11", map: "affected", cx: 80.64, cy: 87.99, w: 6.40, h: 5.22 },
    { key: "len_12", map: "affected", cx: 35.63, cy: 91.57, w: 6.40, h: 5.22 },
    { key: "len_13", map: "affected", cx: 53.42, cy: 91.57, w: 6.51, h: 5.22 },
  ],
  // form_orthotics1.svg — 806×724, 24 fields
  FULL_LEG: [
    { key: "len_01", map: "affected", cx: 42.99, cy: 20.79, w: 6.33, h: 4.83 },
    { key: "circ_01", map: "affected", cx: 50.68, cy: 26.59, w: 7.07, h: 4.83 },
    { key: "circ_02", map: "affected", cx: 50.74, cy: 33.91, w: 6.95, h: 4.83 },
    { key: "len_02", map: "affected", cx: 79.65, cy: 37.64, w: 7.20, h: 4.83 },
    { key: "circ_03", map: "affected", cx: 50.74, cy: 43.72, w: 6.95, h: 4.83 },
    { key: "len_03", map: "affected", cx: 10.05, cy: 43.85, w: 7.20, h: 4.83 },
    { key: "len_04", map: "affected", cx: 90.69, cy: 48.27, w: 7.20, h: 4.83 },
    { key: "len_05", map: "affected", cx: 15.38, cy: 49.65, w: 7.20, h: 4.83 },
    { key: "len_06", map: "affected", cx: 53.04, cy: 49.79, w: 6.33, h: 4.83 },
    { key: "len_07", map: "affected", cx: 85.24, cy: 54.07, w: 7.20, h: 4.83 },
    { key: "len_08", map: "affected", cx: 20.53, cy: 55.46, w: 7.07, h: 4.83 },
    { key: "circ_04", map: "affected", cx: 50.68, cy: 57.80, w: 7.07, h: 4.83 },
    { key: "len_09", map: "affected", cx: 25.81, cy: 61.26, w: 7.20, h: 4.83 },
    { key: "circ_05", map: "affected", cx: 50.68, cy: 62.78, w: 6.82, h: 4.83 },
    { key: "len_10", map: "affected", cx: 79.65, cy: 66.78, w: 7.20, h: 4.83 },
    { key: "len_11", map: "affected", cx: 31.08, cy: 67.06, w: 7.07, h: 4.83 },
    { key: "len_12", map: "affected", cx: 36.85, cy: 72.86, w: 7.20, h: 4.83 },
    { key: "circ_06", map: "affected", cx: 50.74, cy: 73.00, w: 6.95, h: 4.83 },
    { key: "len_13", map: "affected", cx: 42.62, cy: 78.11, w: 7.07, h: 4.83 },
    { key: "len_14", map: "affected", cx: 70.41, cy: 78.80, w: 6.33, h: 4.83 },
    { key: "len_15", map: "affected", cx: 52.42, cy: 80.73, w: 7.07, h: 4.83 },
    { key: "len_16", map: "affected", cx: 82.57, cy: 87.50, w: 7.07, h: 4.83 },
    { key: "len_17", map: "affected", cx: 90.69, cy: 90.12, w: 7.20, h: 4.83 },
    { key: "len_18", map: "affected", cx: 72.52, cy: 92.06, w: 6.33, h: 4.83 },
  ],
  // form_orthotics2.svg — 801×497, 5 fields
  FOOT_ACCESSORIES: [
    { key: "len_01", map: "affected", cx: 87.14, cy: 30.89, w: 7.24, h: 7.04 },
    { key: "len_02", map: "affected", cx: 36.95, cy: 35.71, w: 7.24, h: 7.04 },
    { key: "len_03", map: "affected", cx: 56.99, cy: 35.71, w: 7.12, h: 7.04 },
    { key: "len_04", map: "affected", cx: 13.11, cy: 59.46, w: 7.24, h: 7.04 },
    { key: "len_05", map: "affected", cx: 60.61, cy: 60.06, w: 7.12, h: 7.04 },
  ],
};
