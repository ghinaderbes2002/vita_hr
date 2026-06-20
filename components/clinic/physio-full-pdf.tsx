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
    marginBottom: 4,
    flexWrap: "nowrap",
  },
  fieldLabel: { fontSize: 8.5, color: MUTED, width: 120, flexShrink: 0 },
  fieldValue: { fontSize: 9.5, color: TEXT, flex: 1 },
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
  planHeader: { treatmentFrom: string; treatmentTo: string; anticipatedVisits: string };
  planRemarks: string;
  planObservation: string;
  evalModalities: EvaluationModality[];
  evalOtherModality: string;
  evalNotes: string;
  evalText: string;
  sessions: PhysioSession[];
  supervisorGaze: string;
  finalSummary: string;
}

// ── Helper components ──────────────────────────────────────────────────────────

// ── Arabic pre-shaper ─────────────────────────────────────────────────────────
// react-pdf's Arabic shaping is unreliable; we pre-shape to Presentation Forms.
const _AF: Record<number, readonly [string,string,string,string]> = {
  0x0626:['ﺉ','ﺊ','ﺋ','ﺌ'],
  0x0627:['ﺍ','ﺎ','',''],
  0x0628:['ﺏ','ﺐ','ﺑ','ﺒ'],
  0x0629:['ﺓ','ﺔ','',''],
  0x062A:['ﺕ','ﺖ','ﺗ','ﺘ'],
  0x062B:['ﺙ','ﺚ','ﺛ','ﺜ'],
  0x062C:['ﺝ','ﺞ','ﺟ','ﺠ'],
  0x062D:['ﺡ','ﺢ','ﺣ','ﺤ'],
  0x062E:['ﺥ','ﺦ','ﺧ','ﺨ'],
  0x062F:['ﺩ','ﺪ','',''],
  0x0630:['ﺫ','ﺬ','',''],
  0x0631:['ﺭ','ﺮ','',''],
  0x0632:['ﺯ','ﺰ','',''],
  0x0633:['ﺱ','ﺲ','ﺳ','ﺴ'],
  0x0634:['ﺵ','ﺶ','ﺷ','ﺸ'],
  0x0635:['ﺹ','ﺺ','ﺻ','ﺼ'],
  0x0636:['ﺽ','ﺾ','ﺿ','ﻀ'],
  0x0637:['ﻁ','ﻂ','ﻃ','ﻄ'],
  0x0638:['ﻅ','ﻆ','ﻇ','ﻈ'],
  0x0639:['ﻉ','ﻊ','ﻋ','ﻌ'],
  0x063A:['ﻍ','ﻎ','ﻏ','ﻐ'],
  0x0641:['ﻑ','ﻒ','ﻓ','ﻔ'],
  0x0642:['ﻕ','ﻖ','ﻗ','ﻘ'],
  0x0643:['ﻙ','ﻚ','ﻛ','ﻜ'],
  0x0644:['ﻝ','ﻞ','ﻟ','ﻠ'],
  0x0645:['ﻡ','ﻢ','ﻣ','ﻤ'],
  0x0646:['ﻥ','ﻦ','ﻧ','ﻨ'],
  0x0647:['ﻩ','ﻪ','ﻫ','ﻬ'],
  0x0648:['ﻭ','ﻮ','',''],
  0x0649:['ﻯ','ﻰ','',''],
  0x064A:['ﻱ','ﻲ','ﻳ','ﻴ'],
};
// Non-joining: connect to right only (ا و ر ز د ذ ة ى ...)
const _ANJ = new Set([0x0621,0x0622,0x0623,0x0624,0x0625,0x0627,0x0629,0x062F,0x0630,0x0631,0x0632,0x0648,0x0649]);
// Mandatory lam-alef ligatures
const _ALA: Record<number,[string,string]> = {
  0x0622:['ﻵ','ﻶ'],
  0x0623:['ﻷ','ﻸ'],
  0x0625:['ﻹ','ﻺ'],
  0x0627:['ﻻ','ﻼ'],
};

