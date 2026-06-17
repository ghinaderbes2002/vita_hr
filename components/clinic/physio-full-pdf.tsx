// Client-only — imported via dynamic import() to avoid SSR issues
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
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

// Font.register is called lazily inside downloadPhysioCasePdf to use window.location.origin

// ── Theme ──────────────────────────────────────────────────────────────────────
const BRAND = "#6B2D5E";
const BRAND_LIGHT = "#f3e8f0";
const TEXT = "#111827";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 10,
    color: TEXT,
    paddingTop: 62,
    paddingBottom: 44,
    paddingHorizontal: 22,
    direction: "rtl",
    textAlign: "right",
    backgroundColor: "#ffffff",
  },
  // Fixed header per page
  pageHeader: {
    position: "absolute",
    top: 12,
    left: 22,
    right: 22,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 5,
  },
  pageHeaderTitle: { fontSize: 11, fontWeight: "bold", color: BRAND },
  pageHeaderSub: { fontSize: 8, color: MUTED, marginTop: 1 },
  pageHeaderRight: { alignItems: "flex-end" },
  pageHeaderLeft: { alignItems: "flex-start" },
  // Fixed footer per page
  pageFooter: {
    position: "absolute",
    bottom: 12,
    left: 22,
    right: 22,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  pageFooterText: { fontSize: 7.5, color: MUTED },
  // Section header (colored bar)
  sectionHeader: {
    backgroundColor: BRAND,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 7,
    marginTop: 14,
    borderRadius: 3,
  },
  sectionHeaderText: { color: "#ffffff", fontWeight: "bold", fontSize: 10.5 },
  // Sub-section header (light bar)
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
  // Field row
  fieldRow: {
    flexDirection: "row-reverse",
    marginBottom: 4,
    gap: 6,
  },
  fieldLabel: { fontSize: 8.5, color: MUTED, flex: 1.2 },
  fieldValue: { fontSize: 9.5, color: TEXT, flex: 2.8 },
  // Yes/No
  yes: { color: "#16a34a" },
  no: { color: "#9ca3af" },
  // Chips row
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
  // Table
  table: { marginTop: 5, marginBottom: 5 },
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
  tableRowAlt: { backgroundColor: "#faf5f9" },
  tableCellHead: {
    flex: 1,
    fontSize: 8.5,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "right",
  },
  tableCell: { flex: 1, fontSize: 8.5, color: TEXT, textAlign: "right" },
  // Divider
  divider: { borderBottomWidth: 0.5, borderBottomColor: BORDER, marginVertical: 4 },
  // Two-column grid
  twoCol: { flexDirection: "row-reverse", gap: 12 },
  col: { flex: 1 },
  // Small note
  note: { fontSize: 8, color: MUTED, fontStyle: "italic", marginTop: 2 },
});

// ── Data type ──────────────────────────────────────────────────────────────────

