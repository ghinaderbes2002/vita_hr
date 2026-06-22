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
  THERAPY_MODALITY_LABELS,
  EVALUATION_MODALITY_LABELS,
  CHRONIC_CONDITION_LABELS,
  PHYSIO_GOAL_LABELS,
} from "@/lib/api/clinic-physio";

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
  },
  fieldLabel: { fontSize: 8.5, color: TEXT, flex: 1.2, textAlign: "right" },
  fieldValue: { fontSize: 9.5, color: MUTED, flex: 1, textAlign: "left" },
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
  painTypeOther: string;
  painTypeOtherColor?: string;
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
const Chk = ({ checked, label }: { checked: boolean; label: string }) => (
  <View wrap={false} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 3 }}>
    <View style={{ ...BOX, backgroundColor: checked ? BRAND : "transparent" }}>
      {checked && <Text style={{ fontSize: 6, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
    </View>
    <Text style={{ fontSize: 8.5, color: TEXT }}>{ar(label)}</Text>
  </View>
);
const LRChk = ({ left, right, label }: { left: boolean; right: boolean; label: string }) => (
  <View wrap={false} style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
    <Text style={{ fontSize: 8.5, color: TEXT, flex: 1 }}>{ar(label)}</Text>
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
const PostSec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View wrap={false} style={{ borderWidth: 0.5, borderColor: BORDER, borderRadius: 4, padding: 7, marginBottom: 5 }}>
    <Text style={{ fontSize: 9, fontWeight: "bold", color: BRAND, marginBottom: 5, textAlign: "right" }}>{ar(title)}</Text>
    {children}
  </View>
);

const F = ({ label, value }: { label: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={S.fieldRow} wrap={false}>
      <Text style={S.fieldLabel}>{ar(label)}</Text>
      <Text style={S.fieldValue}>{ar(v) || "—"}</Text>
    </View>
  );
};

const Bool = ({ label, value, showNo = true }: { label: string; value: boolean; showNo?: boolean }) => {
  if (!value && !showNo) return null;
  return (
    <View style={S.fieldRow} wrap={false}>
      <Text style={S.fieldLabel}>{ar(label)}</Text>
      <Text style={[S.fieldValue, value ? S.yes : S.no]}>
        {value ? `✓ ${ar("نعم")}` : `✗ ${ar("لا")}`}
      </Text>
    </View>
  );
};

// Card-style field: label small above, value bold below
const FC = ({ label, value }: { label: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={{ marginBottom: 6 }} wrap={false}>
      <Text style={{ fontSize: 7.5, color: TEXT, marginBottom: 2 }}>{ar(label)}</Text>
      <Text style={{ fontSize: 10, color: MUTED, fontWeight: "bold" }}>{ar(v) || "—"}</Text>
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

const PAIN_LABELS_AR: Record<string, string> = {
  NORMAL: "عادي", NUMBNESS: "خدر", DULL_ACHE: "ألم خفيف",
  HOT_BURNING: "حارق", SHARP_STABBING: "حاد", PINS: "واخز", OTHER: "أخرى",
};

const TEST_LABELS_PDF: Record<string, string> = {
  MRI:       "التصوير بالرنين المغناطيسي / MRI",
  MYELOGRAM: "تصوير النخاع / Scan Myelogram",
  XRAY:      "الأشعة السينية / X-Ray",
  CT:        "التصوير المقطعي المحوسب / CT",
  OTHER:     "أخرى / Other",
};

const FACTOR_LABELS_AR: Record<string, string> = {
  SITTING: "الجلوس", HEAT: "الحرارة", COLD: "البرد", COUGHING: "السعال",
  WALKING: "المشي", EXERCISE: "التمرين", LYING_DOWN: "الاستلقاء", OTHER: "أخرى",
};

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

const AllTagChips = ({ options, selected }: { options: { key: string; label: string }[]; selected: string[] }) => (
  <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 4 }}>
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
          <Text style={{ fontSize: 7.5, color: active ? "#ffffff" : MUTED }}>{ar(label)}</Text>
        </View>
      );
    })}
  </View>
);

