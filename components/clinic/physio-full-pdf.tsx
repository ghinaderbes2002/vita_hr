// Client-only — imported via dynamic import() to avoid SSR issues
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type {
  TherapyModality,
  EvaluationModality,
  ChronicCondition,
  TestType,
  PhysioGoal,
  PainRegion,
  PhysioSession,
} from "@/lib/api/clinic-physio";
import {
  CHRONIC_CONDITION_VALUES,
  EVALUATION_MODALITY_VALUES,
  PHYSIO_GOAL_VALUES,
  THERAPY_MODALITY_VALUES,
} from "@/lib/api/clinic-physio";
import type { SheetT } from "./physio-labels";

// ── Theme ──────────────────────────────────────────────────────────────────────
const BRAND       = "#346180";
const BRAND_LIGHT = "#EAF2F7";
const TEXT        = "#111827";
const MUTED       = "#6b7280";
const BORDER      = "#d0dde6";

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 10,
    color: TEXT,
    paddingTop: 66,
    paddingBottom: 62,
    paddingHorizontal: 24,
    direction: "rtl",
    textAlign: "right",
    backgroundColor: "#ffffff",
  },
  pageHeader: {
    position: "absolute",
    top: 10,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 5,
  },
  pageHeaderTitle: { fontSize: 12, fontWeight: "bold", color: BRAND },
  pageHeaderSub:   { fontSize: 8,  color: MUTED, marginTop: 2 },
  pageFooter: {
    position: "absolute",
    bottom: 8,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: BRAND,
    paddingTop: 5,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageFooterText: { fontSize: 7, color: BRAND },
  sectionHeader: {
    backgroundColor: BRAND,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
    marginTop: 14,
    borderRadius: 3,
  },
  sectionHeaderText: { color: "#ffffff", fontWeight: "bold", fontSize: 11, textAlign: "center" },
  subHeader: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    marginTop: 8,
    borderRadius: 2,
    borderRightWidth: 3,
    borderRightColor: BRAND,
  },
  subHeaderText: { color: BRAND, fontWeight: "bold", fontSize: 9.5 },
  // Field row — label right, value left, both wrap
  fieldRow: {
    flexDirection: "row-reverse",
    marginBottom: 2,
    flexWrap: "nowrap",
    alignItems: "flex-start",
  },
  fieldLabel: { fontSize: 8.5, color: TEXT, flexShrink: 0 },
  fieldValue: { fontSize: 8.5, color: MUTED, flex: 1, textAlign: "right", paddingRight: 12 },
  yes: { color: "#16a34a" },
  no:  { color: "#9ca3af" },
  chipsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 3,
    marginBottom: 5,
    marginTop: 2,
  },
  chip: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    fontSize: 8,
    color: BRAND,
  },
  table:        { marginTop: 5, marginBottom: 5 },
  tableHeaderRow: {
    flexDirection: "row-reverse",
    backgroundColor: BRAND,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 3.5,
  },
  tableRowAlt:  { backgroundColor: "#FDF5F5" },
  tableCellHead: { flex: 1, fontSize: 8.5, color: "#ffffff", fontWeight: "bold", textAlign: "right" },
  tableCell:     { flex: 1, fontSize: 8.5, color: TEXT, textAlign: "right" },
  divider:       { borderBottomWidth: 0.5, borderBottomColor: BORDER, marginVertical: 4 },
  twoCol:        { flexDirection: "row-reverse", gap: 16 },
  col:           { flex: 1 },
  note:          { fontSize: 8, color: MUTED, fontStyle: "italic", marginTop: 2 },
});

// ── Data type ──────────────────────────────────────────────────────────────────
export interface PhysioCasePdfData {
  patient: { firstName: string; lastName: string; patientNumber: string; gender?: string; dateOfBirth?: string; occupation?: string; receivesAid?: string };
  caseId: string;
  caseStatus: string;
  caseCreatedAt: string;
  complaint: {
    majorComplaint: string; symptoms: string; currentJob: string; lifeType: string;
    complaintStartDate: string; possibleCause: string; previousDoctorSeen: string;
    previousTreatment: string; painLevel: string; painDuration: string;
    painProgression: string; hadPreviousInjury: string;
    bestTimeOfDay: string; worstTimeOfDay: string;
    complaintType: string; painLocation: string; complaintDuration: string;
    complaintNotes: string; hasChronicDiseases: boolean; chronicDiseasesDetail: string;
    visitedSpecialist: boolean; specialistReason: string;
    hadPreviousPT: boolean; previousPTDetail: string;
    hadSurgery: boolean; surgeryDetail: string;
  };
  painRegions: PainRegion[];
  painTypes: string[];
  painTypeOther?: string;
  painTypeOtherColor?: string;
  customPainTypes?: { name: string; color: string }[];
  aggravatingFactors: string[];
  alleviatingFactors: string[];
  aggravatingOther: string;
  alleviatingOther: string;
  history: {
    lifeType: string; smokes: boolean; hasSmokedBefore: boolean; smokingFrequency: string;
    hasPacemaker: boolean; pacemakerDetail: string; allergies: string;
    adhesiveAllergy: boolean; adhesiveAllergyDetail: string;
    chronicConditionsOther: string; isPregnant: boolean;
    maritalStatus: string; lastMenstrualPeriod: string;
    prescriptionDrugs: boolean; currentMedications: string;
    herbalSupplements: boolean; supplementsList: string;
    previousDiagnoses: string; previousComplaintsSurgeries: string;
    hasOtherHealthProblems: boolean; otherConditions: string;
    hasDoctorRestrictions: boolean; doctorRestrictions: string;
    hadPTSameProblem: boolean; ptSameProblemDetail: string;
    receivingOtherTreatment: boolean; otherTreatmentDetail: string;
    testsOther: string; testResults: string;
    newAnalysis: string; newAnalysisDate: string;
    oldAnalysis: string; oldAnalysisDate: string;
    boneDensityTest: boolean; boneDensityDetail: string;
    hospitalizedLastYear: boolean; hospitalizedDetail: string;
    hadSurgeries: boolean; surgeriesDetail: string;
  };
  chronicConditions: ChronicCondition[];
  testsHad: TestType[];
  surgeries: { name: string; type: string; date: string }[];
  goals: PhysioGoal[];
  goalsExtra: {
    customGoal: string; decreasePain: boolean; improveStrength: boolean;
    lessDifficultyWork: boolean; improveMovement: boolean;
    standLonger: string; sleepLonger: string; sitLonger: string; otherGoals: string;
  };
  postural: {
    seatedPosition: string; trunkControl: string;
    headNeutral: boolean; headHyperextended: boolean; headFwdFlexed: boolean;
    headLaterallyFlexedL: boolean; headLaterallyFlexedR: boolean;
    headRotatedL: boolean; headRotatedR: boolean;
    shouldersLevel: boolean;
    shouldersElevatedL: boolean; shouldersElevatedR: boolean;
    shouldersSublaxedL: boolean; shouldersSublaxedR: boolean;
    elbowHyperextended: boolean; elbowFlexed: boolean;
    ribCageNeutral: boolean;
    ribCageElevatedL: boolean; ribCageElevatedR: boolean;
    spineNeutral: boolean; spineKyphosis: boolean; spineFlatLumbar: boolean;
    spineNormalLumbar: boolean; spineHyperLordotic: boolean;
    spineScoliosisApexL: boolean; spineScoliosisApexR: boolean;
    pelvisNeutral: boolean; pelvisAnteriorTilt: boolean; pelvisPosteriorTilt: boolean;
    pelvisObliqueL: boolean; pelvisObliqueR: boolean; pelvisOther: string;
    hipsAbductedL: boolean; hipsAbductedR: boolean;
    hipsAdductedL: boolean; hipsAdductedR: boolean;
    hipsFlexedL: boolean; hipsFlexedR: boolean;
    kneesFlexedBeyond90L: boolean; kneesFlexedBeyond90R: boolean;
    kneesExtendedBeyond90L: boolean; kneesExtendedBeyond90R: boolean;
    feetPronateEvertL: boolean; feetPronateEvertR: boolean;
    feetSupinateInvL: boolean; feetSupinateInvR: boolean;
    feetDorsiflexedL: boolean; feetDorsiflexedR: boolean;
    feetPlantarflexedL: boolean; feetPlantarflexedR: boolean;
    feetOther: string; spasticityNotes: string; generalNotes: string; diagnosis: string;
  };
  planModalities: TherapyModality[];
  planOtherModality: string;
  planHeader: { treatmentFrom: string; treatmentTo: string; anticipatedVisits: string; physiotherapistName?: string; caseManagerName?: string };
  planRemarks: string;
  planObservation: string;
  evalModalities: EvaluationModality[];
  evalOtherModality: string;
  evalNotes: string;
  evalText: string;
  sessions: PhysioSession[];
  supervisorGaze: string;
  doctorGaze: string;
  finalSummary: string;
}

