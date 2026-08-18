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

export const measurementSheetImage = (key: MeasureSheetKey): string | null =>
  FILE[key] ? encodeURI(`/prosthetics/${FILE[key]}.svg`) : null;