// Standalone label style — right-aligned, no fixed width (different from fieldLabel in fieldRow)
const SL = { fontSize: 8.5, color: TEXT, marginBottom: 2, textAlign: "right" as const };

const BodyMapPdf = ({ regions, origin, otherColor, otherLabel }: { regions: PainRegion[]; origin: string; otherColor?: string; otherLabel?: string }) => {
  const uniqueTypes = [...new Set(regions.map((r) => r.painType ?? "OTHER"))];

  function getPainColor(type: string) {
    if (type === "OTHER" && otherColor) return otherColor;
    return PAIN_COLORS[type] ?? "#ef4444";
  }

  function getPainLabel(type: string) {
    if (type === "OTHER" && otherLabel) return otherLabel;
    return PAIN_LABELS_AR[type] ?? type;
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
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 6, justifyContent: "center" }}>
          {uniqueTypes.map((type) => (
            <View key={type} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getPainColor(type) }} />
              <Text style={{ fontSize: 7.5, color: MUTED }}>{ar(getPainLabel(type))}</Text>
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

const PF = (_: { patient: PhysioCasePdfData["patient"] }) => (
  <View style={S.pageFooter} fixed>
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

// ── PDF Document ──────────────────────────────────────────────────────────────

const PhysioPdfDoc = ({ data, origin }: { data: PhysioCasePdfData; origin: string }) => {
  const { patient, complaint, history, postural, sessions, goals, goalsExtra,
    chronicConditions, testsHad, surgeries, painRegions, painTypes,
    aggravatingFactors, alleviatingFactors } = data;

  const generatedAt = new Date().toLocaleDateString("en-GB");



  return (
    <Document
      title={`حالة فيزيائي — ${patient.firstName} ${patient.lastName}`}
      author="Vita HR System"
      language="ar"
    >
      <Page size="A4" style={S.page}>
        <PH patient={patient} caseId={data.caseId} generatedAt={generatedAt} />
        <PF patient={patient} />

        {/* ── 1. معلومات المريض ── */}
        <SecHead label="معلومات المريض" />
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 0 }}>
          {[
            { label: "الاسم",              value: `${patient.firstName} ${patient.lastName}` },
            { label: "العمر",              value: patient.dateOfBirth
                ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة`
                : "—" },
            { label: "التاريخ",            value: new Date(data.caseCreatedAt).toLocaleDateString("en-GB") },
            { label: "رقم تعريف المريض",   value: patient.patientNumber },
            { label: "الوظيفة الحالية",    value: patient.occupation || "—" },
            { label: "مقدم الرعاية",       value: patient.receivesAid || "—" },
          ].map((f) => (
            <View key={f.label} style={{ width: "33%", paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
              <FC label={f.label} value={f.value} />
            </View>
          ))}
        </View>

        {/* ── 2. الشكوى ── */}
        <SecHead label="الشكوى" />
        <F label="ماهي شكواك الرئيسية؟"                       value={complaint.majorComplaint} />
        <F label="ماهي الأعراض التي تعاني منها؟"               value={complaint.symptoms} />
        <F label="السبب المحتمل"                               value={complaint.possibleCause} />
        <F label=":تاريخ البدء"                                 value={complaint.complaintStartDate} />
        <F label="تمت زيارة الطبيب السابق بسبب الشكوى"         value={complaint.previousDoctorSeen} />
        <F label="العلاج السابق للشكوى"                        value={complaint.previousTreatment} />
        <F label="في أي وقت تكون الأعراض أكثر إزعاجاً"        value={complaint.worstTimeOfDay} />
        <F label="في أي وقت تكون الأعراض أقل إزعاجاً"         value={complaint.bestTimeOfDay} />
        <F label="نوع الألم" value={
          complaint.painDuration === "INTERMITTENT"      ? "متقطع" :
          complaint.painDuration === "CONSTANT"          ? "مستمر" :
          complaint.painDuration === "WITH_CERTAIN_MOTIONS" ? "مع حركات معينة" :
          complaint.painDuration || undefined
        } />
        <F label="مستوى الألم الحالي" value={
          complaint.painLevel === "MILD"         ? "خفيف" :
          complaint.painLevel === "MODERATE"     ? "متوسط" :
          complaint.painLevel === "SEVERE"       ? "شديد" :
          complaint.painLevel === "EXCRUCIATING" ? "لا يُحتمل" :
          complaint.painLevel || undefined
        } />
        <F label="هل يتحسن الألم أم يزداد سوءاً؟" value={
          complaint.painProgression === "BETTER" ? "يتحسن" :
          complaint.painProgression === "WORSE"  ? "يزداد سوءاً" :
          complaint.painProgression === "SAME"   ? "ثابت" :
          complaint.painProgression || undefined
        } />
        <F label="هل سبق التعرض لهذه الإصابة؟"               value={complaint.hadPreviousInjury} />

        {/* ── 3. خريطة الألم ── */}
        <SecHead label="حدد أماكن الألم" break />
        <BodyMapPdf
          regions={painRegions}
          origin={origin}
          otherColor={data.painTypeOtherColor}
          otherLabel={data.painTypeOther || undefined}
        />
        <View style={{ marginBottom: 4 }}>
          <Text style={SL}>{ar("أنواع الألم")}</Text>
          <AllTagChips
            options={Object.entries(PAIN_LABELS_AR).map(([key, label]) => ({ key, label }))}
            selected={painTypes}
          />
          {data.painTypeOther && <F label="أخرى" value={data.painTypeOther} />}
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={SL}>{ar("العوامل المحرضة")}</Text>
          <AllTagChips
            options={Object.entries(FACTOR_LABELS_AR).map(([key, label]) => ({ key, label }))}
            selected={aggravatingFactors}
          />
          {data.aggravatingOther && <F label="أخرى" value={data.aggravatingOther} />}
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={SL}>{ar("العوامل المخففة")}</Text>
          <AllTagChips
            options={Object.entries(FACTOR_LABELS_AR).map(([key, label]) => ({ key, label }))}
            selected={alleviatingFactors}
          />
          {data.alleviatingOther && <F label="أخرى" value={data.alleviatingOther} />}
        </View>

        {/* ── 4. التاريخ الطبي ── */}
        <SecHead label="التاريخ الطبي" break />
        <F label="نمط الحياة" value={
          history.lifeType === "SEDENTARY"   ? "الحياة الخاملة" :
          history.lifeType === "NORMAL"      ? "الحياة الطبيعية" :
          history.lifeType === "ABNORMAL"    ? "غير اعتيادي / غير صحي" :
          history.lifeType === "PROFESSIONAL"? "رياضي" :
          history.lifeType || undefined
        } />
        <Bool label="هل تدخن؟" value={history.smokes} />
        {history.smokes && <F label="عدد المرات" value={history.smokingFrequency} />}
        <Bool label="هل سبق لك أن دخنت؟" value={history.hasSmokedBefore} />
        {!history.smokes && history.hasSmokedBefore && <F label="عدد المرات" value={history.smokingFrequency} />}
        <Bool label="هل لديك جهاز تنظيم ضربات القلب؟" value={history.hasPacemaker} />
        {history.hasPacemaker && <F label="نوع الجهاز" value={history.pacemakerDetail} />}
        <F label="الحساسية" value={history.allergies} />

        {patient.gender === "FEMALE" && (
          <>
            <Bool label="هل أنتِ حامل؟" value={history.isPregnant} />
            <F label="الحالة الاجتماعية" value={history.maritalStatus} />
            <F label="آخر دورة شهرية" value={history.lastMenstrualPeriod} />
          </>
        )}

        <Bool label="هل تتناول حالياً أي أدوية بوصفة طبية أو بدون وصفة؟" value={history.prescriptionDrugs} />
        {history.prescriptionDrugs && <F label="الأدوية" value={history.currentMedications} />}
        <F label="التشخيصات السابقة / الأدوية السابقة" value={history.previousDiagnoses} />
        <Bool label="هل تعاني من مشاكل صحية أخرى؟" value={history.hasOtherHealthProblems} />
        {history.hasOtherHealthProblems && <F label="التفاصيل" value={history.otherConditions} />}
        <Bool label="هل هناك أي شيء نصحك طبيبك بعدم القيام به؟" value={history.hasDoctorRestrictions} />
        {history.hasDoctorRestrictions && <F label="التعليمات" value={history.doctorRestrictions} />}
        <Bool label="هل تتناول حالياً أي مستحضرات عشبية أو فيتامينات؟" value={history.herbalSupplements} />
        {history.herbalSupplements && <F label="التفاصيل" value={history.supplementsList} />}
        <Bool label="هل لديك حساسية من المواد اللاصقة أو اللاتكس أو لسعات النحل؟" value={history.adhesiveAllergy} />
        {history.adhesiveAllergy && <F label="التفاصيل" value={history.adhesiveAllergyDetail} />}
        <F label="الشكاوى والعمليات السابقة" value={history.previousComplaintsSurgeries} />
        <Bool label="هل خضعت لأي عمليات جراحية؟" value={history.hadSurgeries} />

        {history.hadSurgeries && surgeries.some((s) => s.name) && (
          <View style={{ marginTop: 6 }}>
            <SubHead label="العمليات الجراحية (حتى 5)" />
            <View style={S.table}>
              <View style={S.tableHeaderRow}>
                <Text style={S.tableCellHead}>اسم العملية</Text>
                <Text style={S.tableCellHead}>النوع</Text>
                <Text style={S.tableCellHead}>التاريخ</Text>
              </View>
              {surgeries.filter((s) => s.name).map((s, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={S.tableCell}>{s.name}</Text>
                  <Text style={S.tableCell}>{s.type || "—"}</Text>
                  <Text style={S.tableCell}>{s.date || "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <SubHead label="العلاج الطبيعي والعلاجات الأخرى" break />
        <Bool label="هل خضعت للعلاج الطبيعي لنفس المشكلة؟" value={history.hadPTSameProblem} />
        {history.hadPTSameProblem && <F label="التفاصيل" value={history.ptSameProblemDetail} />}
        <Bool label="هل تتلقى علاجات أخرى لهذه المشكلة في هذا الوقت؟" value={history.receivingOtherTreatment} />
        {history.receivingOtherTreatment && <F label="التفاصيل" value={history.otherTreatmentDetail} />}

        <SubHead label="الفحوصات والتحاليل" />
        <View style={{ marginBottom: 4 }}>
          <Text style={SL}>{ar("ما هو نوع التصوير الشعاعي الذي قمت به؟")}</Text>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 2, marginTop: 3 }}>
            {(Object.entries(TEST_LABELS_PDF) as [TestType, string][]).map(([key, label]) => (
              <View key={key} style={{ width: "48%" }}>
                <Chk checked={testsHad.includes(key)} label={label} />
              </View>
            ))}
          </View>
          {history.testsOther && <F label="تفاصيل أخرى" value={history.testsOther} />}
        </View>
        <F label="نتائج / Results" value={history.testResults} />
        <Text style={[SL, { marginTop: 4 }]}>{ar("ما هي التحاليلات التي تم إجراؤها؟")}</Text>
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="تحليل جديد"          value={history.newAnalysis} />
            <F label="تاريخ التحليل الجديد" value={history.newAnalysisDate} />
          </View>
          <View style={S.col}>
            <F label="تحليل قديم"          value={history.oldAnalysis} />
            <F label="تاريخ التحليل القديم" value={history.oldAnalysisDate} />
          </View>
        </View>
        <Bool label="قياس كثافة العظام" value={history.boneDensityTest} />
        {history.boneDensityTest && <F label="التفاصيل" value={history.boneDensityDetail} />}
        <Bool label="هل سبق لك أن دخلت المستشفى خلال العام الماضي بسبب هذه الحالة؟" value={history.hospitalizedLastYear} />
        {history.hospitalizedLastYear && <F label="التفاصيل" value={history.hospitalizedDetail} />}

        <SubHead label="هل لديك أي مما يلي؟ (ضع علامة إذا نعم)" />
        {(() => {
          const entries = Object.entries(CHRONIC_CONDITION_LABELS) as [ChronicCondition, string][];
          const rows: [ChronicCondition, string][][] = [];
          for (let i = 0; i < entries.length; i += 3) rows.push(entries.slice(i, i + 3));
          return rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row-reverse", gap: 4 }}>
              {row.map(([key, label]) => (
                <View key={key} style={{ flex: 1 }}>
                  <Chk checked={chronicConditions.includes(key)} label={label} />
                </View>
              ))}
              {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, j) => (
                <View key={j} style={{ flex: 1 }} />
              ))}
            </View>
          ));
        })()}
        {history.chronicConditionsOther && <F label="أخرى" value={history.chronicConditionsOther} />}

        {/* ── 5. أهداف العلاج ── */}
        <SecHead label="أهداف العلاج" break />
        {/* All goal checkboxes — 2 columns */}
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>
          {(Object.entries(PHYSIO_GOAL_LABELS) as [PhysioGoal, string][]).map(([key, label]) => (
            <View key={key} style={{ width: "48%" }}>
              <Chk checked={goals.includes(key)} label={label} />
            </View>
          ))}
          <View style={{ width: "48%" }}>
            <Chk checked={goalsExtra.decreasePain}       label="تخفيف الألم / Decrease Pain" />
          </View>
          <View style={{ width: "48%" }}>
            <Chk checked={goalsExtra.improveStrength}    label="تحسين القوة / Improve Strength" />
          </View>
          <View style={{ width: "48%" }}>
            <Chk checked={goalsExtra.lessDifficultyWork} label="القيام ببعض الأنشطة / Less Difficulty" />
          </View>
          <View style={{ width: "48%" }}>
            <Chk checked={goalsExtra.improveMovement}    label="تحسين الحركة / Improve Movement" />
          </View>
        </View>
        {/* Duration fields — always shown */}
        <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1, borderWidth: 0.5, borderColor: BORDER, borderRadius: 3, padding: 5 }}>
            <Text style={{ fontSize: 8, color: MUTED, textAlign: "right", marginBottom: 3 }}>{ar("أطول فترة وقوف (ساعات/دقائق)")}</Text>
            <Text style={{ fontSize: 9, color: TEXT, textAlign: "right" }}>{ar(goalsExtra.standLonger || "—")}</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 0.5, borderColor: BORDER, borderRadius: 3, padding: 5 }}>
            <Text style={{ fontSize: 8, color: MUTED, textAlign: "right", marginBottom: 3 }}>{ar("أطول فترة نوم (ساعات/دقائق)")}</Text>
            <Text style={{ fontSize: 9, color: TEXT, textAlign: "right" }}>{ar(goalsExtra.sleepLonger || "—")}</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 0.5, borderColor: BORDER, borderRadius: 3, padding: 5 }}>
            <Text style={{ fontSize: 8, color: MUTED, textAlign: "right", marginBottom: 3 }}>{ar("أطول فترة جلوس (ساعات/دقائق)")}</Text>
            <Text style={{ fontSize: 9, color: TEXT, textAlign: "right" }}>{ar(goalsExtra.sitLonger || "—")}</Text>
          </View>
        </View>
        {goalsExtra.customGoal && <F label="هدف مخصص"   value={goalsExtra.customGoal} />}
        {goalsExtra.otherGoals && <F label="أهداف أخرى" value={goalsExtra.otherGoals} />}

        {/* ── 6. خطة التقييم ── */}
        <SecHead label="خطة التقييم" break />
        <F label="الوضعية الحالية للجلوس (حسب أفضل تقييم مع ملاحظة الوضعيات الثابتة)" value={postural.seatedPosition} />
        <F label="التحكم في التوازن / الجذع" value={postural.trunkControl} />

        <View style={{ marginTop: 4 }}>
          <PostSec title="الرأس">
            <Chk checked={postural.headNeutral}       label="حيادي" />
            <Chk checked={postural.headHyperextended} label="فرط البسط" />
            <Chk checked={postural.headFwdFlexed}     label="تقدم للأمام" />
            <LRChk left={postural.headLaterallyFlexedL} right={postural.headLaterallyFlexedR} label="عطف جانبي" />
            <LRChk left={postural.headRotatedL}         right={postural.headRotatedR}         label="دوران" />
          </PostSec>

          <PostSec title="الأكتاف">
            <Chk  checked={postural.shouldersLevel}     label="مستوية" />
            <LRChk left={postural.shouldersElevatedL}   right={postural.shouldersElevatedR}   label="مرتفعة" />
            <LRChk left={postural.shouldersSublaxedL}   right={postural.shouldersSublaxedR}   label="متصلبة" />
          </PostSec>

          <PostSec title="المرفق">
            <Chk checked={postural.elbowHyperextended} label="فرط البسط" />
            <Chk checked={postural.elbowFlexed}        label="عطف" />
          </PostSec>

          <PostSec title="القفص الصدري">
            <Chk  checked={postural.ribCageNeutral}    label="حيادي" />
            <LRChk left={postural.ribCageElevatedL}    right={postural.ribCageElevatedR}      label="مرتفع" />
          </PostSec>

          <PostSec title="العمود الفقري">
            <Chk checked={postural.spineNeutral}         label="حيادي" />
            <Chk checked={postural.spineKyphosis}        label="كيفوز" />
            <Chk checked={postural.spineFlatLumbar}      label="قعس مسطح" />
            <Chk checked={postural.spineNormalLumbar}    label="قعس طبيعي" />
            <Chk checked={postural.spineHyperLordotic}   label="قعس زائد" />
            <LRChk left={postural.spineScoliosisApexL}   right={postural.spineScoliosisApexR} label="جنف قمة" />
          </PostSec>

          <PostSec title="الحوض">
            <Chk  checked={postural.pelvisNeutral}       label="حيادي" />
            <Chk  checked={postural.pelvisAnteriorTilt}  label="ميل أمامي" />
            <Chk  checked={postural.pelvisPosteriorTilt} label="ميل خلفي" />
            <LRChk left={postural.pelvisObliqueL}        right={postural.pelvisObliqueR}      label="مائل" />
            {postural.pelvisOther && <F label="أخرى" value={postural.pelvisOther} />}
          </PostSec>

          <PostSec title="الوركين">
            <LRChk left={postural.hipsAbductedL}  right={postural.hipsAbductedR}  label="مبعد" />
            <LRChk left={postural.hipsAdductedL}  right={postural.hipsAdductedR}  label="مقرب" />
            <LRChk left={postural.hipsFlexedL}    right={postural.hipsFlexedR}    label="عطف" />
          </PostSec>

          <PostSec title="الركبتين">
            <LRChk left={postural.kneesFlexedBeyond90L}    right={postural.kneesFlexedBeyond90R}    label="عطف > 90" />
            <LRChk left={postural.kneesExtendedBeyond90L}  right={postural.kneesExtendedBeyond90R}  label="بسط > 90" />
          </PostSec>

          <PostSec title="القدمان">
            <LRChk left={postural.feetPronateEvertL}   right={postural.feetPronateEvertR}   label="انبساط خارجي" />
            <LRChk left={postural.feetSupinateInvL}    right={postural.feetSupinateInvR}    label="تقوس داخلي" />
            <LRChk left={postural.feetDorsiflexedL}    right={postural.feetDorsiflexedR}    label="دورسيفلكس" />
            <LRChk left={postural.feetPlantarflexedL}  right={postural.feetPlantarflexedR}  label="بلانتارفلكس" />
            {postural.feetOther && <F label="أخرى" value={postural.feetOther} />}
          </PostSec>
        </View>

        <F label="التشنج/ ردود الفعل / التوتر العضلي" value={postural.spasticityNotes} />
        <F label="تعليقات"  value={postural.generalNotes} />
        <F label="تشخيص"   value={postural.diagnosis} />

        {/* ── 7. خطة العلاج ── */}
        <SecHead label="خطة العلاج" break />
        {/* Header row */}
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="من تاريخ"                         value={data.planHeader.treatmentFrom} />
            <F label="إلى تاريخ"                        value={data.planHeader.treatmentTo} />
            <F label="عدد الزيارات"                     value={data.planHeader.anticipatedVisits} />
          </View>
          <View style={S.col}>
            <F label="اسم أخصائي العلاج الفيزيائي"     value={data.planHeader.physiotherapistName} />
            <F label="مدير الحالة"                      value={data.planHeader.caseManagerName} />
          </View>
        </View>
        {/* Modalities — 2-col checkbox grid, ALL options */}
        <SubHead label="خطة علاج المريض" />
        <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            {PLAN_PDF_PAIRS.map(([right]) => (
              <Chk key={right} checked={data.planModalities.includes(right)} label={THERAPY_MODALITY_LABELS[right] ?? right} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {PLAN_PDF_PAIRS.map(([, left]) => left ? (
              <Chk key={left} checked={data.planModalities.includes(left)} label={THERAPY_MODALITY_LABELS[left] ?? left} />
            ) : <View key="_gap" style={{ marginBottom: 3, height: 12 }} />)}
          </View>
        </View>
        {data.planOtherModality && <F label="أخرى / Other" value={data.planOtherModality} />}
        <F label="الملاحظات" value={data.planObservation} />
        <F label="الملخص"    value={data.planRemarks} />

        {/* ── 8. الملاحظات والتقييم ── */}
        <SecHead label="الملاحظات والتقييم" break />
        <F label="التشخيص" value={data.postural.diagnosis} />
        <SubHead label="العلاج المطبق" />
        <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            {EVAL_PDF_PAIRS.map(([right]) => (
              <Chk key={right} checked={data.evalModalities.includes(right)} label={EVALUATION_MODALITY_LABELS[right] ?? right} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {EVAL_PDF_PAIRS.map(([, left]) => left ? (
              <Chk key={left} checked={data.evalModalities.includes(left)} label={EVALUATION_MODALITY_LABELS[left] ?? left} />
            ) : <View key="_gap" style={{ marginBottom: 3, height: 12 }} />)}
          </View>
        </View>
        {data.evalOtherModality && <F label="أخرى / Other" value={data.evalOtherModality} />}

        {/* ── 9. الجلسات العلاجية ── */}
        <SecHead label="الجلسات العلاجية" break />
        {sessions.length === 0 ? (
          <Text style={S.note}>{ar("لا توجد جلسات مسجلة")}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 0.4 }]}>#</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("التاريخ")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("الوقت")}</Text>
              <Text style={[S.tableCellHead, { flex: 2 }]}>{ar("ملاحظات")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.5 }]}>{ar("رأي رئيس القسم")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.5 }]}>{ar("قرار الطبيب")}</Text>
            </View>
            {[...sessions]
              .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
              .map((s, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                  <Text style={[S.tableCell, { flex: 0.4 }]}>{s.sessionNumber}</Text>
                  <Text style={[S.tableCell, { flex: 0.9 }]}>
                    {new Date(s.sessionDate).toLocaleDateString("en-GB")}
                  </Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>{s.sessionTime ?? "—"}</Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>{ar(s.notes ?? "") || "—"}</Text>
                  <Text style={[S.tableCell, { flex: 1.5 }]}>{ar((s as any).supervisorOpinion ?? "") || "—"}</Text>
                  <Text style={[S.tableCell, { flex: 1.5 }]}>{ar((s as any).doctorDecision ?? "") || "—"}</Text>
                </View>
              ))}
          </View>
        )}
        {data.finalSummary && (
          <>
            <SecHead label="الملخص النهائي" />
            <Text style={S.fieldValue}>{ar(data.finalSummary)}</Text>
          </>
        )}

        {/* ── 10. رأي رئيس القسم ورأي الطبيب ── */}
        <SecHead label="رأي رئيس القسم" break />
        <Text style={S.fieldValue}>{ar(data.supervisorGaze ?? "") || "—"}</Text>
        <SecHead label="رأي الطبيب" />
        <Text style={S.fieldValue}>{ar(data.doctorGaze ?? "") || "—"}</Text>

        {/* ── توقيعات ── */}
        <View style={{ marginTop: 30, flexDirection: "row-reverse", justifyContent: "space-around" }}>
          {["توقيع المعالج الفيزيائي", "توقيع المريض", "توقيع رئيس القسم"].map((label, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 100, borderBottomWidth: 0.5, borderBottomColor: TEXT }} />
              <Text style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}>{ar(label)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

// ── Public export ─────────────────────────────────────────────────────────────

let fontsRegistered = false;

export async function downloadPhysioCasePdf(data: PhysioCasePdfData): Promise<void> {
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
  const blob = await pdf(<PhysioPdfDoc data={data} origin={origin} />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `physio-${data.patient.patientNumber}-${data.caseId.slice(-8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