// ── Helper components ──────────────────────────────────────────────────────────

// react-pdf does NOT apply OpenType GSUB for Arabic — letters appear disconnected without
// pre-shaping. We convert to Unicode Presentation Forms (FB50-FDFF) which Amiri has in its
// cmap, so fontkit renders the correct contextual glyph for each char.
const _AF: Record<number, readonly [string,string,string,string]> = {
  0x0622:['آ','ﺂ','',''],   0x0623:['أ','ﺄ','',''],   0x0624:['ؤ','ﺆ','',''],
  0x0625:['إ','ﺈ','',''],   0x0626:['ﺉ','ﺊ','ﺋ','ﺌ'], 0x0627:['ﺍ','ﺎ','',''],
  0x0628:['ﺏ','ﺐ','ﺑ','ﺒ'], 0x0629:['ﺓ','ﺔ','',''],   0x062A:['ﺕ','ﺖ','ﺗ','ﺘ'],
  0x062B:['ﺙ','ﺚ','ﺛ','ﺜ'], 0x062C:['ﺝ','ﺞ','ﺟ','ﺠ'], 0x062D:['ﺡ','ﺢ','ﺣ','ﺤ'],
  0x062E:['ﺥ','ﺦ','ﺧ','ﺨ'], 0x062F:['ﺩ','ﺪ','',''],   0x0630:['ﺫ','ﺬ','',''],
  0x0631:['ﺭ','ﺮ','',''],   0x0632:['ﺯ','ﺰ','',''],   0x0633:['ﺱ','ﺲ','ﺳ','ﺴ'],
  0x0634:['ﺵ','ﺶ','ﺷ','ﺸ'], 0x0635:['ﺹ','ﺺ','ﺻ','ﺼ'], 0x0636:['ﺽ','ﺾ','ﺿ','ﻀ'],
  0x0637:['ﻁ','ﻂ','ﻃ','ﻄ'], 0x0638:['ﻅ','ﻆ','ﻇ','ﻈ'], 0x0639:['ﻉ','ﻊ','ﻋ','ﻌ'],
  0x063A:['ﻍ','ﻎ','ﻏ','ﻐ'], 0x0641:['ﻑ','ﻒ','ﻓ','ﻔ'], 0x0642:['ﻕ','ﻖ','ﻗ','ﻘ'],
  0x0643:['ﻙ','ﻚ','ﻛ','ﻜ'], 0x0644:['ﻝ','ﻞ','ﻟ','ﻠ'], 0x0645:['ﻡ','ﻢ','ﻣ','ﻤ'],
  0x0646:['ﻥ','ﻦ','ﻧ','ﻨ'], 0x0647:['ﻩ','ﻪ','ﻫ','ﻬ'], 0x0648:['ﻭ','ﻮ','',''],
  0x0649:['ﻯ','ﻰ','',''],   0x064A:['ﻱ','ﻲ','ﻳ','ﻴ'],
};
// Letters that do NOT join on their LEFT side (non-joining to left / right-joining only)
const _NJL = new Set([0x0621,0x0622,0x0623,0x0624,0x0625,0x0627,0x0629,0x062F,0x0630,0x0631,0x0632,0x0648,0x0649]);
// Mandatory lam-alef ligatures [isolated, final]
const _LA: Record<number,[string,string]> = {
  0x0622:['ﻵ','ﻶ'], 0x0623:['ﻷ','ﻸ'], 0x0625:['ﻹ','ﻺ'], 0x0627:['ﻻ','ﻼ'],
};
// Combining / transparent characters — skip when computing joining context
const _CMB = new Set([
  0x0610,0x0611,0x0612,0x0613,0x0614,0x0615,0x0616,0x0617,0x0618,0x0619,0x061A,
  0x064B,0x064C,0x064D,0x064E,0x064F,0x0650,0x0651,0x0652,0x0653,0x0654,0x0655,
  0x0656,0x0657,0x0658,0x0659,0x065A,0x065B,0x065C,0x065D,0x065E,0x065F,0x0640,
]);

