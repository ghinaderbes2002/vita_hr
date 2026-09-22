// Measurement drawings that ship in public/prosthetics — one per amputation
// level. The files are named in Arabic, so paths go through encodeURI.
export type MeasureSheetKey =
  | "ankle_disarticulation"
  | "knee_disarticulation"
  | "above_knee"
  | "below_knee"
  | "hemipelvectomy"
  | "elbow_disarticulation"
  | "transhumeral"
  | "transradial";

const FILE: Partial<Record<MeasureSheetKey, string>> = {
  ankle_disarticulation: "عبر الكاحل",
  below_knee:            "تحت الركبة",
  knee_disarticulation:  "عبر الركبة",
  hemipelvectomy:        "عبر الحوض",
  elbow_disarticulation: "عبر المرفق",
  transhumeral:          "فوق المرفق",
  transradial:           "تحت المرفق",
  above_knee:            "فوق الركبة",
};

/**
 * Drawings that ship with a right-side version of their own. Those are already
 * mirrored artwork — printed numbers included — so they are shown as they are
 * instead of flipping the left-side drawing in the browser.
 */
const FILE_RIGHT: Partial<Record<MeasureSheetKey, string>> = {
  below_knee:            "تحت_الركبة_يمين",
  // Named after the limb drawn in them, not the case they serve.
  ankle_disarticulation: "عبر_الكاحل_يسار",
  knee_disarticulation:  "عبر_الركبة_يسار",
  above_knee:            "فوق_الركبة_يسار",
  hemipelvectomy:        "عبر_الحوض_يسار",
};

export const measurementSheetImage = (key: MeasureSheetKey): string | null =>
  FILE[key] ? encodeURI(`/prosthetics/${FILE[key]}.svg`) : null;

/** The right-side drawing for this level, when one exists. */
export const measurementSheetImageRight = (key: MeasureSheetKey): string | null =>
  FILE_RIGHT[key] ? encodeURI(`/prosthetics/${FILE_RIGHT[key]}.svg`) : null;