export interface PhysioCasePdfData {
  patient: { firstName: string; lastName: string; patientNumber: string; gender?: string };
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
    doctorRestrictions: string; hadPTSameProblem: boolean; ptSameProblemDetail: string;
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

const SecHead = ({ ar, en }: { ar: string; en: string }) => (
  <View style={S.sectionHeader}>
    <Text style={S.sectionHeaderText}>{ar}  /  {en}</Text>
  </View>
);

const SubHead = ({ label }: { label: string }) => (
  <View style={S.subHeader}>
    <Text style={S.subHeaderText}>{label}</Text>
  </View>
);

const F = ({ label, value }: { label: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value);
  if (!v.trim()) return null;
  return (
    <View style={S.fieldRow}>
      <Text style={S.fieldLabel}>{label}:</Text>
      <Text style={S.fieldValue}>{v}</Text>
    </View>
  );
};

const Bool = ({ label, value, showNo = true }: { label: string; value: boolean; showNo?: boolean }) => {
  if (!value && !showNo) return null;
  return (
    <View style={S.fieldRow}>
      <Text style={S.fieldLabel}>{label}:</Text>
      <Text style={[S.fieldValue, value ? S.yes : S.no]}>
        {value ? "✓ نعم / Yes" : "✗ لا / No"}
      </Text>
    </View>
  );
};

const Chips = ({ items }: { items: string[] }) => {
  if (!items.length) return null;
  return (
    <View style={S.chipsWrap}>
      {items.map((item, i) => (
        <Text key={i} style={S.chip}>{item}</Text>
      ))}
    </View>
  );
};

// ── Page header & footer (fixed, rendered on every page) ──────────────────────

const PH = ({ patient, caseId, generatedAt }: {
  patient: PhysioCasePdfData["patient"];
  caseId: string;
  generatedAt: string;
}) => (
  <View style={S.pageHeader} fixed>
    <View style={S.pageHeaderRight}>
      <Text style={S.pageHeaderTitle}>حالة علاج فيزيائي  /  Physical Therapy Case</Text>
      <Text style={S.pageHeaderSub}>رقم الملف: #{caseId.slice(-8).toUpperCase()}</Text>
    </View>
    <View style={S.pageHeaderLeft}>
      <Text style={{ fontSize: 10, fontWeight: "bold", color: TEXT, textAlign: "left" }}>
        {patient.firstName} {patient.lastName}
      </Text>
      <Text style={[S.pageHeaderSub, { textAlign: "left" }]}>
        {patient.patientNumber}  |  {generatedAt}
      </Text>
    </View>
  </View>
);

const PF = ({ patient }: { patient: PhysioCasePdfData["patient"] }) => (
  <View style={S.pageFooter} fixed>
    <Text style={S.pageFooterText}>{patient.firstName} {patient.lastName} — {patient.patientNumber}</Text>
    <Text
      style={[S.pageFooterText, { textAlign: "left" }]}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  </View>
);

// ── Postural helper: collect TRUE items ───────────────────────────────────────

function collectPosturalFindings(p: PhysioCasePdfData["postural"]): string[] {
  const items: string[] = [];
  const add = (cond: boolean, ar: string, en: string) => {
    if (cond) items.push(`${ar} / ${en}`);
  };
  add(p.headNeutral, "الرأس محايد", "Head Neutral");
  add(p.headHyperextended, "الرأس بسط مفرط", "Head Hyperextended");
  add(p.headFwdFlexed, "الرأس مثني للأمام", "Head Fwd Flexed");
  add(p.headLaterallyFlexedL, "الرأس جانبي يسار", "Head Lat Flexed L");
  add(p.headLaterallyFlexedR, "الرأس جانبي يمين", "Head Lat Flexed R");
  add(p.headRotatedL, "الرأس دوران يسار", "Head Rotated L");
  add(p.headRotatedR, "الرأس دوران يمين", "Head Rotated R");
  add(p.shouldersLevel, "الكتفان مستويان", "Shoulders Level");
  add(p.shouldersElevatedL, "كتف مرتفع يسار", "Shoulder Elevated L");
  add(p.shouldersElevatedR, "كتف مرتفع يمين", "Shoulder Elevated R");
  add(p.shouldersSublaxedL, "كتف تحت خلع يسار", "Shoulder Sublaxed L");
  add(p.shouldersSublaxedR, "كتف تحت خلع يمين", "Shoulder Sublaxed R");
  add(p.elbowHyperextended, "كوع بسط مفرط", "Elbow Hyperextended");
  add(p.elbowFlexed, "كوع ثني", "Elbow Flexed");
  add(p.ribCageNeutral, "القفص الصدري محايد", "Rib Cage Neutral");
  add(p.ribCageElevatedL, "قفص صدري مرتفع يسار", "Rib Cage Elevated L");
  add(p.ribCageElevatedR, "قفص صدري مرتفع يمين", "Rib Cage Elevated R");
  add(p.spineNeutral, "العمود الفقري محايد", "Spine Neutral");
  add(p.spineKyphosis, "حداب / Kyphosis", "Kyphosis");
  add(p.spineFlatLumbar, "قطني مسطح", "Flat Lumbar");
  add(p.spineNormalLumbar, "قطني طبيعي", "Normal Lumbar");
  add(p.spineHyperLordotic, "قطني هايبر لوردوتيك", "Hyper Lordotic");
  add(p.spineScoliosisApexL, "جنف قمة يسار", "Scoliosis Apex L");
  add(p.spineScoliosisApexR, "جنف قمة يمين", "Scoliosis Apex R");
  add(p.pelvisNeutral, "الحوض محايد", "Pelvis Neutral");
  add(p.pelvisAnteriorTilt, "الحوض ميل أمامي", "Pelvis Anterior Tilt");
  add(p.pelvisPosteriorTilt, "الحوض ميل خلفي", "Pelvis Posterior Tilt");
  add(p.pelvisObliqueL, "الحوض مائل يسار", "Pelvis Oblique L");
  add(p.pelvisObliqueR, "الحوض مائل يمين", "Pelvis Oblique R");
  add(p.hipsFlexedL, "الورك ثني يسار", "Hip Flexed L");
  add(p.hipsFlexedR, "الورك ثني يمين", "Hip Flexed R");
  add(p.hipsAbductedL, "الورك بعد يسار", "Hip Abducted L");
  add(p.hipsAbductedR, "الورك بعد يمين", "Hip Abducted R");
  add(p.hipsAdductedL, "الورك تقريب يسار", "Hip Adducted L");
  add(p.hipsAdductedR, "الورك تقريب يمين", "Hip Adducted R");
  add(p.kneesFlexedBeyond90L, "الركبة ثني > 90 يسار", "Knee Flexed >90 L");
  add(p.kneesFlexedBeyond90R, "الركبة ثني > 90 يمين", "Knee Flexed >90 R");
  add(p.kneesExtendedBeyond90L, "الركبة بسط > 90 يسار", "Knee Extended >90 L");
  add(p.kneesExtendedBeyond90R, "الركبة بسط > 90 يمين", "Knee Extended >90 R");
  add(p.feetPronateEvertL, "القدم انقلاب خارجي يسار", "Foot Pronate/Evert L");
  add(p.feetPronateEvertR, "القدم انقلاب خارجي يمين", "Foot Pronate/Evert R");
  add(p.feetSupinateInvL, "القدم انقلاب داخلي يسار", "Foot Supinate/Inv L");
  add(p.feetSupinateInvR, "القدم انقلاب داخلي يمين", "Foot Supinate/Inv R");
  add(p.feetDorsiflexedL, "ظهر القدم يسار", "Foot Dorsiflexed L");
  add(p.feetDorsiflexedR, "ظهر القدم يمين", "Foot Dorsiflexed R");
  add(p.feetPlantarflexedL, "باطن القدم يسار", "Foot Plantarflexed L");
  add(p.feetPlantarflexedR, "باطن القدم يمين", "Foot Plantarflexed R");
  return items;
}

// ── PDF Document ──────────────────────────────────────────────────────────────

const PhysioPdfDoc = ({ data }: { data: PhysioCasePdfData }) => {
  const { patient, complaint, history, postural, sessions, goals, goalsExtra,
    chronicConditions, testsHad, surgeries, painRegions, painTypes,
    aggravatingFactors, alleviatingFactors } = data;

  const generatedAt = new Date().toLocaleDateString("en-GB");
  const posturalFindings = collectPosturalFindings(postural);

  const allGoalChips = [
    ...goals.map((g) => PHYSIO_GOAL_LABELS[g] ?? g),
    ...([
      goalsExtra.decreasePain && "تخفيف الألم / Decrease Pain",
      goalsExtra.improveStrength && "تحسين القوة / Improve Strength",
      goalsExtra.lessDifficultyWork && "سهولة العمل / Less Difficulty at Work",
      goalsExtra.improveMovement && "تحسين الحركة / Improve Movement",
    ].filter(Boolean) as string[]),
  ];

  const allPainTypes = [
    ...painTypes,
    ...(data.painTypeOther ? [data.painTypeOther] : []),
  ];
  const allAgg = [
    ...aggravatingFactors,
    ...(data.aggravatingOther ? [data.aggravatingOther] : []),
  ];
  const allAlv = [
    ...alleviatingFactors,
    ...(data.alleviatingOther ? [data.alleviatingOther] : []),
  ];

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
        <SecHead ar="معلومات المريض" en="Patient Information" />
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="الاسم / Name" value={`${patient.firstName} ${patient.lastName}`} />
            <F label="رقم المريض / Patient ID" value={patient.patientNumber} />
            <F label="الجنس / Gender" value={
              patient.gender === "MALE" ? "ذكر / Male" :
              patient.gender === "FEMALE" ? "أنثى / Female" : patient.gender
            } />
          </View>
          <View style={S.col}>
            <F label="رقم الملف / Case ID" value={data.caseId.slice(-8).toUpperCase()} />
            <F label="حالة الملف / Status" value={data.caseStatus} />
            <F label="تاريخ الفتح / Opened" value={new Date(data.caseCreatedAt).toLocaleDateString("en-GB")} />
          </View>
        </View>

        {/* ── 2. الشكوى ── */}
        <SecHead ar="الشكوى الرئيسية" en="Chief Complaint" />
        <F label="الشكوى / Complaint" value={complaint.majorComplaint} />
        <F label="الأعراض / Symptoms" value={complaint.symptoms} />
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="العمل الحالي / Current Job" value={complaint.currentJob} />
            <F label="نمط الحياة / Life Type" value={complaint.lifeType} />
            <F label="تاريخ بدء الشكوى / Start Date" value={complaint.complaintStartDate} />
            <F label="مدة الشكوى / Duration" value={complaint.complaintDuration} />
            <F label="نوع الشكوى / Type" value={complaint.complaintType} />
            <F label="مكان الألم / Location" value={complaint.painLocation} />
          </View>
          <View style={S.col}>
            <F label="مستوى الألم / Pain Level" value={complaint.painLevel} />
            <F label="مدة الألم / Pain Duration" value={complaint.painDuration} />
            <F label="تطور الألم / Progression" value={complaint.painProgression} />
            <F label="أفضل وقت / Best Time" value={complaint.bestTimeOfDay} />
            <F label="أسوأ وقت / Worst Time" value={complaint.worstTimeOfDay} />
            <F label="السبب المحتمل / Possible Cause" value={complaint.possibleCause} />
          </View>
        </View>
        <F label="إصابات سابقة / Previous Injury" value={complaint.hadPreviousInjury} />
        <F label="طبيب سابق / Doctor Seen" value={complaint.previousDoctorSeen} />
        <F label="علاج سابق / Previous Treatment" value={complaint.previousTreatment} />
        <Bool label="زيارة متخصص / Visited Specialist" value={complaint.visitedSpecialist} showNo={false} />
        {complaint.visitedSpecialist && <F label="سبب الزيارة / Reason" value={complaint.specialistReason} />}
        <Bool label="أمراض مزمنة / Chronic Diseases" value={complaint.hasChronicDiseases} showNo={false} />
        {complaint.hasChronicDiseases && <F label="التفاصيل / Details" value={complaint.chronicDiseasesDetail} />}
        <Bool label="علاج فيزيائي سابق / Previous PT" value={complaint.hadPreviousPT} />
        {complaint.hadPreviousPT && <F label="التفاصيل / Details" value={complaint.previousPTDetail} />}
        <Bool label="عمليات جراحية سابقة / Previous Surgery" value={complaint.hadSurgery} />
        {complaint.hadSurgery && <F label="التفاصيل / Details" value={complaint.surgeryDetail} />}
        <F label="ملاحظات الشكوى / Complaint Notes" value={complaint.complaintNotes} />

        {/* ── 3. خريطة الألم ── */}
        <SecHead ar="حدد أماكن الألم" en="Mark Areas of Discomfort" />
        {painRegions.length > 0 && (
          <>
            <Text style={[S.fieldLabel, { marginBottom: 3 }]}>مناطق الألم / Pain Regions ({painRegions.length}):</Text>
            <View style={S.table}>
              <View style={S.tableHeaderRow}>
                <Text style={S.tableCellHead}>الجانب / Side</Text>
                <Text style={S.tableCellHead}>موضع X</Text>
                <Text style={S.tableCellHead}>موضع Y</Text>
                <Text style={S.tableCellHead}>الشدة / Intensity</Text>
                <Text style={S.tableCellHead}>نوع الألم / Type</Text>
                <Text style={S.tableCellHead}>ملاحظات / Notes</Text>
              </View>
              {painRegions.map((r, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={S.tableCell}>{r.side === "front" ? "أمامي" : "خلفي"}</Text>
                  <Text style={S.tableCell}>{Math.round(r.x)}%</Text>
                  <Text style={S.tableCell}>{Math.round(r.y)}%</Text>
                  <Text style={S.tableCell}>{r.intensity}/10</Text>
                  <Text style={S.tableCell}>{r.painType ?? "—"}</Text>
                  <Text style={S.tableCell}>{r.notes ?? "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {allPainTypes.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>نوع الألم / Pain Types:</Text>
            <Chips items={allPainTypes} />
          </View>
        )}
        {allAgg.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العوامل المُفاقِمة / Aggravating Factors:</Text>
            <Chips items={allAgg} />
          </View>
        )}
        {allAlv.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العوامل المُخففة / Alleviating Factors:</Text>
            <Chips items={allAlv} />
          </View>
        )}

        {/* ── 4. التاريخ الطبي ── */}
        <SecHead ar="التاريخ الطبي" en="Medical History" />
        <F label="نمط الحياة / Life Type" value={history.lifeType} />
        <View style={S.twoCol}>
          <View style={S.col}>
            <Bool label="هل تدخن؟ / Smokes?" value={history.smokes} />
            {history.smokes && <F label="تكرار التدخين / Frequency" value={history.smokingFrequency} />}
            <Bool label="سبق أن دخنت؟ / Ever Smoked?" value={history.hasSmokedBefore} />
            <Bool label="جهاز القلب / Pacemaker?" value={history.hasPacemaker} />
            {history.hasPacemaker && <F label="التفاصيل / Details" value={history.pacemakerDetail} />}
          </View>
          <View style={S.col}>
            <Bool label="حساسية اللاصق / Adhesive Allergy?" value={history.adhesiveAllergy} />
            {history.adhesiveAllergy && <F label="التفاصيل / Details" value={history.adhesiveAllergyDetail} />}
            <Bool label="مشاكل صحية أخرى؟ / Other Health?" value={history.hasOtherHealthProblems} />
            {history.hasOtherHealthProblems && <F label="التفاصيل / Details" value={history.otherConditions} />}
            <Bool label="دخل المستشفى العام الماضي؟ / Hospitalized?" value={history.hospitalizedLastYear} />
            {history.hospitalizedLastYear && <F label="التفاصيل / Details" value={history.hospitalizedDetail} />}
          </View>
        </View>
        <F label="الحساسية / Allergies" value={history.allergies} />
        <Bool label="تناول أدوية موصوفة؟ / Prescription Drugs?" value={history.prescriptionDrugs} />
        {history.prescriptionDrugs && <F label="الأدوية الحالية / Current Medications" value={history.currentMedications} />}
        <Bool label="مستحضرات عشبية؟ / Herbal Supplements?" value={history.herbalSupplements} />
        {history.herbalSupplements && <F label="التفاصيل / Details" value={history.supplementsList} />}
        <F label="التشخيصات السابقة / Previous Diagnoses" value={history.previousDiagnoses} />
        <F label="الشكاوى والعمليات السابقة / Previous Complaints & Surgeries" value={history.previousComplaintsSurgeries} />
        <F label="تعليمات الطبيب / Doctor Restrictions" value={history.doctorRestrictions} />
        <Bool label="علاج فيزيائي لنفس المشكلة؟ / PT Same Problem?" value={history.hadPTSameProblem} showNo={false} />
        {history.hadPTSameProblem && <F label="التفاصيل / Details" value={history.ptSameProblemDetail} />}
        <Bool label="علاج آخر حالياً؟ / Other Treatment?" value={history.receivingOtherTreatment} showNo={false} />
        {history.receivingOtherTreatment && <F label="التفاصيل / Details" value={history.otherTreatmentDetail} />}
        <Bool label="هل خضعت لعمليات جراحية؟ / Had Surgeries?" value={history.hadSurgeries} />
        {history.hadSurgeries && <F label="التفاصيل / Details" value={history.surgeriesDetail} />}

        {/* Gender-specific fields */}
        {patient.gender === "FEMALE" && (
          <>
            <Bool label="هل أنتِ حامل؟ / Pregnant?" value={history.isPregnant} />
            <F label="الحالة الاجتماعية / Marital Status" value={history.maritalStatus} />
            <F label="آخر دورة شهرية / Last Menstrual Period" value={history.lastMenstrualPeriod} />
          </>
        )}

        {/* Chronic conditions */}
        {chronicConditions.length > 0 && (
          <View style={{ marginTop: 5 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>الأمراض المزمنة / Chronic Conditions:</Text>
            <Chips items={chronicConditions.map((c) => CHRONIC_CONDITION_LABELS[c] ?? c)} />
            {history.chronicConditionsOther && (
              <F label="أخرى / Other" value={history.chronicConditionsOther} />
            )}
          </View>
        )}

        {/* Tests */}
        {testsHad.length > 0 && (
          <View style={{ marginTop: 5 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>الفحوصات / Tests:</Text>
            <Chips items={testsHad} />
            <F label="نتائج الفحوصات / Results" value={history.testResults} />
            <F label="تحاليل جديدة / New Analysis" value={history.newAnalysis} />
            <F label="تاريخ التحليل الجديد / New Date" value={history.newAnalysisDate} />
            <F label="تحاليل قديمة / Old Analysis" value={history.oldAnalysis} />
            <F label="تاريخ التحليل القديم / Old Date" value={history.oldAnalysisDate} />
          </View>
        )}

        {/* Surgeries table */}
        {history.hadSurgeries && surgeries.some((s) => s.name) && (
          <View style={{ marginTop: 6 }}>
            <SubHead label="العمليات الجراحية / Surgeries" />
            <View style={S.table}>
              <View style={S.tableHeaderRow}>
                <Text style={S.tableCellHead}>اسم العملية / Surgery Name</Text>
                <Text style={S.tableCellHead}>النوع / Type</Text>
                <Text style={S.tableCellHead}>التاريخ / Date</Text>
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

        {/* ── 5. أهداف العلاج ── */}
        <SecHead ar="أهداف العلاج" en="Treatment Goals" />
        {allGoalChips.length > 0 && (
          <>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>الأهداف / Goals:</Text>
            <Chips items={allGoalChips} />
          </>
        )}
        <View style={S.twoCol}>
          <View style={S.col}>
            {goalsExtra.standLonger && <F label="وقوف أطول / Stand Longer" value={`${goalsExtra.standLonger} ساعات/دقائق`} />}
            {goalsExtra.sleepLonger && <F label="نوم أطول / Sleep Longer" value={`${goalsExtra.sleepLonger} ساعات/دقائق`} />}
            {goalsExtra.sitLonger && <F label="جلوس أطول / Sit Longer" value={`${goalsExtra.sitLonger} ساعات/دقائق`} />}
          </View>
          <View style={S.col}>
            {goalsExtra.customGoal && <F label="هدف مخصص / Custom Goal" value={goalsExtra.customGoal} />}
            {goalsExtra.otherGoals && <F label="أهداف أخرى / Other Goals" value={goalsExtra.otherGoals} />}
          </View>
        </View>

        {/* ── 6. التقييم الوضعي ── */}
        <SecHead ar="التقييم الوضعي" en="Postural Assessment" />
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="الوضع الجلوسي / Seated Position" value={postural.seatedPosition} />
            <F label="التحكم بالجذع / Trunk Control" value={postural.trunkControl} />
          </View>
          <View style={S.col}>
            <F label="التشخيص / Diagnosis" value={postural.diagnosis} />
          </View>
        </View>
        {posturalFindings.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>النتائج الإيجابية / Positive Findings:</Text>
            <Chips items={posturalFindings} />
          </View>
        )}
        {postural.pelvisOther && <F label="أخرى (حوض) / Pelvis Other" value={postural.pelvisOther} />}
        {postural.feetOther && <F label="أخرى (قدم) / Feet Other" value={postural.feetOther} />}
        <F label="ملاحظات التشنج / Spasticity Notes" value={postural.spasticityNotes} />
        <F label="ملاحظات عامة / General Notes" value={postural.generalNotes} />

        {/* ── 7. خطة العلاج ── */}
        <SecHead ar="خطة العلاج" en="Treatment Plan" />
        <View style={S.twoCol}>
          <View style={S.col}>
            <F label="من تاريخ / From" value={data.planHeader.treatmentFrom} />
            <F label="إلى تاريخ / To" value={data.planHeader.treatmentTo} />
            <F label="عدد الزيارات / Anticipated Visits" value={data.planHeader.anticipatedVisits} />
          </View>
          <View style={S.col}>
            <F label="الملاحظة / Observation" value={data.planObservation} />
            <F label="الملاحظات / Remarks" value={data.planRemarks} />
          </View>
        </View>
        {data.planModalities.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العلاجات / Modalities:</Text>
            <Chips items={data.planModalities.map((m) => THERAPY_MODALITY_LABELS[m] ?? m)} />
            {data.planOtherModality && <F label="علاجات أخرى / Other Modalities" value={data.planOtherModality} />}
          </View>
        )}

        {/* ── 8. التقييم ── */}
        <SecHead ar="الملاحظات والتقييم" en="Observation & Evaluation" />
        {data.evalModalities.length > 0 && (
          <View style={{ marginBottom: 5 }}>
            <Text style={[S.fieldLabel, { marginBottom: 2 }]}>العلاجات المطبقة / Applied Modalities:</Text>
            <Chips items={data.evalModalities.map((m) => EVALUATION_MODALITY_LABELS[m] ?? m)} />
            {data.evalOtherModality && <F label="أخرى / Other" value={data.evalOtherModality} />}
          </View>
        )}
        <F label="الملاحظات / Notes" value={data.evalNotes} />
        <F label="التقييم / Evaluation" value={data.evalText} />

        {/* ── 9. الجلسات ── */}
        <SecHead ar="الجلسات العلاجية" en="Therapeutic Sessions" />
        {sessions.length === 0 ? (
          <Text style={S.note}>لا توجد جلسات مسجلة / No sessions recorded</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow}>
              <Text style={[S.tableCellHead, { flex: 0.5 }]}>#</Text>
              <Text style={S.tableCellHead}>التاريخ / Date</Text>
              <Text style={S.tableCellHead}>الوقت / Time</Text>
              <Text style={[S.tableCellHead, { flex: 2 }]}>العلاجات / Modalities</Text>
              <Text style={[S.tableCellHead, { flex: 2 }]}>ملاحظات / Notes</Text>
            </View>
            {[...sessions]
              .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
              .map((s, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={[S.tableCell, { flex: 0.5 }]}>{s.sessionNumber}</Text>
                  <Text style={S.tableCell}>
                    {new Date(s.sessionDate).toLocaleDateString("en-GB")}
                  </Text>
                  <Text style={S.tableCell}>{s.sessionTime ?? "—"}</Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>
                    {s.modalities?.map((m) => THERAPY_MODALITY_LABELS[m] ?? m).join("، ") || "—"}
                  </Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>{s.notes ?? "—"}</Text>
                </View>
              ))}
          </View>
        )}

        {/* ── 10. رأي رئيس القسم ── */}
        {data.supervisorGaze && (
          <>
            <SecHead ar="رأي رئيس القسم" en="Supervisor Review" />
            <Text style={S.fieldValue}>{data.supervisorGaze}</Text>
          </>
        )}

        {/* ── 11. الملخص النهائي ── */}
        {data.finalSummary && (
          <>
            <SecHead ar="الملخص النهائي" en="Final Summary" />
            <Text style={S.fieldValue}>{data.finalSummary}</Text>
          </>
        )}

        {/* ── Signature line ── */}
        <View style={{ marginTop: 30, flexDirection: "row-reverse", justifyContent: "space-around" }}>
          {[
            { ar: "توقيع المعالج الفيزيائي", en: "Physiotherapist Signature" },
            { ar: "توقيع المريض", en: "Patient Signature" },
            { ar: "توقيع رئيس القسم", en: "Supervisor Signature" },
          ].map((sig, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 100, borderBottomWidth: 0.5, borderBottomColor: TEXT }} />
              <Text style={{ fontSize: 8, color: MUTED, textAlign: "center" }}>{sig.ar}</Text>
              <Text style={{ fontSize: 7, color: MUTED, textAlign: "center" }}>{sig.en}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

// ── Public export function ─────────────────────────────────────────────────────

let fontsRegistered = false;

export async function downloadPhysioCasePdf(data: PhysioCasePdfData): Promise<void> {
  if (!fontsRegistered) {
    const origin = window.location.origin;
    Font.register({
      family: "Amiri",
      fonts: [
        { src: `${origin}/fonts/amiri-regular.ttf`, fontWeight: "normal", fontStyle: "normal" },
        { src: `${origin}/fonts/amiri-bold.ttf`, fontWeight: "bold", fontStyle: "normal" },
        { src: `${origin}/fonts/amiri-italic.ttf`, fontWeight: "normal", fontStyle: "italic" },
      ],
    });
    fontsRegistered = true;
  }

  const blob = await pdf(<PhysioPdfDoc data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `physio-${data.patient.patientNumber}-${data.caseId.slice(-8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