function ar(s: string): string {
  if (!s) return "";
  if (!/[؀-ۿ]/.test(s)) return s;
  const cs = [...s];
  const out: string[] = [];
  // Find nearest base (non-combining) codepoint in direction dir from index idx
  const base = (idx: number, dir: -1 | 1): number => {
    let i = idx + dir;
    while (i >= 0 && i < cs.length) {
      const cp = cs[i].codePointAt(0) ?? 0;
      if (!_CMB.has(cp)) return cp;
      i += dir;
    }
    return 0;
  };

  for (let i = 0; i < cs.length; i++) {
    const c = cs[i].codePointAt(0) ?? 0;
    // Combining / transparent → pass through
    if (_CMB.has(c)) { out.push(cs[i]); continue; }
    const f = _AF[c];
    if (!f) { out.push(cs[i]); continue; }
    const p = base(i, -1);  // previous base char (toward index 0)
    const n = base(i,  1);  // next base char (toward end)
    // Mandatory lam-alef ligature
    if (c === 0x0644 && _LA[n]) {
      const pj = !!(p && _AF[p] && !_NJL.has(p));
      out.push(_LA[n][pj ? 1 : 0]);
      // consume the alef (and any combining marks between lam and alef)
      i++;
      while (i + 1 < cs.length && _CMB.has(cs[i + 1].codePointAt(0) ?? 0)) {
        out.push(cs[++i]);
      }
      continue;
    }
    // pj = previous char can join on its LEFT (= toward this char)
    const pj = !!(p && _AF[p] && !_NJL.has(p));
    // nj = this char can join on its LEFT (= toward next), AND next char exists in _AF
    const nj = !_NJL.has(c) && !!(n && _AF[n]);
    out.push(f[pj && nj ? 3 : pj ? 1 : nj ? 2 : 0] || cs[i]);
  }
  return out.join('');
}

// ── Sheet context ─────────────────────────────────────────────────────────────
// react-pdf applies no bidi algorithm and breaks long Arabic lines in the wrong
// direction, so Arabic runs are pre-shaped by `ar()` and laid out word by word
// right-to-left by flexbox. Latin locales take the plain path: one Text node,
// rows running left to right. The helpers read the direction off a context so
// the call sites stay as they were.
export interface SheetDir {
  rtl: boolean;
  /** The flex direction a row of this sheet runs in. */
  row: "row" | "row-reverse";
  /** The edge text aligns to. */
  align: "right" | "left";
}

const SheetCtx = React.createContext<SheetDir>({ rtl: true, row: "row-reverse", align: "right" });
const useDir = () => React.useContext(SheetCtx);

// The translator reaches the leaf helpers the same way the direction does.
const TCtx = React.createContext<SheetT>(((k: string) => k) as SheetT);
const useSheetT = () => React.useContext(TCtx);

/** One text run, laid out in the sheet's own direction. */
const Txt = ({ t: text, style }: { t?: string | number | null; style?: Style | Style[] }) => {
  const dir = useDir();
  const v = text == null ? "" : String(text);
  if (!dir.rtl || !v) return <Text style={style}>{v}</Text>;
  // Arabic never joins across a space, so shaping word by word is lossless —
  // and it lets flexbox, not react-pdf, decide the reading order.
  return (
    <View style={{ flexDirection: dir.row, flexWrap: "wrap", gap: 2.5 }}>
      {v.split(" ").filter(Boolean).map((w, i) => (
        <Text key={i} style={style}>{ar(w)}</Text>
      ))}
    </View>
  );
};

const SecHead = ({ label, break: brk }: { label: string; break?: boolean }) => (
  <View style={S.sectionHeader} break={brk}>
    <Text style={S.sectionHeaderText}>{ar(label)}</Text>
  </View>
);


const SubHead = ({ label, break: brk }: { label: string; break?: boolean }) => (
  <View style={S.subHeader} break={brk}>
    <Text style={S.subHeaderText}>{ar(label)}</Text>
  </View>
);