function ar(s: string): string {
  if (!s || !/[؀-ۿ]/.test(s)) return s;
  const cs = [...s];
  const res: string[] = [];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i].codePointAt(0) ?? 0;
    const f = _AF[c];
    if (!f) { res.push(cs[i]); continue; }
    const p = i > 0 ? (cs[i-1].codePointAt(0) ?? 0) : 0;
    const n = i+1 < cs.length ? (cs[i+1].codePointAt(0) ?? 0) : 0;
    // Lam-Alef mandatory ligature
    if (c === 0x0644 && _ALA[n]) {
      const pj = !!(p && _AF[p] && !_ANJ.has(p));
      res.push(_ALA[n][pj ? 1 : 0]);
      i++; continue;
    }
    const pj = !!(p && _AF[p] && !_ANJ.has(p));
    const nj = !_ANJ.has(c) && !!(n && _AF[n]);
    res.push(f[pj&&nj?3:pj?1:nj?2:0] || cs[i]);
  }
  return res.join('');
}

const SecHead = ({ label, break: brk }: { label: string; break?: boolean }) => (
  <View style={S.sectionHeader} break={brk}>
    <Text style={S.sectionHeaderText}>{ar(label)}</Text>
  </View>
);

const SubHead = ({ label }: { label: string }) => (
  <View style={S.subHeader}>
    <Text style={S.subHeaderText}>{ar(label)}</Text>
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
        {value ? "✓ نعم" : "✗ لا"}
      </Text>
    </View>
  );
};

// Card-style field: label small above, value bold below
const FC = ({ label, value }: { label: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={{ marginBottom: 6 }} wrap={false}>
      <Text style={{ fontSize: 7.5, color: MUTED, marginBottom: 2 }}>{ar(label)}</Text>
      <Text style={{ fontSize: 10, color: TEXT, fontWeight: "bold" }}>{ar(v) || "—"}</Text>
    </View>
  );
};