// ── Postural checkbox helpers ───────────────────────────────────────────────────
const BOX = { width: 9, height: 9, borderWidth: 0.8, borderColor: BRAND, justifyContent: "center" as const, alignItems: "center" as const };
const Chk = ({ checked, label }: { checked: boolean; label: string }) => {
  const dir = useDir();
  return (
  <View wrap={false} style={{ flexDirection: dir.row, alignItems: "center", gap: 4, marginBottom: 3 }}>
    <View style={{ ...BOX, backgroundColor: checked ? BRAND : "transparent" }}>
      {checked && <Text style={{ fontSize: 6, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
    </View>
    <Txt t={label} style={{ fontSize: 8.5, color: TEXT }} />
  </View>
  );
};
const LRChk = ({ left, right, label }: { left: boolean; right: boolean; label: string }) => {
  const dir = useDir();
  return (
  <View wrap={false} style={{ flexDirection: dir.row, alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
    <View style={{ flex: 1 }}><Txt t={label} style={{ fontSize: 8.5, color: TEXT }} /></View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Text style={{ fontSize: 7.5, color: MUTED }}>R</Text>
      <View style={{ ...BOX, backgroundColor: right ? BRAND : "transparent" }}>
        {right && <Text style={{ fontSize: 6, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
      </View>
      <Text style={{ fontSize: 7.5, color: MUTED }}>L</Text>
      <View style={{ ...BOX, backgroundColor: left ? BRAND : "transparent" }}>
        {left && <Text style={{ fontSize: 6, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
      </View>
    </View>
  </View>
  );
};
const PostSec = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const dir = useDir();
  return (
  <View wrap={false} style={{ borderWidth: 0.5, borderColor: BORDER, borderRadius: 4, padding: 7, marginBottom: 5 }}>
    <View style={{ flexDirection: dir.row, marginBottom: 5 }}>
      <Txt t={title} style={{ fontSize: 9, fontWeight: "bold", color: BRAND }} />
    </View>
    {children}
  </View>
  );
};

const F = ({ label, value }: { label: string; value?: string | number | null }) => {
  const dir = useDir();
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={[S.fieldRow, { flexDirection: dir.row }]} wrap={false}>
      <View style={{ width: 190, flexShrink: 0 }}>
        <Txt t={label} style={S.fieldLabel} />
      </View>
      <View style={{ flex: 1, paddingRight: dir.rtl ? 12 : 0, paddingLeft: dir.rtl ? 0 : 12 }}>
        <Txt t={v || "—"} style={{ fontSize: 8.5, color: MUTED }} />
      </View>
    </View>
  );
};

const Bool = ({ label, value, showNo = true }: { label: string; value: boolean; showNo?: boolean }) => {
  const dir = useDir();
  const t = useSheetT();
  if (!value && !showNo) return null;
  return (
    <View style={[S.fieldRow, { flexDirection: dir.row }]} wrap={false}>
      <View style={{ width: 190, flexShrink: 0 }}>
        <Txt t={label} style={S.fieldLabel} />
      </View>
      <View style={{ flex: 1, flexDirection: dir.row, gap: 3, paddingRight: dir.rtl ? 12 : 0, paddingLeft: dir.rtl ? 0 : 12 }}>
        <Text style={[{ fontSize: 8.5 }, value ? S.yes : S.no]}>{value ? "✓" : "✗"}</Text>
        <Txt t={value ? t("word.yes") : t("word.no")} style={[{ fontSize: 8.5 }, value ? S.yes : S.no]} />
      </View>
    </View>
  );
};

// Card-style field: label small above, value bold below
const FC = ({ label, value }: { label: string; value?: string | number | null }) => {
  const dir = useDir();
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={{ marginBottom: 6 }} wrap={false}>
      <View style={{ flexDirection: dir.row, marginBottom: 2 }}>
        <Txt t={label} style={{ fontSize: 7.5, color: TEXT }} />
      </View>
      <View style={{ flexDirection: dir.row }}>
        <Txt t={v || "—"} style={{ fontSize: 10, color: MUTED, fontWeight: "bold" }} />
      </View>
    </View>
  );
};

// ── Body pain map ─────────────────────────────────────────────────────────────
// SVG viewBox: 1456 × 1360 → PDF width 260 → height ≈ 243

const BODY_W = 260;
const BODY_H = Math.round(260 * (1360 / 1456));

const PAIN_COLORS: Record<string, string> = {
  NORMAL:         "#ef4444",
  NUMBNESS:       "#22c55e",
  DULL_ACHE:      "#f97316",
  HOT_BURNING:    "#fb923c",
  SHARP_STABBING: "#a855f7",
  PINS:           "#eab308",
  OTHER:          "#3b82f6",
};

const PAIN_LABEL_KEYS = [
  "NORMAL", "NUMBNESS", "DULL_ACHE", "HOT_BURNING", "SHARP_STABBING", "PINS", "OTHER",
] as const;

// Pain type and pain level are both multi-select in the complaint form and are
// stored as a comma-separated list of codes.
/** Pain type and level are stored as a comma-separated list of codes. */
const codeList = (value: string | null | undefined, t: SheetT, group: string) =>
  value
    ? value.split(",").filter(Boolean)
        .map((c) => t(`opts.${group}.${c.trim()}`) || c.trim()).join(" - ")
    : undefined;

const TEST_KEYS = ["MRI", "MYELOGRAM", "XRAY", "CT", "OTHER"] as const;

const FACTOR_KEYS = [
  "SITTING", "HEAT", "COLD", "COUGHING", "WALKING", "EXERCISE", "LYING_DOWN", "OTHER",
] as const;

const EVAL_PDF_PAIRS: [EvaluationModality, EvaluationModality?][] = [
  ["ESWT",       "MANUAL_THERAPY"],
  ["US",         "MASSAGE"],
  ["TENS",       "KINESIO_TAPING"],
  ["EMS",        "COMPRESSION"],
  ["LASER",      "PARAFFIN"],
  ["CPM",        "GRASTON"],
  ["HOT_PACKS",  "MET"],
  ["COLD_PACKS", "PNF"],
  ["TRACTION",   "INFRARED"],
  ["SIS",        "EXERCISES"],
  ["OTHER"],
];

const PLAN_PDF_PAIRS: [TherapyModality, TherapyModality?][] = [
  ["ESWT",       "MANUAL_THERAPY"],
  ["US",         "MASSAGE"],
  ["TENS",       "KINESIO_TAPING"],
  ["EMS",        "COMPRESSION"],
  ["LASER",      "PARAFFIN"],
  ["CPM",        "GRASTON"],
  ["HOT_PACKS",  "MET"],
  ["COLD_PACKS", "PNF"],
  ["TRACTION",   "INFRARED"],
  ["SIS",        "EXERCISES"],
  ["OTHER"],
];

const AllTagChips = ({ options, selected }: { options: { key: string; label: string }[]; selected: string[] }) => {
  const dir = useDir();
  return (
  <View style={{ flexDirection: dir.row, flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 4 }}>
    {options.map(({ key, label }) => {
      const active = selected.includes(key);
      return (
        <View key={key} wrap={false} style={{
          backgroundColor: active ? BRAND : BRAND_LIGHT,
          borderWidth: 0.5,
          borderColor: active ? BRAND : BORDER,
          borderRadius: 10,
          paddingHorizontal: 7,
          paddingVertical: 2.5,
        }}>
          <Txt t={label} style={{ fontSize: 7.5, color: active ? "#ffffff" : MUTED }} />
        </View>
      );
    })}
  </View>
  );
};

// Standalone label style — right-aligned, no fixed width (different from fieldLabel in fieldRow)
const SL = { fontSize: 8.5, color: TEXT, marginBottom: 2, textAlign: "right" as const };
/** The same standalone label style, pointed at the sheet's own edge. */
const useSL = () => {
  const dir = useDir();
  return { ...SL, textAlign: dir.align };
};

const BodyMapPdf = ({ regions, origin, otherColor, otherLabel, t }: { regions: PainRegion[]; origin: string; otherColor?: string; otherLabel?: string; t: SheetT }) => {
  const dir = useDir();
  const uniqueTypes = [...new Set(regions.map((r) => r.painType ?? "OTHER"))];

  function getPainColor(type: string) {
    if (type === "OTHER" && otherColor) return otherColor;
    return PAIN_COLORS[type] ?? "#ef4444";
  }

  function getPainLabel(type: string) {
    if (type === "OTHER" && otherLabel) return otherLabel;
    return t(`opts.painLabel.${type}`) || type;
  }

  return (
    <View style={{ alignItems: "center", marginTop: 6 }} wrap={false}>
      {/* صورة الجسم مع النقاط */}
      <View style={{ position: "relative", width: BODY_W, height: BODY_H }}>
        <Image
          src={`${origin}/human.svg`}
          style={{ width: BODY_W, height: BODY_H, position: "absolute", top: 0, left: 0 }}
        />
        {regions.map((r, i) => {
          const color = getPainColor(r.painType ?? "OTHER");
          const cx = (r.x / 100) * BODY_W;
          const cy = (r.y / 100) * BODY_H;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: cx - 5,
                top: cy - 5,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: color,
                borderWidth: 1.5,
                borderColor: "#ffffff",
              }}
            />
          );
        })}
      </View>
      {/* مفتاح الألوان */}
      {uniqueTypes.length > 0 && (
        <View style={{ flexDirection: dir.row, flexWrap: "wrap", gap: 6, marginTop: 6, justifyContent: "center" }}>
          {uniqueTypes.map((type) => (
            <View key={type} style={{ flexDirection: dir.row, alignItems: "center", gap: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getPainColor(type) }} />
              <Txt t={getPainLabel(type)} style={{ fontSize: 7.5, color: MUTED }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Page header & footer ──────────────────────────────────────────────────────

const PH = (_: { patient: PhysioCasePdfData["patient"]; caseId: string; generatedAt: string }) => (
  <View style={S.pageHeader} fixed>
    <View style={{ flexDirection: "column" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", color: BRAND, letterSpacing: 0.5 }}>VitaSyr.</Text>
      {/* <Text style={{ fontSize: 8.5, color: "#6b93b0", marginTop: 1, marginLeft: 2 }}>Physical Therapy &amp; Prosthetics</Text> */}
    </View>
  </View>
);

const PF = (_: { patient: PhysioCasePdfData["patient"] }) => {
  const dir = useDir();
  return (
  <View style={[S.pageFooter, { flexDirection: dir.row }]} fixed>
    {/* يمين: العنوان */}
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Text style={S.pageFooterText}>{ar("سوريا - حلب - حي حلب الجديدة شمالي")}</Text>
      <Text style={S.pageFooterText}>{ar("خلف فيلا العقاد - شارع إيكاردا")}</Text>
    </View>
    {/* وسط: الموقع والإيميل */}
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={S.pageFooterText}>www.VitaSyr-center.com</Text>
      <Text style={S.pageFooterText}>info@VitaSyr-center.com</Text>
    </View>
    {/* يسار: الهواتف */}
    <View style={{ alignItems: "flex-start", gap: 2 }}>
      <Text style={S.pageFooterText}>MOB: +963 935 813 333</Text>
      <Text style={S.pageFooterText}>TEL: +963 21 5226391  |  FAX: +963 21 5226392</Text>
    </View>
  </View>
  );
};

// ── PDF Document ──────────────────────────────────────────────────────────────

const PhysioPdfDoc = ({
  data, origin, t, dir, locale,
}: {
  data: PhysioCasePdfData;
  origin: string;
  t: SheetT;
  dir: SheetDir;
  locale: string;
}) => {
  const { patient, complaint, history, postural, sessions, goals, goalsExtra,
    chronicConditions, testsHad, surgeries, painRegions, painTypes,
    aggravatingFactors, alleviatingFactors } = data;

  const generatedAt = new Date().toLocaleDateString("en-GB");
  const sl = { ...SL, textAlign: dir.align };



  return (
    <Document
      title={`${t("word.title")} — ${patient.firstName} ${patient.lastName}`}
      author="Vita HR System"
      language={locale}
    >
      <Page size="A4" style={[S.page, { direction: dir.rtl ? "rtl" : "ltr", textAlign: dir.align }]}>
        <SheetCtx.Provider value={dir}>
        <TCtx.Provider value={t}>
        <PH patient={patient} caseId={data.caseId} generatedAt={generatedAt} />
        <PF patient={patient} />

        {/* ── 1. معلومات المريض ── */}
        <SecHead label={t("sections.patientInfo")} />
        <View
          style={{ flexDirection: dir.row, flexWrap: "wrap", gap: 0 }}
        >
          {[
            {
              label: t("patient.name"),
              value: `${patient.firstName} ${patient.lastName}`,
            },
            {
              label: t("patient.age"),
              value: patient.dateOfBirth
                ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} ${t("patient.years")}`
                : "—",
            },
            {
              label: t("patient.date"),
              value: new Date(data.caseCreatedAt).toLocaleDateString("en-GB"),
            },
            { label: t("patient.patientNumber"), value: patient.patientNumber },
            { label: t("patient.currentJob"), value: patient.occupation || "—" },
            { label: t("patient.caregiver"), value: patient.receivesAid || "—" },
          ].map((f) => (
            <View
              key={f.label}
              style={{
                width: "33%",
                paddingHorizontal: 6,
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: BORDER,
              }}
            >
              <FC label={f.label} value={f.value} />
            </View>
          ))}
        </View>

        {/* ── 2. الشكوى ── */}
        <SecHead label={t("sections.complaint")} />
        <F
          label={t("complaint.major")}
          value={complaint.majorComplaint}
        />
        <F label={t("complaint.startDate")} value={complaint.complaintStartDate} />
        <F label={t("complaint.possibleCause")} value={complaint.possibleCause} />
        <F
          label={t("complaint.previousDoctor")}
          value={complaint.previousDoctorSeen}
        />
        <F label={t("complaint.previousTreatment")} value={complaint.previousTreatment} />
        <F
          label={t("complaint.worstTime")}
          value={complaint.worstTimeOfDay}
        />
        <F
          label={t("complaint.bestTime")}
          value={complaint.bestTimeOfDay}
        />
        <F label={t("complaint.painType")} value={codeList(complaint.painDuration, t, "painType")} />
        <F label={t("complaint.painLevel")} value={codeList(complaint.painLevel, t, "painLevel")} />
        <F
          label={t("complaint.painProgression")}
          value={
            complaint.painProgression
              ? t(`opts.painProgression.${complaint.painProgression}`) || complaint.painProgression
              : undefined
          }
        />
        <F
          label={t("complaint.previousInjury")}
          value={complaint.hadPreviousInjury}
        />

        {/* ── 3. خريطة الألم ── */}
        <SecHead label={t("sections.painMap")} break />
        <BodyMapPdf
          regions={painRegions}
          origin={origin}
          otherColor={data.painTypeOtherColor}
          otherLabel={data.painTypeOther || undefined}
          t={t}
        />
        <View style={{ marginBottom: 4 }}>
          <Text style={sl}>{ar(t("painMap.painTypes"))}</Text>
          <AllTagChips
            options={PAIN_LABEL_KEYS.map((key) => ({ key, label: t(`opts.painLabel.${key}`) }))}
            selected={painTypes}
          />
          {data.painTypeOther && <F label={t("word.other")} value={data.painTypeOther} />}
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={sl}>{ar(t("painMap.aggravating"))}</Text>
          <AllTagChips
            options={FACTOR_KEYS.map((key) => ({ key, label: t(`opts.factor.${key}`) }))}
            selected={aggravatingFactors}
          />
          {data.aggravatingOther && (
            <F label={t("word.other")} value={data.aggravatingOther} />
          )}
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={sl}>{ar(t("painMap.alleviating"))}</Text>
          <AllTagChips
            options={FACTOR_KEYS.map((key) => ({ key, label: t(`opts.factor.${key}`) }))}
            selected={alleviatingFactors}
          />
          {data.alleviatingOther && (
            <F label={t("word.other")} value={data.alleviatingOther} />
          )}
        </View>

        {/* ── 4. التاريخ الطبي ── */}
        <SecHead label={t("sections.medicalHistory")} break />
        <F
          label={t("history.lifeType")}
          value={
            history.lifeType
              ? t(`opts.lifeType.${history.lifeType}`) || history.lifeType
              : undefined
          }
        />
        <Bool label={t("history.smokes")} value={history.smokes} />
        {history.smokes && (
          <F label={t("history.smokeCount")} value={history.smokingFrequency} />
        )}
        <Bool label={t("history.smokedBefore")} value={history.hasSmokedBefore} />
        {!history.smokes && history.hasSmokedBefore && (
          <F label={t("history.smokeCount")} value={history.smokingFrequency} />
        )}
        <Bool
          label={t("history.pacemaker")}
          value={history.hasPacemaker}
        />
        {history.hasPacemaker && (
          <F label={t("history.deviceType")} value={history.pacemakerDetail} />
        )}
        <F label={t("history.allergies")} value={history.allergies} />

        {patient.gender === "FEMALE" && (
          <>
            <Bool label={t("history.pregnant")} value={history.isPregnant} />
            <F label={t("history.maritalStatus")} value={history.maritalStatus} />
            <F label={t("history.lastPeriod")} value={history.lastMenstrualPeriod} />
          </>
        )}

        <F
          label={t("history.previousDiagnoses")}
          value={history.previousDiagnoses}
        />
        <Bool
          label={t("history.otherHealthProblems")}
          value={history.hasOtherHealthProblems}
        />
        {history.hasOtherHealthProblems && (
          <F label={t("word.details")} value={history.otherConditions} />
        )}
        <Bool
          label={t("history.doctorRestrictions")}
          value={history.hasDoctorRestrictions}
        />
        {history.hasDoctorRestrictions && (
          <F label={t("history.instructions")} value={history.doctorRestrictions} />
        )}
        <Bool
          label={t("history.prescriptionDrugs")}
          value={history.prescriptionDrugs}
        />
        {history.prescriptionDrugs && (
          <F label={t("history.medications")} value={history.currentMedications} />
        )}
        <Bool
          label={t("history.herbal")}
          value={history.herbalSupplements}
        />
        {history.herbalSupplements && (
          <F label={t("word.details")} value={history.supplementsList} />
        )}
        <Bool
          label={t("history.adhesiveAllergy")}
          value={history.adhesiveAllergy}
        />
        {history.adhesiveAllergy && (
          <F label={t("word.details")} value={history.adhesiveAllergyDetail} />
        )}
        <F
          label={t("history.previousComplaints")}
          value={history.previousComplaintsSurgeries}
        />
        <Bool label={t("history.hadSurgeries")} value={history.hadSurgeries} />

        {history.hadSurgeries && surgeries.some((s) => s.name) && (
          <View style={{ marginTop: 6 }}>
            <SubHead label={t("sub.surgeries")} />
            <View style={S.table}>
              <View style={S.tableHeaderRow}>
                <Text style={S.tableCellHead}>{ar(t("surgeryTable.name"))}</Text>
                <Text style={S.tableCellHead}>{ar(t("surgeryTable.type"))}</Text>
                <Text style={S.tableCellHead}>{ar(t("surgeryTable.date"))}</Text>
              </View>
              {surgeries
                .filter((s) => s.name)
                .map((s, i) => (
                  <View
                    key={i}
                    style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
                  >
                    <Text style={S.tableCell}>{s.name}</Text>
                    <Text style={S.tableCell}>{s.type || "—"}</Text>
                    <Text style={S.tableCell}>{s.date || "—"}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        <SubHead label={t("sub.ptAndOther")} break />
        <Bool
          label={t("history.hadPTSame")}
          value={history.hadPTSameProblem}
        />
        {history.hadPTSameProblem && (
          <F label={t("word.details")} value={history.ptSameProblemDetail} />
        )}
        <Bool
          label={t("history.otherTreatment")}
          value={history.receivingOtherTreatment}
        />
        {history.receivingOtherTreatment && (
          <F label={t("word.details")} value={history.otherTreatmentDetail} />
        )}

        <SubHead label={t("sub.testsAnalyses")} />
        <View style={{ marginBottom: 4 }}>
          <Text style={sl}>{ar(t("history.imagingType"))}</Text>
          <View
            style={{
              flexDirection: dir.row,
              flexWrap: "wrap",
              gap: 2,
              marginTop: 3,
            }}
          >
            {TEST_KEYS.map((key) => (
              <View key={key} style={{ width: "48%" }}>
                <Chk checked={testsHad.includes(key as TestType)} label={t(`opts.test.${key}`)} />
              </View>
            ))}
          </View>
          {history.testsOther && (
            <F label={t("history.otherDetails")} value={history.testsOther} />
          )}
        </View>
        <F label={t("history.results")} value={history.testResults} />
        <Text style={[sl, { marginTop: 4 }]}>
          {ar(t("history.analysesDone"))}
        </Text>
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label={t("history.newAnalysis")} value={history.newAnalysis} />
            <F label={t("history.newAnalysisDate")} value={history.newAnalysisDate} />
          </View>
          <View style={S.col}>
            <F label={t("history.oldAnalysis")} value={history.oldAnalysis} />
            <F label={t("history.oldAnalysisDate")} value={history.oldAnalysisDate} />
          </View>
        </View>
        <Bool label={t("history.boneDensity")} value={history.boneDensityTest} />
        {history.boneDensityTest && (
          <F label={t("word.details")} value={history.boneDensityDetail} />
        )}
        <Bool
          label={t("history.hospitalized")}
          value={history.hospitalizedLastYear}
        />
        {history.hospitalizedLastYear && (
          <F label={t("word.details")} value={history.hospitalizedDetail} />
        )}

        <SubHead label={t("sub.chronicList")} />
        {(() => {
          const entries = CHRONIC_CONDITION_VALUES;
          const rows: ChronicCondition[][] = [];
          for (let i = 0; i < entries.length; i += 3)
            rows.push(entries.slice(i, i + 3));
          return rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: dir.row, gap: 4 }}>
              {row.map((key) => (
                <View key={key} style={{ flex: 1 }}>
                  <Chk
                    checked={chronicConditions.includes(key)}
                    label={t(`chronic.${key}`)}
                  />
                </View>
              ))}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, j) => (
                  <View key={j} style={{ flex: 1 }} />
                ))}
            </View>
          ));
        })()}
        {history.chronicConditionsOther && (
          <F label={t("word.other")} value={history.chronicConditionsOther} />
        )}

        {/* ── 5. أهداف العلاج ── */}
        <SecHead label={t("sections.goals")} break />
        {/* All goal checkboxes — 2 columns */}
        <View
          style={{
            flexDirection: dir.row,
            flexWrap: "wrap",
            gap: 2,
            marginBottom: 6,
          }}
        >
          {PHYSIO_GOAL_VALUES.map((key) => (
            <View key={key} style={{ width: "48%" }}>
              <Chk checked={goals.includes(key)} label={t(`goal.${key}`)} />
            </View>
          ))}
          <View style={{ width: "48%" }}>
            <Chk
              checked={goalsExtra.decreasePain}
              label={t("goals.decreasePain")}
            />
          </View>
          <View style={{ width: "48%" }}>
            <Chk
              checked={goalsExtra.improveStrength}
              label={t("goals.improveStrength")}
            />
          </View>
          <View style={{ width: "48%" }}>
            <Chk
              checked={goalsExtra.lessDifficultyWork}
              label={t("goals.lessDifficulty")}
            />
          </View>
          <View style={{ width: "48%" }}>
            <Chk
              checked={goalsExtra.improveMovement}
              label={t("goals.improveMovement")}
            />
          </View>
        </View>
        {/* Duration fields — always shown */}
        <View style={{ flexDirection: dir.row, gap: 8, marginBottom: 4 }}>
          <View
            style={{
              flex: 1,
              borderWidth: 0.5,
              borderColor: BORDER,
              borderRadius: 3,
              padding: 5,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                color: MUTED,
                textAlign: dir.align,
                marginBottom: 3,
              }}
            >
              {ar(t("goals.standLonger"))}
            </Text>
            <Text style={{ fontSize: 9, color: TEXT, textAlign: dir.align }}>
              {ar(goalsExtra.standLonger || "—")}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderWidth: 0.5,
              borderColor: BORDER,
              borderRadius: 3,
              padding: 5,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                color: MUTED,
                textAlign: dir.align,
                marginBottom: 3,
              }}
            >
              {ar(t("goals.sleepLonger"))}
            </Text>
            <Text style={{ fontSize: 9, color: TEXT, textAlign: dir.align }}>
              {ar(goalsExtra.sleepLonger || "—")}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderWidth: 0.5,
              borderColor: BORDER,
              borderRadius: 3,
              padding: 5,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                color: MUTED,
                textAlign: dir.align,
                marginBottom: 3,
              }}
            >
              {ar(t("goals.sitLonger"))}
            </Text>
            <Text style={{ fontSize: 9, color: TEXT, textAlign: dir.align }}>
              {ar(goalsExtra.sitLonger || "—")}
            </Text>
          </View>
        </View>
        {goalsExtra.customGoal && (
          <F label={t("goals.customGoal")} value={goalsExtra.customGoal} />
        )}
        {goalsExtra.otherGoals && (
          <F label={t("goals.otherGoals")} value={goalsExtra.otherGoals} />
        )}

        {/* ── 6. خطة التقييم ── */}
        <SecHead label={t("sections.evalPlan")} break />
        <F
          label={t("postural.seatedPosition")}
          value={postural.seatedPosition}
        />
        <F label={t("postural.trunkControl")} value={postural.trunkControl} />

        <View style={{ marginTop: 4 }}>
          <PostSec title={t("region.head")}>
            <Chk checked={postural.headNeutral} label={t("pos.neutral")} />
            <Chk checked={postural.headHyperextended} label={t("pos.hyperextended")} />
            <Chk checked={postural.headFwdFlexed} label={t("pos.fwdFlexed")} />
            <LRChk
              left={postural.headLaterallyFlexedL}
              right={postural.headLaterallyFlexedR}
              label={t("pos.laterallyFlexed")}
            />
            <LRChk
              left={postural.headRotatedL}
              right={postural.headRotatedR}
              label={t("pos.rotated")}
            />
          </PostSec>

          <PostSec title={t("region.shoulders")}>
            <Chk checked={postural.shouldersLevel} label={t("pos.level")} />
            <LRChk
              left={postural.shouldersElevatedL}
              right={postural.shouldersElevatedR}
              label={t("pos.elevatedPlural")}
            />
            <LRChk
              left={postural.shouldersSublaxedL}
              right={postural.shouldersSublaxedR}
              label={t("pos.sublaxed")}
            />
          </PostSec>

          <PostSec title={t("region.elbow")}>
            <Chk checked={postural.elbowHyperextended} label={t("pos.hyperextended")} />
            <Chk checked={postural.elbowFlexed} label={t("pos.flexed")} />
          </PostSec>

          <PostSec title={t("region.ribCage")}>
            <Chk checked={postural.ribCageNeutral} label={t("pos.neutral")} />
            <LRChk
              left={postural.ribCageElevatedL}
              right={postural.ribCageElevatedR}
              label={t("pos.elevated")}
            />
          </PostSec>

          <PostSec title={t("region.spine")}>
            <Chk checked={postural.spineNeutral} label={t("pos.neutral")} />
            <Chk checked={postural.spineKyphosis} label={t("pos.kyphosis")} />
            <Chk checked={postural.spineFlatLumbar} label={t("pos.flatLumbar")} />
            <Chk checked={postural.spineNormalLumbar} label={t("pos.normalLumbar")} />
            <Chk checked={postural.spineHyperLordotic} label={t("pos.hyperLordotic")} />
            <LRChk
              left={postural.spineScoliosisApexL}
              right={postural.spineScoliosisApexR}
              label={t("pos.scoliosisApex")}
            />
          </PostSec>

          <PostSec title={t("region.pelvis")}>
            <Chk checked={postural.pelvisNeutral} label={t("pos.neutral")} />
            <Chk checked={postural.pelvisAnteriorTilt} label={t("pos.anteriorTilt")} />
            <Chk checked={postural.pelvisPosteriorTilt} label={t("pos.posteriorTilt")} />
            <LRChk
              left={postural.pelvisObliqueL}
              right={postural.pelvisObliqueR}
              label={t("pos.oblique")}
            />
            {postural.pelvisOther && (
              <F label={t("word.other")} value={postural.pelvisOther} />
            )}
          </PostSec>

          <PostSec title={t("region.hips")}>
            <LRChk
              left={postural.hipsAbductedL}
              right={postural.hipsAbductedR}
              label={t("pos.abducted")}
            />
            <LRChk
              left={postural.hipsAdductedL}
              right={postural.hipsAdductedR}
              label={t("pos.adducted")}
            />
            <LRChk
              left={postural.hipsFlexedL}
              right={postural.hipsFlexedR}
              label={t("pos.flexed")}
            />
          </PostSec>

          <PostSec title={t("region.knees")}>
            <LRChk
              left={postural.kneesFlexedBeyond90L}
              right={postural.kneesFlexedBeyond90R}
              label={t("pos.flexedBeyond90")}
            />
            <LRChk
              left={postural.kneesExtendedBeyond90L}
              right={postural.kneesExtendedBeyond90R}
              label={t("pos.extendedBeyond90")}
            />
          </PostSec>

          <PostSec title={t("region.feet")}>
            <LRChk
              left={postural.feetPronateEvertL}
              right={postural.feetPronateEvertR}
              label={t("pos.pronateEvert")}
            />
            <LRChk
              left={postural.feetSupinateInvL}
              right={postural.feetSupinateInvR}
              label={t("pos.supinateInv")}
            />
            <LRChk
              left={postural.feetDorsiflexedL}
              right={postural.feetDorsiflexedR}
              label={t("pos.dorsiflexed")}
            />
            <LRChk
              left={postural.feetPlantarflexedL}
              right={postural.feetPlantarflexedR}
              label={t("pos.plantarflexed")}
            />
            {postural.feetOther && (
              <F label={t("word.other")} value={postural.feetOther} />
            )}
          </PostSec>
        </View>

        <F
          label={t("postural.spasticity")}
          value={postural.spasticityNotes}
        />
        <F label={t("postural.comments")} value={postural.generalNotes} />
        <F label={t("postural.diagnosis")} value={postural.diagnosis} />

        {/* ── 7. خطة العلاج ── */}
        <SecHead label={t("sections.treatmentPlan")} break />
        {/* Header row */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label={t("plan.from")} value={data.planHeader.treatmentFrom} />
            <F label={t("plan.to")} value={data.planHeader.treatmentTo} />
            <F label={t("plan.visits")} value={data.planHeader.anticipatedVisits} />
          </View>
          <View style={S.col}>
            <F
              label={t("plan.physiotherapist")}
              value={data.planHeader.physiotherapistName}
            />
            <F label={t("plan.caseManager")} value={data.planHeader.caseManagerName} />
          </View>
        </View>
        {/* Modalities — 2-col checkbox grid, ALL options */}
        <SubHead label={t("sub.patientPlan")} />
        <View style={{ flexDirection: dir.row, gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            {PLAN_PDF_PAIRS.map(([right]) => (
              <Chk
                key={right}
                checked={data.planModalities.includes(right)}
                label={t(`modality.${right}`)}
              />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {PLAN_PDF_PAIRS.map(([, left]) =>
              left ? (
                <Chk
                  key={left}
                  checked={data.planModalities.includes(left)}
                  label={t(`modality.${left}`)}
                />
              ) : (
                <View key="_gap" style={{ marginBottom: 3, height: 12 }} />
              ),
            )}
          </View>
        </View>
        {data.planOtherModality && (
          <F label={t("word.other")} value={data.planOtherModality} />
        )}
        <F label={t("plan.observation")} value={data.planObservation} />
        <F label={t("plan.summary")} value={data.planRemarks} />

        {/* ── 8. الملاحظات والتقييم ── */}
        <SecHead label={t("sections.notesEval")} break />
        <F label={t("postural.diagnosis")} value={data.postural.diagnosis} />
        <SubHead label={t("sub.appliedTreatment")} />
        <View style={{ flexDirection: dir.row, gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            {EVAL_PDF_PAIRS.map(([right]) => (
              <Chk
                key={right}
                checked={data.evalModalities.includes(right)}
                label={t(`modality.${right}`)}
              />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {EVAL_PDF_PAIRS.map(([, left]) =>
              left ? (
                <Chk
                  key={left}
                  checked={data.evalModalities.includes(left)}
                  label={t(`modality.${left}`)}
                />
              ) : (
                <View key="_gap" style={{ marginBottom: 3, height: 12 }} />
              ),
            )}
          </View>
        </View>
        {data.evalOtherModality && (
          <F label={t("word.other")} value={data.evalOtherModality} />
        )}

        {/* ── 9. الجلسات العلاجية ── */}
        <SecHead label={t("sections.sessions")} break />
        {sessions.length === 0 ? (
          <Text style={S.note}>{ar(t("sessionTable.empty"))}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 0.4 }]}>#</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>
                {ar(t("patient.date"))}
              </Text>
              <Text style={[S.tableCellHead, { flex: 0.7 }]}>
                {ar(t("sessionTable.time"))}
              </Text>
              <Text style={[S.tableCellHead, { flex: 2 }]}>
                {ar(t("sessionTable.notes"))}
              </Text>
              <Text style={[S.tableCellHead, { flex: 1.5 }]}>
                {ar(t("sections.supervisorOpinion"))}
              </Text>
              <Text style={[S.tableCellHead, { flex: 1.5 }]}>
                {ar(t("sessionTable.doctorDecision"))}
              </Text>
            </View>
            {[...sessions]
              .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
              .map((s, i) => (
                <View
                  key={i}
                  style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[S.tableCell, { flex: 0.4 }]}>
                    {s.sessionNumber}
                  </Text>
                  <Text style={[S.tableCell, { flex: 0.9 }]}>
                    {new Date(s.sessionDate).toLocaleDateString("en-GB")}
                  </Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>
                    {s.sessionTime ?? "—"}
                  </Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>
                    {ar(s.notes ?? "") || "—"}
                  </Text>
                  <Text style={[S.tableCell, { flex: 1.5 }]}>
                    {ar((s as any).supervisorOpinion ?? "") || "—"}
                  </Text>
                  <Text style={[S.tableCell, { flex: 1.5 }]}>
                    {ar((s as any).doctorDecision ?? "") || "—"}
                  </Text>
                </View>
              ))}
          </View>
        )}
        {data.finalSummary && (
          <>
            <SecHead label={t("sections.finalSummary")} />
            <Text style={S.fieldValue}>{ar(data.finalSummary)}</Text>
          </>
        )}

        {/* ── 10. رأي رئيس القسم ورأي الطبيب ── */}
        <SecHead label={t("sections.supervisorOpinion")} break />
        <Text style={S.fieldValue}>{ar(data.supervisorGaze ?? "") || "—"}</Text>
        <SecHead label={t("sections.doctorOpinion")} />
        <Text style={S.fieldValue}>{ar(data.doctorGaze ?? "") || "—"}</Text>

        {/* ── توقيعات ── */}
        <View
          style={{
            marginTop: 30,
            flexDirection: dir.row,
            justifyContent: "space-around",
          }}
        >
          {["physiotherapist", "patient", "supervisor"].map(
            (label, i) => (
              <View key={i} style={{ alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: 100,
                    borderBottomWidth: 0.5,
                    borderBottomColor: TEXT,
                  }}
                />
                <Text
                  style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}
                >
                  {ar(t(`signature.${label}`))}
                </Text>
              </View>
            ),
          )}
        </View>
        </TCtx.Provider>
        </SheetCtx.Provider>
      </Page>
    </Document>
  );
};

// ── Public export ─────────────────────────────────────────────────────────────

let fontsRegistered = false;

/**
 * @param t      a translator scoped to `clinic.physio.sheet`
 * @param locale the sheet's locale — only Arabic prints right-to-left
 */
export async function downloadPhysioCasePdf(
  data: PhysioCasePdfData,
  t: SheetT,
  locale: string,
): Promise<void> {
  if (!fontsRegistered) {
    const origin = window.location.origin;
    Font.register({
      family: "Amiri",
      fonts: [
        { src: `${origin}/fonts/amiri-regular.ttf`, fontWeight: "normal",  fontStyle: "normal" },
        { src: `${origin}/fonts/amiri-bold.ttf`,    fontWeight: "bold",    fontStyle: "normal" },
        { src: `${origin}/fonts/amiri-italic.ttf`,  fontWeight: "normal",  fontStyle: "italic" },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
  }

  const origin = window.location.origin;
  const rtl = locale === "ar";
  const dir: SheetDir = { rtl, row: rtl ? "row-reverse" : "row", align: rtl ? "right" : "left" };
  const blob = await pdf(
    <PhysioPdfDoc data={data} origin={origin} t={t} dir={dir} locale={locale} />,
  ).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `physio-${data.patient.patientNumber}-${data.caseId.slice(-8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