const Chips = ({ items }: { items: string[] }) => {
  if (!items.length) return null;
  return (
    <View style={S.chipsWrap}>
      {items.map((item, i) => (
        <Text key={i} style={S.chip}>{ar(item)}</Text>
      ))}
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

const BodyMapPdf = ({ regions, origin }: { regions: PainRegion[]; origin: string }) => {
  const uniqueTypes = [...new Set(regions.map((r) => r.painType ?? "OTHER"))];
  return (
    <View style={{ alignItems: "center", marginTop: 6 }} wrap={false}>
      {/* صورة الجسم مع النقاط */}
      <View style={{ position: "relative", width: BODY_W, height: BODY_H }}>
        <Image
          src={`${origin}/human.svg`}
          style={{ width: BODY_W, height: BODY_H, position: "absolute", top: 0, left: 0 }}
        />
        {regions.map((r, i) => {
          const color = PAIN_COLORS[r.painType ?? "OTHER"] ?? "#ef4444";
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
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PAIN_COLORS[type] ?? "#999" }} />
              <Text style={{ fontSize: 7.5, color: MUTED }}>{PAIN_LABELS_AR[type] ?? type}</Text>
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
      <Text style={S.pageFooterText}>سوريا - حلب - حي حلب الجديدة شمالي</Text>
      <Text style={S.pageFooterText}>خلف فيلا العقاد - شارع إيكاردا</Text>
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

// ── Postural findings ─────────────────────────────────────────────────────────

function collectPosturalFindings(p: PhysioCasePdfData["postural"]): string[] {
  const items: string[] = [];
  const add = (cond: boolean, label: string) => { if (cond) items.push(label); };
  add(p.headNeutral,          "الرأس محايد");
  add(p.headHyperextended,    "الرأس بسط مفرط");
  add(p.headFwdFlexed,        "الرأس مثني للأمام");
  add(p.headLaterallyFlexedL, "الرأس جانبي يسار");
  add(p.headLaterallyFlexedR, "الرأس جانبي يمين");
  add(p.headRotatedL,         "الرأس دوران يسار");
  add(p.headRotatedR,         "الرأس دوران يمين");
  add(p.shouldersLevel,       "الكتفان مستويان");
  add(p.shouldersElevatedL,   "كتف مرتفع يسار");
  add(p.shouldersElevatedR,   "كتف مرتفع يمين");
  add(p.shouldersSublaxedL,   "كتف تحت خلع يسار");
  add(p.shouldersSublaxedR,   "كتف تحت خلع يمين");
  add(p.elbowHyperextended,   "كوع بسط مفرط");
  add(p.elbowFlexed,          "كوع ثني");
  add(p.ribCageNeutral,       "القفص الصدري محايد");
  add(p.ribCageElevatedL,     "قفص صدري مرتفع يسار");
  add(p.ribCageElevatedR,     "قفص صدري مرتفع يمين");
  add(p.spineNeutral,         "العمود الفقري محايد");
  add(p.spineKyphosis,        "حداب (Kyphosis)");
  add(p.spineFlatLumbar,      "قطني مسطح");
  add(p.spineNormalLumbar,    "قطني طبيعي");
  add(p.spineHyperLordotic,   "قطني هايبر لوردوتيك");
  add(p.spineScoliosisApexL,  "جنف قمة يسار");
  add(p.spineScoliosisApexR,  "جنف قمة يمين");
  add(p.pelvisNeutral,        "الحوض محايد");
  add(p.pelvisAnteriorTilt,   "الحوض ميل أمامي");
  add(p.pelvisPosteriorTilt,  "الحوض ميل خلفي");
  add(p.pelvisObliqueL,       "الحوض مائل يسار");
  add(p.pelvisObliqueR,       "الحوض مائل يمين");
  add(p.hipsFlexedL,          "الورك ثني يسار");
  add(p.hipsFlexedR,          "الورك ثني يمين");
  add(p.hipsAbductedL,        "الورك بعد يسار");
  add(p.hipsAbductedR,        "الورك بعد يمين");
  add(p.hipsAdductedL,        "الورك تقريب يسار");
  add(p.hipsAdductedR,        "الورك تقريب يمين");
  add(p.kneesFlexedBeyond90L, "الركبة ثني > 90 يسار");
  add(p.kneesFlexedBeyond90R, "الركبة ثني > 90 يمين");
  add(p.kneesExtendedBeyond90L, "الركبة بسط > 90 يسار");
  add(p.kneesExtendedBeyond90R, "الركبة بسط > 90 يمين");
  add(p.feetPronateEvertL,    "القدم انقلاب خارجي يسار");
  add(p.feetPronateEvertR,    "القدم انقلاب خارجي يمين");
  add(p.feetSupinateInvL,     "القدم انقلاب داخلي يسار");
  add(p.feetSupinateInvR,     "القدم انقلاب داخلي يمين");
  add(p.feetDorsiflexedL,     "ظهر القدم يسار");
  add(p.feetDorsiflexedR,     "ظهر القدم يمين");
  add(p.feetPlantarflexedL,   "باطن القدم يسار");
  add(p.feetPlantarflexedR,   "باطن القدم يمين");
  return items;
}

// ── PDF Document ──────────────────────────────────────────────────────────────

const PhysioPdfDoc = ({ data, origin }: { data: PhysioCasePdfData; origin: string }) => {
  const { patient, complaint, history, postural, sessions, goals, goalsExtra,
    chronicConditions, testsHad, surgeries, painRegions, painTypes,
    aggravatingFactors, alleviatingFactors } = data;

  const generatedAt = new Date().toLocaleDateString("ar-SA");
  const posturalFindings = collectPosturalFindings(postural);

  const allGoalChips = [
    ...goals.map((g) => PHYSIO_GOAL_LABELS[g] ?? g),
    ...([
      goalsExtra.decreasePain      && "تخفيف الألم",
      goalsExtra.improveStrength   && "تحسين القوة العضلية",
      goalsExtra.lessDifficultyWork && "سهولة العمل",
      goalsExtra.improveMovement   && "تحسين الحركة",
    ].filter(Boolean) as string[]),
  ];

  const allPainTypes = [...painTypes, ...(data.painTypeOther ? [data.painTypeOther] : [])];
  const allAgg       = [...aggravatingFactors, ...(data.aggravatingOther ? [data.aggravatingOther] : [])];
  const allAlv       = [...alleviatingFactors, ...(data.alleviatingOther ? [data.alleviatingOther] : [])];

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
            { label: "التاريخ",            value: new Date(data.caseCreatedAt).toLocaleDateString("ar-SA") },
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
        <SecHead label="الشكوى الرئيسية" />
        <F label="ماهي شكواك الرئيسية؟"                       value={complaint.majorComplaint} />
        <F label="ماهي الأعراض التي تعاني منها؟"               value={complaint.symptoms} />
        <F label="السبب المحتمل"                               value={complaint.possibleCause} />
        <F label="تاريخ البدء"                                 value={complaint.complaintStartDate} />
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
        <BodyMapPdf regions={painRegions} origin={origin} />
        {allPainTypes.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>أنواع الألم:</Text>
            <Chips items={allPainTypes} />
          </View>
        )}
        {allAgg.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العوامل المُفاقِمة:</Text>
            <Chips items={allAgg} />
          </View>
        )}
        {allAlv.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العوامل المُخففة:</Text>
            <Chips items={allAlv} />
          </View>
        )}

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

        <SubHead label="العلاج الطبيعي والعلاجات الأخرى" />
        <Bool label="هل خضعت للعلاج الطبيعي لنفس المشكلة؟" value={history.hadPTSameProblem} />
        {history.hadPTSameProblem && <F label="التفاصيل" value={history.ptSameProblemDetail} />}
        <Bool label="هل تتلقى علاجات أخرى لهذه المشكلة في هذا الوقت؟" value={history.receivingOtherTreatment} />
        {history.receivingOtherTreatment && <F label="التفاصيل" value={history.otherTreatmentDetail} />}

        <SubHead label="الفحوصات والتحاليل" />
        <View style={{ marginBottom: 4 }}>
          <Text style={[S.fieldLabel, { marginBottom: 3 }]}>ما هو نوع التصوير الشعاعي الذي قمت به؟</Text>
          {testsHad.length > 0
            ? <Chips items={testsHad.map((t) => (EVALUATION_MODALITY_LABELS as any)[t] ?? t)} />
            : <Text style={S.fieldValue}>—</Text>}
          {history.testsOther && <F label="أخرى" value={history.testsOther} />}
        </View>
        <F label="نتائج / Results" value={history.testResults} />
        <Text style={[S.fieldLabel, { marginBottom: 3, marginTop: 4 }]}>ماهي التحاليلات التي تم اجراؤها؟</Text>
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
        {chronicConditions.length > 0
          ? <Chips items={chronicConditions.map((c) => CHRONIC_CONDITION_LABELS[c] ?? c)} />
          : <Text style={S.fieldValue}>—</Text>}
        {history.chronicConditionsOther && <F label="أخرى" value={history.chronicConditionsOther} />}

        {/* ── 5. أهداف العلاج ── */}
        <SecHead label="أهداف العلاج" />
        {allGoalChips.length > 0 && (
          <>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>الأهداف:</Text>
            <Chips items={allGoalChips} />
          </>
        )}
        <View style={S.twoCol}>
          <View style={S.col}>
            {goalsExtra.standLonger && <F label="وقوف أطول" value={`${goalsExtra.standLonger} ساعات/دقائق`} />}
            {goalsExtra.sleepLonger && <F label="نوم أطول"  value={`${goalsExtra.sleepLonger} ساعات/دقائق`} />}
            {goalsExtra.sitLonger   && <F label="جلوس أطول" value={`${goalsExtra.sitLonger} ساعات/دقائق`} />}
          </View>
          <View style={S.col}>
            {goalsExtra.customGoal && <F label="هدف مخصص"   value={goalsExtra.customGoal} />}
            {goalsExtra.otherGoals && <F label="أهداف أخرى" value={goalsExtra.otherGoals} />}
          </View>
        </View>

        {/* ── 6. التقييم الوضعي ── */}
        <SecHead label="التقييم الوضعي" />
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="الوضع الجلوسي"   value={postural.seatedPosition} />
            <F label="التحكم بالجذع"   value={postural.trunkControl} />
          </View>
          <View style={S.col}>
            <F label="التشخيص"         value={postural.diagnosis} />
          </View>
        </View>
        {posturalFindings.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>النتائج الإيجابية:</Text>
            <Chips items={posturalFindings} />
          </View>
        )}
        {postural.pelvisOther    && <F label="ملاحظات الحوض"    value={postural.pelvisOther} />}
        {postural.feetOther      && <F label="ملاحظات القدم"     value={postural.feetOther} />}
        <F label="ملاحظات التشنج"   value={postural.spasticityNotes} />
        <F label="ملاحظات عامة"     value={postural.generalNotes} />

        {/* ── 7. خطة العلاج ── */}
        <SecHead label="خطة العلاج" />
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="من تاريخ"       value={data.planHeader.treatmentFrom} />
            <F label="إلى تاريخ"      value={data.planHeader.treatmentTo} />
            <F label="عدد الزيارات"   value={data.planHeader.anticipatedVisits} />
          </View>
          <View style={S.col}>
            <F label="الملاحظة"       value={data.planObservation} />
            <F label="ملاحظات"        value={data.planRemarks} />
          </View>
        </View>
        {data.planModalities.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العلاجات المقترحة:</Text>
            <Chips items={data.planModalities.map((m) => THERAPY_MODALITY_LABELS[m] ?? m)} />
            {data.planOtherModality && <F label="علاجات أخرى" value={data.planOtherModality} />}
          </View>
        )}

        {/* ── 8. الملاحظات والتقييم ── */}
        <SecHead label="الملاحظات والتقييم" />
        {data.evalModalities.length > 0 && (
          <View style={{ marginBottom: 5 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العلاجات المطبقة:</Text>
            <Chips items={data.evalModalities.map((m) => EVALUATION_MODALITY_LABELS[m] ?? m)} />
            {data.evalOtherModality && <F label="أخرى" value={data.evalOtherModality} />}
          </View>
        )}
        <F label="الملاحظات" value={data.evalNotes} />
        <F label="التقييم"   value={data.evalText} />

        {/* ── 9. الجلسات العلاجية ── */}
        <SecHead label="الجلسات العلاجية" />
        {sessions.length === 0 ? (
          <Text style={S.note}>لا توجد جلسات مسجلة</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow}>
              <Text style={[S.tableCellHead, { flex: 0.4 }]}>#</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>التاريخ</Text>
              <Text style={[S.tableCellHead, { flex: 0.7 }]}>الوقت</Text>
              <Text style={[S.tableCellHead, { flex: 2 }]}>ملاحظات</Text>
              <Text style={[S.tableCellHead, { flex: 1.5 }]}>رأي رئيس القسم</Text>
              <Text style={[S.tableCellHead, { flex: 1.5 }]}>قرار الطبيب</Text>
            </View>
            {[...sessions]
              .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
              .map((s, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                  <Text style={[S.tableCell, { flex: 0.4 }]}>{s.sessionNumber}</Text>
                  <Text style={[S.tableCell, { flex: 0.9 }]}>
                    {new Date(s.sessionDate).toLocaleDateString("ar-SA")}
                  </Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>{s.sessionTime ?? "—"}</Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>{s.notes ?? "—"}</Text>
                  <Text style={[S.tableCell, { flex: 1.5 }]}>{(s as any).supervisorOpinion ?? "—"}</Text>
                  <Text style={[S.tableCell, { flex: 1.5 }]}>{(s as any).doctorDecision ?? "—"}</Text>
                </View>
              ))}
          </View>
        )}

        {/* ── 10. رأي رئيس القسم ── */}
        {data.supervisorGaze && (
          <>
            <SecHead label="رأي رئيس القسم" />
            <Text style={S.fieldValue}>{data.supervisorGaze}</Text>
          </>
        )}

        {/* ── 11. الملخص النهائي ── */}
        {data.finalSummary && (
          <>
            <SecHead label="الملخص النهائي" />
            <Text style={S.fieldValue}>{data.finalSummary}</Text>
          </>
        )}

        {/* ── توقيعات ── */}
        <View style={{ marginTop: 30, flexDirection: "row-reverse", justifyContent: "space-around" }}>
          {["توقيع المعالج الفيزيائي", "توقيع المريض", "توقيع رئيس القسم"].map((label, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 100, borderBottomWidth: 0.5, borderBottomColor: TEXT }} />
              <Text style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}>{label}</Text>
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
