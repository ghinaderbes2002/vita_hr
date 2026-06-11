"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { BodyPainMap } from "@/components/clinic/body-pain-map";
import { SignaturePadDialog } from "@/components/clinic/signature-pad-dialog";
import { PdfExportButton } from "@/components/clinic/pdf-export-button";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ActionGuard } from "@/components/permissions/action-guard";
import {
  usePhysioCase,
  useUpdatePhysioCase,
  useUpdatePhysioStatus,
  useSubmitComplaint,
  useSubmitPainMap,
  useSubmitMedicalHistory,
  useAddPhysioSurgery,
  useSubmitPhysioGoals,
  useSubmitPosturalAssessment,
  useSubmitTreatmentPlan,
  useSubmitEvaluation,
  useSupervisorReview,
  useSignPhysioTreatmentPlan,
  usePhysioSessions,
  useAddPhysioSession,
  useDeletePhysioSession,
  usePhysioTimeline,
} from "@/lib/hooks/use-clinic-physio";
import {
  PhysioStatus,
  PainRegion,
  TherapyModality,
  THERAPY_MODALITY_LABELS,
  EvaluationModality,
  EVALUATION_MODALITY_LABELS,
  ChronicCondition,
  CHRONIC_CONDITION_LABELS,
  PhysioGoal,
  PHYSIO_GOAL_LABELS,
  TestType,
} from "@/lib/api/clinic-physio";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card dir="rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-right">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary/50"
      }`}
    >
      {label}
    </button>
  );
}

function RLToggle({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(value === o.value ? "" : o.value)}
            className={`px-2 py-0.5 rounded border text-xs transition-colors ${
              value === o.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/40"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const THERAPY_MODALITIES = Object.keys(
  THERAPY_MODALITY_LABELS,
) as TherapyModality[];
const EVALUATION_MODALITIES = Object.keys(
  EVALUATION_MODALITY_LABELS,
) as EvaluationModality[];
// Paper form 2-col order: [right-col (ESWT side), left-col (MANUAL_THERAPY side)]
const THERAPY_MODALITY_PAIRS: [TherapyModality, TherapyModality][] = [
  ["ESWT",       "MANUAL_THERAPY"],
  ["US",         "MASSAGE"],
  ["TENS",       "KINESIO_TAPING"],
  ["EMS",        "COMPRESSION"],
  ["LASER",      "PARAFFIN"],
  ["CPM",        "GRASTON"],
  ["HOT_PACKS",  "MET"],
  ["COLD_PACKS", "PNF"],
  ["TRACTION",   "INFRARED"],
  ["EXERCISES",  "OTHER"],
];
const EVAL_MODALITY_PAIRS: [EvaluationModality, EvaluationModality][] = [
  ["ESWT", "MANUAL_THERAPY"],
  ["US", "MASSAGE"],
  ["TENS", "KINESIO_TAPING"],
  ["EMS", "COMPRESSION"],
  ["LASER", "PARAFFIN"],
  ["CPM", "GRASTON"],
  ["HOT_PACKS", "MET"],
  ["COLD_PACKS", "PNF"],
  ["TRACTION", "INFRARED"],
  ["EXERCISES", "OTHER"],
];
const CHRONIC_CONDITIONS = Object.keys(
  CHRONIC_CONDITION_LABELS,
) as ChronicCondition[];
const PHYSIO_GOALS = Object.keys(PHYSIO_GOAL_LABELS) as PhysioGoal[];

const TEST_LABELS: Partial<Record<TestType, string>> = {
  MRI: "التصوير بالرنين المغناطيسي / MRI",
  MYELOGRAM: "تصوير النخاع / Scan Myelogram",
  XRAY: "الأشعة السينية / X-Ray",
  CT: "التصوير المقطعي المحوسب / CT",
  OTHER: "أخرى / Other",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PhysioCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const { data: caseData, isLoading } = usePhysioCase(id);
  const { data: sessions = [] } = usePhysioSessions(id);
  const { data: timeline = [] } = usePhysioTimeline(id);

  const updateCase = useUpdatePhysioCase();
  const updateStatus = useUpdatePhysioStatus();
  const submitComplaint = useSubmitComplaint();
  const submitPainMap = useSubmitPainMap();
  const submitHistory = useSubmitMedicalHistory();
  const addSurgery = useAddPhysioSurgery();
  const submitGoals = useSubmitPhysioGoals();
  const submitPostural = useSubmitPosturalAssessment();
  const submitPlan = useSubmitTreatmentPlan();
  const submitEval = useSubmitEvaluation();
  const supervisorRev = useSupervisorReview();
  const signPlan = useSignPhysioTreatmentPlan();
  const addSession = useAddPhysioSession();
  const deleteSession = useDeletePhysioSession();

  // ── Complaint state ──────────────────────────────────────────────────────────
  const [complaint, setComplaint] = useState({
    majorComplaint: "",
    symptoms: "",
    currentJob: "",
    lifeType: "",
    complaintStartDate: "",
    possibleCause: "",
    previousDoctorSeen: "",
    previousTreatment: "",
    painLevel: "",
    painDuration: "",
    painProgression: "",
    hadPreviousInjury: false,
    bestTimeOfDay: "",
    worstTimeOfDay: "",
    // New fields
    complaintType: "",
    painLocation: "",
    complaintDuration: "",
    complaintNotes: "",
    hasChronicDiseases: false,
    chronicDiseasesDetail: "",
    visitedSpecialist: false,
    specialistReason: "",
    hadPreviousPT: false,
    previousPTDetail: "",
    hadSurgery: false,
    surgeryDetail: "",
  });

  // ── Pain map state ───────────────────────────────────────────────────────────
  const [painRegions, setPainRegions] = useState<PainRegion[]>([]);
  const [painTypes, setPainTypes] = useState<string[]>([]);
  const [painTypeOther, setPainTypeOther] = useState("");
  const [aggravatingFactors, setAggravatingFactors] = useState<string[]>([]);
  const [alleviatingFactors, setAlleviatingFactors] = useState<string[]>([]);
  const [aggravatingOther, setAggravatingOther] = useState("");
  const [alleviatingOther, setAlleviatingOther] = useState("");

  // ── Medical history state ────────────────────────────────────────────────────
  const [history, setHistory] = useState({
    lifeType: "",
    smokes: false,
    hasSmokedBefore: false,
    smokingFrequency: "",
    hasPacemaker: false,
    pacemakerDetail: "",
    allergies: "",
    adhesiveAllergy: false,
    isPregnant: false,
    currentMedications: "",
    prescriptionDrugs: false,
    herbalSupplements: false,
    supplementsList: "",
    previousDiagnoses: "",
    previousComplaintsSurgeries: "",
    hasOtherHealthProblems: false,
    otherConditions: "",
    doctorRestrictions: "",
    hadPTSameProblem: false,
    ptSameProblemDetail: "",
    receivingOtherTreatment: false,
    otherTreatmentDetail: "",
    testsOther: "",
    testResults: "",
    newAnalysis: "",
    newAnalysisDate: "",
    newAnalysisAttachment: "",
    oldAnalysis: "",
    oldAnalysisDate: "",
    oldAnalysisAttachment: "",
    boneDensityTest: false,
    boneDensityDetail: "",
    hospitalizedLastYear: false,
    hospitalizedDetail: "",
  });
  const [chronicConditions, setChronicConditions] = useState<
    ChronicCondition[]
  >([]);
  const [testsHad, setTestsHad] = useState<TestType[]>([]);
  const [attachmentUploading, setAttachmentUploading] = useState<
    "new" | "old" | null
  >(null);
  const [surgeries, setSurgeries] = useState([
    { name: "", type: "", date: "" },
    { name: "", type: "", date: "" },
    { name: "", type: "", date: "" },
    { name: "", type: "", date: "" },
    { name: "", type: "", date: "" },
  ]);

  // ── Goals state ──────────────────────────────────────────────────────────────
  const [goals, setGoals] = useState<PhysioGoal[]>([]);
  const [goalsExtra, setGoalsExtra] = useState({
    customGoal: "",
    decreasePain: false,
    improveStrength: false,
    lessDifficultyWork: false,
    improveMovement: false,
    standLongerMinutes: "",
    sleepLongerMinutes: "",
    sitLongerMinutes: "",
    otherGoals: "",
  });

  // ── Postural assessment state ────────────────────────────────────────────────
  const [postural, setPostural] = useState({
    seatedPosition: "", trunkControl: "",
    headNeutral: false, headHyperextended: false, headFwdFlexed: false,
    headLaterallyFlexed: false, headRotatedL: false, headRotatedR: false,
    shouldersLevel: false,
    shouldersElevatedL: false, shouldersElevatedR: false,
    shouldersSublaxedL: false, shouldersSublaxedR: false,
    elbowHyperextended: false, elbowFlexed: false,
    elbowSupinationL: false, elbowSupinationR: false,
    elbowPronationL: false, elbowPronationR: false,
    ribCageNeutral: false,
    ribCageElevatedL: false, ribCageElevatedR: false,
    ribCageRotatedFwdL: false, ribCageRotatedFwdR: false,
    spineNeutral: false, spineKyphosis: false, spineFlatLumbar: false,
    spineNormalLumbar: false, spineHyperLordotic: false,
    spineScoliosisApexL: false, spineScoliosisApexR: false,
    pelvisNeutral: false, pelvisRotatedFwd: false,
    pelvisAnteriorTilt: false, pelvisPosteriorTilt: false,
    pelvisObliqueL: false, pelvisObliqueR: false, pelvisOther: "",
    hipsAbductedL: false, hipsAbductedR: false,
    hipsAdductedL: false, hipsAdductedR: false,
    hipsFlexedL: false, hipsFlexedR: false,
    hipsExtendedL: false, hipsExtendedR: false,
    kneesFlexedBeyond90L: false, kneesFlexedBeyond90R: false,
    kneesExtendedBeyond90L: false, kneesExtendedBeyond90R: false,
    feetPronateEvertL: false, feetPronateEvertR: false,
    feetSupinateInvL: false, feetSupinateInvR: false,
    feetDorsiflexedL: false, feetDorsiflexedR: false,
    feetPlantarflexedL: false, feetPlantarflexedR: false,
    feetOther: "",
    spasticityNotes: "", generalNotes: "", diagnosis: "",
  });

  // ── Treatment plan state ─────────────────────────────────────────────────────
  const [planModalities, setPlanModalities] = useState<TherapyModality[]>([]);
  const [planHeader, setPlanHeader] = useState({
    treatmentFrom: "",
    treatmentTo: "",
    anticipatedVisits: "",
    physiotherapistId: "",
    caseManagerId: "",
  });
  const [planRemarks, setPlanRemarks] = useState("");
  const [planObservation, setPlanObservation] = useState("");
  const [planOtherModality, setPlanOtherModality] = useState("");
  const [planStatus, setPlanStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // ── Evaluation state ─────────────────────────────────────────────────────────
  const [evalModalities, setEvalModalities] = useState<EvaluationModality[]>(
    [],
  );
  const [evalOtherModality, setEvalOtherModality] = useState("");
  const [evalNotes, setEvalNotes] = useState("");
  const [evalText, setEvalText] = useState("");

  // ── Supervisor review state ──────────────────────────────────────────────────
  const [supervisorGaze, setSupervisorGaze] = useState("");

  // ── Sign / session state ─────────────────────────────────────────────────────
  const [signOpen, setSignOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "",
    notes: "",
    painLevel: "",
    modalities: [] as TherapyModality[],
  });

  // ── Auto-save pain regions ───────────────────────────────────────────────────
  const autoSaveReady = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!autoSaveReady.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      submitPainMap.mutate({ id, dto: { regions: painRegions } });
    }, 1200);
    return () => clearTimeout(autoSaveTimer.current);
  }, [painRegions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize form states from backend data ─────────────────────────────────
  const initialized = useRef(false);
  useEffect(() => {
    if (!caseData || initialized.current) return;
    initialized.current = true;

    // Enable auto-save slightly after initialization so the initial setState
    // calls don't trigger unnecessary saves
    setTimeout(() => {
      autoSaveReady.current = true;
    }, 500);

    // Complaint
    setComplaint({
      majorComplaint: caseData.majorComplaint ?? "",
      symptoms: caseData.symptoms ?? "",
      currentJob: caseData.currentJob ?? "",
      lifeType: caseData.lifeType ?? "",
      complaintStartDate: caseData.complaintStartDate
        ? caseData.complaintStartDate.slice(0, 10)
        : "",
      possibleCause: caseData.possibleCause ?? "",
      previousDoctorSeen: caseData.previousDoctorSeen ?? "",
      previousTreatment: caseData.previousTreatment ?? "",
      painLevel: caseData.painLevel ?? "",
      painDuration: caseData.painDuration ?? "",
      painProgression: caseData.painProgression ?? "",
      hadPreviousInjury: caseData.hadPreviousInjury ?? false,
      bestTimeOfDay: caseData.bestTimeOfDay ?? "",
      worstTimeOfDay: caseData.worstTimeOfDay ?? "",
      complaintType: caseData.complaintType ?? "",
      painLocation: caseData.painLocation ?? "",
      complaintDuration: caseData.complaintDuration ?? "",
      complaintNotes: caseData.complaintNotes ?? "",
      hasChronicDiseases: caseData.hasChronicDiseases ?? false,
      chronicDiseasesDetail: caseData.chronicDiseasesDetail ?? "",
      visitedSpecialist: caseData.visitedSpecialist ?? false,
      specialistReason: caseData.specialistReason ?? "",
      hadPreviousPT: caseData.hadPreviousPT ?? false,
      previousPTDetail: caseData.previousPTDetail ?? "",
      hadSurgery: caseData.hadSurgery ?? false,
      surgeryDetail: caseData.surgeryDetail ?? "",
    });

    // Pain map
    if (caseData.painMap?.regions?.length) {
      setPainRegions(caseData.painMap.regions);
    }
    if (caseData.painTypes?.length) setPainTypes(caseData.painTypes);
    if (caseData.painTypeOther) setPainTypeOther(caseData.painTypeOther);
    if (caseData.aggravatingFactors?.length)
      setAggravatingFactors(caseData.aggravatingFactors);
    if (caseData.alleviatingFactors?.length)
      setAlleviatingFactors(caseData.alleviatingFactors);
    if (caseData.aggravatingOther)
      setAggravatingOther(caseData.aggravatingOther);
    if (caseData.alleviatingOther)
      setAlleviatingOther(caseData.alleviatingOther);

    // Medical history
    const mh = caseData.medicalHistory;
    if (mh) {
      setHistory({
        lifeType: caseData.lifeType ?? mh.lifeType ?? "",
        smokes: mh.smokes ?? false,
        hasSmokedBefore: mh.hasSmokedBefore ?? false,
        smokingFrequency: mh.smokingFrequency ?? "",
        hasPacemaker: mh.hasPacemaker ?? false,
        pacemakerDetail: mh.pacemakerDetail ?? "",
        allergies: mh.allergies ?? "",
        adhesiveAllergy: mh.adhesiveAllergy ?? false,
        isPregnant: mh.isPregnant ?? false,
        currentMedications: mh.currentMedications ?? "",
        prescriptionDrugs: mh.prescriptionDrugs ?? false,
        herbalSupplements: mh.herbalSupplements ?? false,
        supplementsList: mh.supplementsList ?? "",
        previousDiagnoses: mh.previousDiagnoses ?? "",
        previousComplaintsSurgeries: mh.previousComplaintsSurgeries ?? "",
        hasOtherHealthProblems: mh.hasOtherHealthProblems ?? false,
        otherConditions: mh.otherConditions ?? "",
        doctorRestrictions: mh.doctorRestrictions ?? "",
        hadPTSameProblem: mh.hadPTSameProblem ?? false,
        ptSameProblemDetail: mh.ptSameProblemDetail ?? "",
        receivingOtherTreatment: mh.receivingOtherTreatment ?? false,
        otherTreatmentDetail: mh.otherTreatmentDetail ?? "",
        testsOther: mh.testsOther ?? "",
        testResults: mh.testResults ?? "",
        newAnalysis: mh.newAnalysis ?? "",
        newAnalysisDate: mh.newAnalysisDate
          ? mh.newAnalysisDate.slice(0, 10)
          : "",
        newAnalysisAttachment: mh.newAnalysisAttachment ?? "",
        oldAnalysis: mh.oldAnalysis ?? "",
        oldAnalysisDate: mh.oldAnalysisDate
          ? mh.oldAnalysisDate.slice(0, 10)
          : "",
        oldAnalysisAttachment: mh.oldAnalysisAttachment ?? "",
        boneDensityTest: mh.boneDensityTest ?? false,
        boneDensityDetail: mh.boneDensityDetail ?? "",
        hospitalizedLastYear: mh.hospitalizedLastYear ?? false,
        hospitalizedDetail: mh.hospitalizedDetail ?? "",
      });
      if (mh.chronicConditions?.length)
        setChronicConditions(mh.chronicConditions);
      if (mh.testsHad?.length) setTestsHad(mh.testsHad);

      // Surgeries — load existing rows from backend
      const backendSurgeries: any[] = mh.surgeries ?? [];
      if (backendSurgeries.length > 0) {
        const rows = Array.from({ length: 5 }, (_, i) => ({
          name: backendSurgeries[i]?.name ?? "",
          type: backendSurgeries[i]?.type ?? "",
          date: backendSurgeries[i]?.date
            ? (backendSurgeries[i].date as string).slice(0, 10)
            : "",
        }));
        setSurgeries(rows);
      }
    }

    // Goals
    const g = caseData.goals;
    if (g) {
      if (g.goals?.length) setGoals(g.goals);
      setGoalsExtra({
        customGoal: g.customGoal ?? "",
        decreasePain: g.decreasePain ?? false,
        improveStrength: g.improveStrength ?? false,
        lessDifficultyWork: g.lessDifficultyWork ?? false,
        improveMovement: g.improveMovement ?? false,
        standLongerMinutes:
          g.standLongerMinutes != null ? String(g.standLongerMinutes) : "",
        sleepLongerMinutes:
          g.sleepLongerMinutes != null ? String(g.sleepLongerMinutes) : "",
        sitLongerMinutes:
          g.sitLongerMinutes != null ? String(g.sitLongerMinutes) : "",
        otherGoals: g.otherGoals ?? "",
      });
    }

    // Postural assessment
    const pa = caseData.posturalAssessment;
    if (pa) {
      setPostural({
        seatedPosition: pa.seatedPosition ?? "", trunkControl: pa.trunkControl ?? "",
        headNeutral: pa.head?.neutral ?? false,
        headHyperextended: pa.head?.hyperextended ?? false,
        headFwdFlexed: pa.head?.fwdFlexed ?? false,
        headLaterallyFlexed: pa.head?.laterallyFlexed ?? false,
        headRotatedL: pa.head?.rotated?.L ?? false,
        headRotatedR: pa.head?.rotated?.R ?? false,
        shouldersLevel: pa.shoulders?.level ?? false,
        shouldersElevatedL: pa.shoulders?.elevated?.L ?? false,
        shouldersElevatedR: pa.shoulders?.elevated?.R ?? false,
        shouldersSublaxedL: pa.shoulders?.sublaxed?.L ?? false,
        shouldersSublaxedR: pa.shoulders?.sublaxed?.R ?? false,
        elbowHyperextended: pa.elbow?.hyperextended ?? false,
        elbowFlexed: pa.elbow?.flexed ?? false,
        elbowSupinationL: pa.elbow?.supination?.L ?? false,
        elbowSupinationR: pa.elbow?.supination?.R ?? false,
        elbowPronationL: pa.elbow?.pronation?.L ?? false,
        elbowPronationR: pa.elbow?.pronation?.R ?? false,
        ribCageNeutral: pa.ribCage?.neutral ?? false,
        ribCageElevatedL: pa.ribCage?.elevated?.L ?? false,
        ribCageElevatedR: pa.ribCage?.elevated?.R ?? false,
        ribCageRotatedFwdL: pa.ribCage?.rotatedFwd?.L ?? false,
        ribCageRotatedFwdR: pa.ribCage?.rotatedFwd?.R ?? false,
        spineNeutral: pa.spine?.neutral ?? false,
        spineKyphosis: pa.spine?.kyphosis ?? false,
        spineFlatLumbar: pa.spine?.flatLumbar ?? false,
        spineNormalLumbar: pa.spine?.normalLumbar ?? false,
        spineHyperLordotic: pa.spine?.hyperLordotic ?? false,
        spineScoliosisApexL: pa.spine?.scoliosisApex?.L ?? false,
        spineScoliosisApexR: pa.spine?.scoliosisApex?.R ?? false,
        pelvisNeutral: pa.pelvis?.neutral ?? false,
        pelvisRotatedFwd: pa.pelvis?.rotatedFwd ?? false,
        pelvisAnteriorTilt: pa.pelvis?.anteriorTilt ?? false,
        pelvisPosteriorTilt: pa.pelvis?.posteriorTilt ?? false,
        pelvisObliqueL: pa.pelvis?.oblique?.L ?? false,
        pelvisObliqueR: pa.pelvis?.oblique?.R ?? false,
        pelvisOther: pa.pelvis?.other ?? "",
        hipsAbductedL: pa.hips?.abducted?.L ?? false,
        hipsAbductedR: pa.hips?.abducted?.R ?? false,
        hipsAdductedL: pa.hips?.adducted?.L ?? false,
        hipsAdductedR: pa.hips?.adducted?.R ?? false,
        hipsFlexedL: pa.hips?.flexed?.L ?? false,
        hipsFlexedR: pa.hips?.flexed?.R ?? false,
        hipsExtendedL: pa.hips?.extended?.L ?? false,
        hipsExtendedR: pa.hips?.extended?.R ?? false,
        kneesFlexedBeyond90L: pa.knees?.flexedBeyond90?.L ?? false,
        kneesFlexedBeyond90R: pa.knees?.flexedBeyond90?.R ?? false,
        kneesExtendedBeyond90L: pa.knees?.extendedBeyond90?.L ?? false,
        kneesExtendedBeyond90R: pa.knees?.extendedBeyond90?.R ?? false,
        feetPronateEvertL: pa.feet?.pronateEvert?.L ?? false,
        feetPronateEvertR: pa.feet?.pronateEvert?.R ?? false,
        feetSupinateInvL: pa.feet?.supinateInv?.L ?? false,
        feetSupinateInvR: pa.feet?.supinateInv?.R ?? false,
        feetDorsiflexedL: pa.feet?.dorsiflexed?.L ?? false,
        feetDorsiflexedR: pa.feet?.dorsiflexed?.R ?? false,
        feetPlantarflexedL: pa.feet?.plantarflexed?.L ?? false,
        feetPlantarflexedR: pa.feet?.plantarflexed?.R ?? false,
        feetOther: pa.feet?.other ?? "",
        spasticityNotes: pa.spasticityNotes ?? "",
        generalNotes: pa.generalNotes ?? "",
        diagnosis: pa.diagnosis ?? "",
      });
    }

    // Treatment plan
    const tp = caseData.treatmentPlan;
    if (tp) {
      if (tp.modalities?.length) setPlanModalities(tp.modalities);
      if (tp.remarks) setPlanRemarks(tp.remarks);
      if (tp.observation) setPlanObservation(tp.observation);
      if (tp.otherModality) setPlanOtherModality(tp.otherModality);
      if (tp.status) setPlanStatus(tp.status);
    }
    setPlanHeader({
      treatmentFrom: caseData.treatmentFrom
        ? caseData.treatmentFrom.slice(0, 10)
        : "",
      treatmentTo: caseData.treatmentTo
        ? caseData.treatmentTo.slice(0, 10)
        : "",
      anticipatedVisits:
        caseData.anticipatedVisits != null
          ? String(caseData.anticipatedVisits)
          : "",
      physiotherapistId: caseData.physiotherapistId ?? "",
      caseManagerId: caseData.caseManagerId ?? "",
    });

    // Evaluation
    const ev = caseData.evaluation;
    if (ev) {
      if (ev.modalities?.length) setEvalModalities(ev.modalities);
      if (ev.otherModality) setEvalOtherModality(ev.otherModality);
      if (ev.notes) setEvalNotes(ev.notes);
      if (ev.evaluation) setEvalText(ev.evaluation);
    }
  }, [caseData]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        الحالة غير موجودة
      </div>
    );
  }

  const c = caseData;
  const patientName = c.patient
    ? `${c.patient.firstName} ${c.patient.lastName}`
    : "—";

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveComplaint = async () => {
    await updateCase.mutateAsync({
      id,
      dto: {
        majorComplaint: complaint.majorComplaint || undefined,
        symptoms: complaint.symptoms || undefined,
        currentJob: complaint.currentJob || undefined,
        lifeType: (complaint.lifeType as any) || undefined,
        complaintStartDate: complaint.complaintStartDate || undefined,
        possibleCause: complaint.possibleCause || undefined,
        previousDoctorSeen: complaint.previousDoctorSeen || undefined,
        previousTreatment: complaint.previousTreatment || undefined,
        painLevel: (complaint.painLevel as any) || undefined,
        painDuration: (complaint.painDuration as any) || undefined,
        painProgression: complaint.painProgression || undefined,
        hadPreviousInjury: complaint.hadPreviousInjury,
        bestTimeOfDay: complaint.bestTimeOfDay || undefined,
        worstTimeOfDay: complaint.worstTimeOfDay || undefined,
        complaintType: complaint.complaintType || undefined,
        painLocation: complaint.painLocation || undefined,
        complaintDuration: complaint.complaintDuration || undefined,
        complaintNotes: complaint.complaintNotes || undefined,
        hasChronicDiseases: complaint.hasChronicDiseases,
        chronicDiseasesDetail: complaint.hasChronicDiseases
          ? complaint.chronicDiseasesDetail || undefined
          : undefined,
        visitedSpecialist: complaint.visitedSpecialist,
        specialistReason: complaint.visitedSpecialist
          ? complaint.specialistReason || undefined
          : undefined,
        hadPreviousPT: complaint.hadPreviousPT,
        previousPTDetail: complaint.hadPreviousPT
          ? complaint.previousPTDetail || undefined
          : undefined,
        hadSurgery: complaint.hadSurgery,
        surgeryDetail: complaint.hadSurgery
          ? complaint.surgeryDetail || undefined
          : undefined,
      },
    });
    if (c.status === "INTAKE") {
      await updateStatus.mutateAsync({ id, status: "COMPLAINT" });
    }
  };

  const handleSaveIntake = async () => {
    await submitComplaint.mutateAsync({
      id,
      dto: {
        complaintType: complaint.complaintType || undefined,
        painLocation: complaint.painLocation || undefined,
        complaintDuration: complaint.complaintDuration || undefined,
        complaintNotes: complaint.complaintNotes || undefined,
        hasChronicDiseases: complaint.hasChronicDiseases,
        chronicDiseasesDetail: complaint.hasChronicDiseases
          ? complaint.chronicDiseasesDetail || undefined
          : undefined,
        visitedSpecialist: complaint.visitedSpecialist,
        specialistReason: complaint.visitedSpecialist
          ? complaint.specialistReason || undefined
          : undefined,
        hadPreviousPT: complaint.hadPreviousPT,
        previousPTDetail: complaint.hadPreviousPT
          ? complaint.previousPTDetail || undefined
          : undefined,
        hadSurgery: complaint.hadSurgery,
        surgeryDetail: complaint.hadSurgery
          ? complaint.surgeryDetail || undefined
          : undefined,
      },
    });
  };

  const handleSavePainMap = async () => {
    await submitPainMap.mutateAsync({
      id,
      dto: {
        regions: painRegions,
        painTypes: painTypes.length ? painTypes : undefined,
        painTypeOther: painTypes.includes("OTHER")
          ? painTypeOther || undefined
          : undefined,
        aggravatingFactors: aggravatingFactors.length
          ? aggravatingFactors
          : undefined,
        aggravatingOther: aggravatingFactors.includes("OTHER")
          ? aggravatingOther || undefined
          : undefined,
        alleviatingFactors: alleviatingFactors.length
          ? alleviatingFactors
          : undefined,
        alleviatingOther: alleviatingFactors.includes("OTHER")
          ? alleviatingOther || undefined
          : undefined,
      },
    });
    if (["COMPLAINT", "INTAKE"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "PAIN_MAP" });
    }
  };

  const handleSaveHistory = async () => {
    // Only POST surgeries that don't already exist in the backend (prevent duplicates)
    const existingSurgeryNames = new Set(
      ((c.medicalHistory as any)?.surgeries ?? []).map((s: any) =>
        s.name?.trim().toLowerCase(),
      ),
    );
    const surgeriesFiltered = surgeries
      .filter(
        (s) =>
          s.name.trim() &&
          !existingSurgeryNames.has(s.name.trim().toLowerCase()),
      )
      .map((s, i) => ({
        name: s.name,
        type: s.type || undefined,
        date: s.date || undefined,
        order: i + 1,
      }));

    await submitHistory.mutateAsync({
      id,
      dto: {
        lifeType: history.lifeType || undefined,
        smokes: history.smokes,
        hasSmokedBefore: history.hasSmokedBefore,
        smokingFrequency: history.smokingFrequency || undefined,
        hasPacemaker: history.hasPacemaker,
        pacemakerDetail: history.hasPacemaker
          ? history.pacemakerDetail || undefined
          : undefined,
        allergies: history.allergies || undefined,
        adhesiveAllergy: history.adhesiveAllergy,
        isPregnant: history.isPregnant,
        currentMedications: history.currentMedications || undefined,
        prescriptionDrugs: history.prescriptionDrugs,
        herbalSupplements: history.herbalSupplements,
        supplementsList: history.herbalSupplements
          ? history.supplementsList || undefined
          : undefined,
        previousDiagnoses: history.previousDiagnoses || undefined,
        previousComplaintsSurgeries:
          history.previousComplaintsSurgeries || undefined,
        hasOtherHealthProblems: history.hasOtherHealthProblems,
        otherConditions: history.hasOtherHealthProblems
          ? history.otherConditions || undefined
          : undefined,
        doctorRestrictions: history.doctorRestrictions || undefined,
        hadPTSameProblem: history.hadPTSameProblem,
        ptSameProblemDetail: history.hadPTSameProblem
          ? history.ptSameProblemDetail || undefined
          : undefined,
        receivingOtherTreatment: history.receivingOtherTreatment,
        otherTreatmentDetail: history.receivingOtherTreatment
          ? history.otherTreatmentDetail || undefined
          : undefined,
        chronicConditions: chronicConditions.length
          ? chronicConditions
          : undefined,
        testsHad: testsHad.length ? testsHad : undefined,
        testsOther: history.testsOther || undefined,
        testResults: history.testResults || undefined,
        newAnalysis: history.newAnalysis || undefined,
        newAnalysisDate: history.newAnalysisDate || undefined,
        newAnalysisAttachment: history.newAnalysisAttachment || undefined,
        oldAnalysis: history.oldAnalysis || undefined,
        oldAnalysisDate: history.oldAnalysisDate || undefined,
        oldAnalysisAttachment: history.oldAnalysisAttachment || undefined,
        boneDensityTest: history.boneDensityTest,
        boneDensityDetail: history.boneDensityTest
          ? history.boneDensityDetail || undefined
          : undefined,
        hospitalizedLastYear: history.hospitalizedLastYear,
        hospitalizedDetail: history.hospitalizedLastYear
          ? history.hospitalizedDetail || undefined
          : undefined,
      },
    });

    for (const s of surgeriesFiltered) {
      await addSurgery.mutateAsync({ id, dto: s });
    }

    if (["PAIN_MAP", "COMPLAINT", "INTAKE"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "MEDICAL_HISTORY" });
    }
  };

  const handleSaveGoals = async () => {
    await submitGoals.mutateAsync({
      id,
      dto: {
        goals: goals.length ? goals : undefined,
        customGoal: goalsExtra.customGoal || undefined,
        decreasePain: goalsExtra.decreasePain,
        improveStrength: goalsExtra.improveStrength,
        lessDifficultyWork: goalsExtra.lessDifficultyWork,
        improveMovement: goalsExtra.improveMovement,
        standLongerMinutes: goalsExtra.standLongerMinutes
          ? Number(goalsExtra.standLongerMinutes)
          : undefined,
        sleepLongerMinutes: goalsExtra.sleepLongerMinutes
          ? Number(goalsExtra.sleepLongerMinutes)
          : undefined,
        sitLongerMinutes: goalsExtra.sitLongerMinutes
          ? Number(goalsExtra.sitLongerMinutes)
          : undefined,
        otherGoals: goalsExtra.otherGoals || undefined,
      },
    });
    if (["MEDICAL_HISTORY", "PAIN_MAP"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "GOALS" });
    }
  };

  const handleSavePostural = async () => {
    const p = postural;
    await submitPostural.mutateAsync({
      id,
      dto: {
        seatedPosition: p.seatedPosition || undefined,
        trunkControl: p.trunkControl || undefined,
        head: { neutral: p.headNeutral, hyperextended: p.headHyperextended, fwdFlexed: p.headFwdFlexed, laterallyFlexed: p.headLaterallyFlexed, rotated: { L: p.headRotatedL, R: p.headRotatedR } },
        shoulders: { level: p.shouldersLevel, elevated: { L: p.shouldersElevatedL, R: p.shouldersElevatedR }, sublaxed: { L: p.shouldersSublaxedL, R: p.shouldersSublaxedR } },
        elbow: { hyperextended: p.elbowHyperextended, flexed: p.elbowFlexed, supination: { L: p.elbowSupinationL, R: p.elbowSupinationR }, pronation: { L: p.elbowPronationL, R: p.elbowPronationR } },
        ribCage: { neutral: p.ribCageNeutral, elevated: { L: p.ribCageElevatedL, R: p.ribCageElevatedR }, rotatedFwd: { L: p.ribCageRotatedFwdL, R: p.ribCageRotatedFwdR } },
        spine: { neutral: p.spineNeutral, kyphosis: p.spineKyphosis, flatLumbar: p.spineFlatLumbar, normalLumbar: p.spineNormalLumbar, hyperLordotic: p.spineHyperLordotic, scoliosisApex: { L: p.spineScoliosisApexL, R: p.spineScoliosisApexR } },
        pelvis: { neutral: p.pelvisNeutral, rotatedFwd: p.pelvisRotatedFwd, anteriorTilt: p.pelvisAnteriorTilt, posteriorTilt: p.pelvisPosteriorTilt, oblique: { L: p.pelvisObliqueL, R: p.pelvisObliqueR }, other: p.pelvisOther || undefined },
        hips: { abducted: { L: p.hipsAbductedL, R: p.hipsAbductedR }, adducted: { L: p.hipsAdductedL, R: p.hipsAdductedR }, flexed: { L: p.hipsFlexedL, R: p.hipsFlexedR }, extended: { L: p.hipsExtendedL, R: p.hipsExtendedR } },
        knees: { flexedBeyond90: { L: p.kneesFlexedBeyond90L, R: p.kneesFlexedBeyond90R }, extendedBeyond90: { L: p.kneesExtendedBeyond90L, R: p.kneesExtendedBeyond90R } },
        feet: { pronateEvert: { L: p.feetPronateEvertL, R: p.feetPronateEvertR }, supinateInv: { L: p.feetSupinateInvL, R: p.feetSupinateInvR }, dorsiflexed: { L: p.feetDorsiflexedL, R: p.feetDorsiflexedR }, plantarflexed: { L: p.feetPlantarflexedL, R: p.feetPlantarflexedR }, other: p.feetOther || undefined },
        spasticityNotes: p.spasticityNotes || undefined,
        generalNotes: p.generalNotes || undefined,
        diagnosis: p.diagnosis || undefined,
      },
    });
    if (["GOALS", "MEDICAL_HISTORY"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "POSTURAL_ASSESSMENT" });
    }
  };

  const handleSavePlan = async () => {
    await submitPlan.mutateAsync({
      id,
      dto: {
        treatmentFrom: planHeader.treatmentFrom || undefined,
        treatmentTo: planHeader.treatmentTo || undefined,
        anticipatedVisits: planHeader.anticipatedVisits ? Number(planHeader.anticipatedVisits) : undefined,
        physiotherapistId: planHeader.physiotherapistId || undefined,
        caseManagerId: planHeader.caseManagerId || undefined,
        modalities: planModalities.length ? planModalities : undefined,
        otherModality: planModalities.includes("OTHER") ? (planOtherModality || undefined) : undefined,
        remarks: planRemarks || undefined,
        observation: planObservation || undefined,
        status: planStatus,
      },
    });
    if (["POSTURAL_ASSESSMENT", "GOALS"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "TREATMENT_PLAN" });
    }
  };

  const handleSupervisorReview = async () => {
    await supervisorRev.mutateAsync({
      id,
      dto: { supervisorGaze: supervisorGaze || undefined },
    });
  };

  const handleSign = async (base64: string) => {
    await signPlan.mutateAsync({ id, signatureBase64: base64 });
  };

  const handleAddSession = async () => {
    if (!sessionForm.date) return;
    if (!c.physiotherapistId) {
      toast.error("لم يتم تعيين معالج فيزيائي للحالة");
      return;
    }
    await addSession.mutateAsync({
      id,
      dto: {
        sessionDate: sessionForm.date,
        physiotherapistId: c.physiotherapistId,
        time: sessionForm.time || undefined,
        modalitiesApplied: sessionForm.modalities,
        notes: sessionForm.notes || undefined,
        painLevel: sessionForm.painLevel
          ? parseInt(sessionForm.painLevel)
          : undefined,
      },
    });
    setSessionForm({
      date: new Date().toISOString().slice(0, 10),
      time: "",
      notes: "",
      painLevel: "",
      modalities: [],
    });
  };

  const toggleArr = <T extends string>(
    arr: T[],
    val: T,
    set: (a: T[]) => void,
  ) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const statusOrder: PhysioStatus[] = [
    "INTAKE",
    "COMPLAINT",
    "PAIN_MAP",
    "MEDICAL_HISTORY",
    "GOALS",
    "POSTURAL_ASSESSMENT",
    "TREATMENT_PLAN",
    "SUPERVISOR_REVIEW",
    "DOCTOR_SIGN",
    "ACTIVE_TREATMENT",
  ];
  const defaultTab = (() => {
    if (["COMPLETED", "DISCHARGED", "CANCELLED"].includes(c.status))
      return "timeline";
    if (c.status === "ACTIVE_TREATMENT") return "sessions";
    if (c.status === "SUPERVISOR_REVIEW") return "supervisor_review";
    if (c.status === "DOCTOR_SIGN") return "doctor_sign";
    return c.status.toLowerCase();
  })();

  const canEdit = !["COMPLETED", "DISCHARGED", "CANCELLED"].includes(c.status);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() =>
              c.patientId
                ? router.push(`/${locale}/clinic/patients/${c.patientId}`)
                : router.back()
            }
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {patientName}
            {c.patient?.patientNumber && (
              <span className="font-mono">— {c.patient.patientNumber}</span>
            )}
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">حالة علاج فيزيائي</h1>
            {c.caseNumber && (
              <span className="text-sm font-mono text-muted-foreground">
                {c.caseNumber}
              </span>
            )}
            <CaseStatusBadge status={c.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <PdfExportButton type="physio-case" id={id} size="sm" />
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate({ id, status: "CANCELLED" })}
              className="text-destructive"
            >
              إلغاء الحالة
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="intake">الاستقبال</TabsTrigger>
          <TabsTrigger value="complaint">الشكوى</TabsTrigger>
          <TabsTrigger value="pain_map">خريطة الألم</TabsTrigger>
          <TabsTrigger value="medical_history">التاريخ الطبي</TabsTrigger>
          <TabsTrigger value="goals">الأهداف</TabsTrigger>
          <TabsTrigger value="postural_assessment">التقييم الوضعي</TabsTrigger>
          <TabsTrigger value="treatment_plan">خطة العلاج</TabsTrigger>
          <TabsTrigger value="evaluation">الملاحظات والتقييم</TabsTrigger>
          <TabsTrigger value="supervisor_review">رئيس القسم</TabsTrigger>
          <TabsTrigger value="doctor_sign">توقيع الطبيب</TabsTrigger>
          <TabsTrigger value="sessions">
            الجلسات ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">السجل الزمني</TabsTrigger>
        </TabsList>

        {/* ── INTAKE ─────────────────────────────────────────────────────── */}
        <TabsContent value="intake" className="mt-4">
          <Section title="استقبال المريض">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                المريض: <strong>{patientName}</strong>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نوع الشكاية المرضية / Type of medical complaint</Label>
                  <Input
                    value={complaint.complaintType}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintType: e.target.value,
                      }))
                    }
                    placeholder="نوع الشكاية..."
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>تحديد مكان الألم / Locating the Pain</Label>
                  <Input
                    value={complaint.painLocation}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        painLocation: e.target.value,
                      }))
                    }
                    placeholder="مكان الألم..."
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    منذ متى وأنت تعاني من الشكاية؟ /how long have you been
                    suffering from the complaint؟
                  </Label>
                  <Input
                    value={complaint.complaintDuration}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintDuration: e.target.value,
                      }))
                    }
                    placeholder="مثال: منذ 3 أشهر..."
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ملاحظات / Notes</Label>
                  <Input
                    value={complaint.complaintNotes}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintNotes: e.target.value,
                      }))
                    }
                    placeholder="ملاحظات إضافية..."
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={complaint.hasChronicDiseases}
                      onCheckedChange={(v) =>
                        setComplaint((f) => ({
                          ...f,
                          hasChronicDiseases: v,
                          chronicDiseasesDetail: v
                            ? f.chronicDiseasesDetail
                            : "",
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <Label>
                      هل يوجد أمراض مزمنة؟ / are there Chronic Diseases؟
                    </Label>
                  </div>
                  {complaint.hasChronicDiseases && (
                    <Input
                      value={complaint.chronicDiseasesDetail}
                      onChange={(e) =>
                        setComplaint((f) => ({
                          ...f,
                          chronicDiseasesDetail: e.target.value,
                        }))
                      }
                      placeholder="اذكر الأمراض المزمنة... / Please specify..."
                      disabled={!canEdit}
                      className="mr-9"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={complaint.visitedSpecialist}
                      onCheckedChange={(v) =>
                        setComplaint((f) => ({
                          ...f,
                          visitedSpecialist: v,
                          specialistReason: v ? f.specialistReason : "",
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <Label>
                      هل سبق وقمت بزيارة طبيباً مختصاً؟ /have you ever visited a
                      specialist doctor؟
                    </Label>
                  </div>
                  {complaint.visitedSpecialist && (
                    <Input
                      value={complaint.specialistReason}
                      onChange={(e) =>
                        setComplaint((f) => ({
                          ...f,
                          specialistReason: e.target.value,
                        }))
                      }
                      placeholder="السبب / Reason..."
                      disabled={!canEdit}
                      className="mr-9"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={complaint.hadPreviousPT}
                      onCheckedChange={(v) =>
                        setComplaint((f) => ({
                          ...f,
                          hadPreviousPT: v,
                          previousPTDetail: v ? f.previousPTDetail : "",
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <Label>
                      هل خضعت لجلسات علاج فيزيائي سابقاً؟ / have you undergone
                      any physical therapy sessions before؟
                    </Label>
                  </div>
                  {complaint.hadPreviousPT && (
                    <Input
                      value={complaint.previousPTDetail}
                      onChange={(e) =>
                        setComplaint((f) => ({
                          ...f,
                          previousPTDetail: e.target.value,
                        }))
                      }
                      placeholder="التفاصيل / Details..."
                      disabled={!canEdit}
                      className="mr-9"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={complaint.hadSurgery}
                      onCheckedChange={(v) =>
                        setComplaint((f) => ({
                          ...f,
                          hadSurgery: v,
                          surgeryDetail: v ? f.surgeryDetail : "",
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <Label>
                      هل سبق أن خضعت لعمل جراحي ؟ / Have you undergone surgery؟
                    </Label>
                  </div>
                  {complaint.hadSurgery && (
                    <Input
                      value={complaint.surgeryDetail}
                      onChange={(e) =>
                        setComplaint((f) => ({
                          ...f,
                          surgeryDetail: e.target.value,
                        }))
                      }
                      placeholder="التفاصيل / Details..."
                      disabled={!canEdit}
                      className="mr-9"
                    />
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveIntake}
                    disabled={
                      submitComplaint.isPending || updateStatus.isPending
                    }
                    variant="outline"
                    className="gap-2"
                  >
                    {submitComplaint.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    حفظ
                  </Button>
                  {c.status === "INTAKE" && (
                    <Button
                      onClick={() =>
                        updateStatus.mutate({ id, status: "COMPLAINT" })
                      }
                      disabled={updateStatus.isPending}
                      className="gap-2"
                    >
                      بدء تسجيل الشكوى
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── COMPLAINT ──────────────────────────────────────────────────── */}
        <TabsContent value="complaint" className="mt-4 space-y-4">
          <Section title="الشكوى الرئيسية">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    ماهي شكواك الرئيسية؟ / What is your major complaint؟
                  </Label>
                  <Textarea
                    rows={2}
                    value={complaint.majorComplaint}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        majorComplaint: e.target.value,
                      }))
                    }
                    placeholder="وصف الشكوى الرئيسية..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ماهي الأعراض التي تعاني منها؟ / Symptoms؟</Label>
                  <Textarea
                    rows={2}
                    value={complaint.symptoms}
                    onChange={(e) =>
                      setComplaint((f) => ({ ...f, symptoms: e.target.value }))
                    }
                    placeholder="الأعراض المصاحبة..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ البدء / Start Date</Label>
                  <Input
                    type="date"
                    value={complaint.complaintStartDate}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintStartDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>السبب المحتمل / Possible Cause</Label>
                  <Input
                    value={complaint.possibleCause}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        possibleCause: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    تمت زيارة الطبيب السابق بسبب الشكوى / Previous doctor seen
                    for complaint
                  </Label>
                  <Input
                    value={complaint.previousDoctorSeen}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        previousDoctorSeen: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    العلاج السابق للشكوى / Previous treatment for complaint
                  </Label>
                  <Input
                    value={complaint.previousTreatment}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        previousTreatment: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>مستوى الألم الحالي / Current level of pain</Label>
                  <Select
                    value={complaint.painLevel}
                    onValueChange={(v) =>
                      setComplaint((f) => ({ ...f, painLevel: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MILD">خفيف / Mild</SelectItem>
                      <SelectItem value="MODERATE">متوسط / Moderate</SelectItem>
                      <SelectItem value="SEVERE">شديد / Severe</SelectItem>
                      <SelectItem value="EXCRUCIATING">
                        لا يُحتمل / Excruciating
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>نوع الألم / Type of the pain</Label>
                  <Select
                    value={complaint.painDuration}
                    onValueChange={(v) =>
                      setComplaint((f) => ({ ...f, painDuration: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERMITTENT">
                        متقطع / Intermittent
                      </SelectItem>
                      <SelectItem value="CONSTANT">مستمر / Constant</SelectItem>
                      <SelectItem value="WITH_CERTAIN_MOTIONS">
                        مع حركات معينة / With certain motions
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    {" "}
                    في أي وقت من اليوم تكون الأعراض أقل إزعاجاً/ In what part of
                    the day are the symptoms less bothersome
                  </Label>
                  <Select
                    value={complaint.bestTimeOfDay}
                    onValueChange={(v) =>
                      setComplaint((f) => ({ ...f, bestTimeOfDay: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ["MORNING", "صباحاً / Morning"],
                        ["AFTERNOON", "ظهراً / Afternoon"],
                        ["EVENING", "مساءً / Evening"],
                        ["NIGHT", "ليلاً / Night"],
                        ["ALL_DAY", "طوال اليوم / All Day"],
                      ].map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {" "}
                    في أي وقت من اليوم تكون الأعراض أكثر إزعاجاً / In what part
                    of the day are the symptoms more bothersome
                  </Label>
                  <Select
                    value={complaint.worstTimeOfDay}
                    onValueChange={(v) =>
                      setComplaint((f) => ({ ...f, worstTimeOfDay: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ["MORNING", "صباحاً / Morning"],
                        ["AFTERNOON", "ظهراً / Afternoon"],
                        ["EVENING", "مساءً / Evening"],
                        ["NIGHT", "ليلاً / Night"],
                        ["ALL_DAY", "طوال اليوم / All Day"],
                      ].map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    هل يتحسن الألم أم يزداد سوءاً؟ / Is your pain getting better
                    or worse؟
                  </Label>
                  <Select
                    value={complaint.painProgression}
                    onValueChange={(v) =>
                      setComplaint((f) => ({ ...f, painProgression: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BETTER">يتحسن / Better</SelectItem>
                      <SelectItem value="WORSE">يزداد سوءاً / Worse</SelectItem>
                      <SelectItem value="SAME">ثابت / Same</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={complaint.hadPreviousInjury}
                    onCheckedChange={(v) =>
                      setComplaint((f) => ({ ...f, hadPreviousInjury: v }))
                    }
                  />
                  <Label>
                    هل سبق التعرض لهذه الإصابة؟ / Have you had this injury
                    before؟
                  </Label>
                </div>
              </div>

              {canEdit && (
                <Button
                  onClick={handleSaveComplaint}
                  disabled={updateCase.isPending || updateStatus.isPending}
                  className="w-full gap-2"
                >
                  {updateCase.isPending || updateStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ الشكوى والانتقال لخريطة الألم
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── PAIN MAP ───────────────────────────────────────────────────── */}
        <TabsContent value="pain_map" className="mt-4 space-y-4">
          <Section title="خريطة الألم">
            <BodyPainMap
              points={painRegions as any}
              onChange={(pts) => setPainRegions(pts as any)}
              readonly={!canEdit}
            />
          </Section>
          <Section title="أنواع الألم">
            <div className="flex flex-wrap gap-2">
              {[
                ["NUMBNESS", "خدر / Numbness"],
                ["DULL_ACHE", "ألم خفيف / Dull Ache"],
                ["HOT_BURNING", "حارق / Hot Burning"],
                ["SHARP_STABBING", "حاد / Sharp Stabbing"],
                ["PINS", "واخز / Pins & Needles"],
                ["OTHER", "آخر / Other"],
              ].map(([v, l]) => (
                <ToggleChip
                  key={v}
                  label={l}
                  active={painTypes.includes(v)}
                  onClick={() => toggleArr(painTypes, v, setPainTypes)}
                />
              ))}
            </div>
            {painTypes.includes("OTHER") && (
              <Input
                className="mt-2"
                placeholder="حدد نوع الألم الآخر..."
                value={painTypeOther}
                onChange={(e) => setPainTypeOther(e.target.value)}
              />
            )}
          </Section>
          <Section title="العوامل المحرضة / المُخففة">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  العوامل المحرضة / Aggravating Factors
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["SITTING", "الجلوس / Sitting"],
                    ["HEAT", "الحرارة / Heat"],
                    ["COLD", "البرودة / Cold"],
                    ["COUGHING", "السعال / Coughing"],
                    ["WALKING", "المشي / Walking"],
                    ["EXERCISE", "التمرين / Exercise"],
                    ["LYING_DOWN", "الاستلقاء / Lying Down"],
                    ["OTHER", "آخر / Other"],
                  ].map(([v, l]) => (
                    <ToggleChip
                      key={v}
                      label={l}
                      active={aggravatingFactors.includes(v)}
                      onClick={() =>
                        toggleArr(aggravatingFactors, v, setAggravatingFactors)
                      }
                    />
                  ))}
                </div>
                {aggravatingFactors.includes("OTHER") && (
                  <Input
                    placeholder="حدد العامل المُشدد الآخر..."
                    value={aggravatingOther}
                    onChange={(e) => setAggravatingOther(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  العوامل المُخففة / Alleviating Factors
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["SITTING", "الجلوس / Sitting"],
                    ["HEAT", "الحرارة / Heat"],
                    ["COLD", "البرودة / Cold"],
                    ["COUGHING", "السعال / Coughing"],
                    ["WALKING", "المشي / Walking"],
                    ["EXERCISE", "التمرين / Exercise"],
                    ["LYING_DOWN", "الاستلقاء / Lying Down"],
                    ["OTHER", "آخر / Other"],
                  ].map(([v, l]) => (
                    <ToggleChip
                      key={v}
                      label={l}
                      active={alleviatingFactors.includes(v)}
                      onClick={() =>
                        toggleArr(alleviatingFactors, v, setAlleviatingFactors)
                      }
                    />
                  ))}
                </div>
                {alleviatingFactors.includes("OTHER") && (
                  <Input
                    placeholder="حدد العامل المُخفف الآخر..."
                    value={alleviatingOther}
                    onChange={(e) => setAlleviatingOther(e.target.value)}
                  />
                )}
              </div>
            </div>
          </Section>
          {canEdit && (
            <Button
              onClick={handleSavePainMap}
              disabled={
                submitPainMap.isPending ||
                updateCase.isPending ||
                updateStatus.isPending
              }
              className="w-full gap-2"
            >
              {submitPainMap.isPending || updateCase.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ والانتقال للتاريخ الطبي
            </Button>
          )}
        </TabsContent>

        {/* ── MEDICAL HISTORY ─────────────────────────────────────────────── */}
        <TabsContent value="medical_history" className="mt-4 space-y-4">
          <Section title="التاريخ الطبي / Medical History">
            <div className="space-y-4">
              {/* نمط الحياة */}
              <div className="space-y-1.5">
                <Label>نمط الحياة / Life Type</Label>
                <Select
                  value={history.lifeType}
                  onValueChange={(v) =>
                    setHistory((h) => ({ ...h, lifeType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEDENTARY">
                      الحياة الخاملة / Sedentary Life
                    </SelectItem>
                    <SelectItem value="NORMAL">
                      الحياة الطبيعية / Normal Life
                    </SelectItem>
                    <SelectItem value="ABNORMAL">
                      غير اعتيادي / غير صحي / Abnormal
                    </SelectItem>
                    <SelectItem value="PROFESSIONAL">
                      رياضي / Professional
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* هل تدخن */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل تدخن؟ / Do you smoke؟</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.smokes}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, smokes: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.smokes && (
                  <div className="mr-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        هل سبق أن دخنت؟ / Have you ever smoked؟
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          لا
                        </span>
                        <Switch
                          checked={history.hasSmokedBefore}
                          onCheckedChange={(v) =>
                            setHistory((h) => ({ ...h, hasSmokedBefore: v }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs text-muted-foreground">
                          نعم
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">عدد المرات / How often?</Label>
                      <Input
                        value={history.smokingFrequency}
                        onChange={(e) =>
                          setHistory((h) => ({
                            ...h,
                            smokingFrequency: e.target.value,
                          }))
                        }
                        placeholder="مثال: 10 سجائر يومياً"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* جهاز تنظيم ضربات القلب */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل لديك جهاز تنظيم ضربات القلب؟ / Do you have a pacemaker؟
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.hasPacemaker}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, hasPacemaker: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hasPacemaker && (
                  <Input
                    className="mr-4"
                    value={history.pacemakerDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        pacemakerDetail: e.target.value,
                      }))
                    }
                    placeholder="حدد نوع الجهاز..."
                    disabled={!canEdit}
                  />
                )}
              </div>

              {/* الحساسية */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>الحساسية / Allergies</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      حساسية لاصق
                    </span>
                    <Switch
                      checked={history.adhesiveAllergy}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, adhesiveAllergy: v }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <Input
                  value={history.allergies}
                  onChange={(e) =>
                    setHistory((h) => ({ ...h, allergies: e.target.value }))
                  }
                  placeholder="اذكر نوع الحساسية..."
                  disabled={!canEdit}
                />
              </div>

              {/* ما هي الأدوية الحالية */}
              <div className="space-y-1.5">
                <Label>
                  ما هي الأدوية التي تستخدمها حالياً؟ / What medications are you
                  currently using؟
                </Label>
                <Input
                  value={history.currentMedications}
                  onChange={(e) =>
                    setHistory((h) => ({
                      ...h,
                      currentMedications: e.target.value,
                    }))
                  }
                  placeholder="اذكر الأدوية..."
                  disabled={!canEdit}
                />
              </div>

              {/* هل أنت حامل */}
              <div className="flex items-center justify-between">
                <Label>هل أنت حامل؟ / Are you pregnant؟</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">لا</span>
                  <Switch
                    checked={history.isPregnant}
                    onCheckedChange={(v) =>
                      setHistory((h) => ({ ...h, isPregnant: v }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="text-xs text-muted-foreground">نعم</span>
                </div>
              </div>

              {/* التشخيصات السابقة / الأدوية السابقة */}
              <div className="space-y-1.5">
                <Label>
                  التشخيصات السابقة / الأدوية السابقة / Previous diagnoses /
                  medications
                </Label>
                <Textarea
                  rows={2}
                  value={history.previousDiagnoses}
                  onChange={(e) =>
                    setHistory((h) => ({
                      ...h,
                      previousDiagnoses: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              </div>

              {/* الشكاوى والعمليات السابقة */}
              <div className="space-y-1.5">
                <Label>
                  الشكاوى والعمليات السابقة / Previous complaints & surgeries
                </Label>
                <Textarea
                  rows={2}
                  value={history.previousComplaintsSurgeries}
                  onChange={(e) =>
                    setHistory((h) => ({
                      ...h,
                      previousComplaintsSurgeries: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              </div>

              {/* مشاكل صحية أخرى */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل تعاني من مشاكل صحية أخرى؟ / Do you have other health
                    problems؟
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.hasOtherHealthProblems}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, hasOtherHealthProblems: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hasOtherHealthProblems && (
                  <Input
                    className="mr-4"
                    value={history.otherConditions}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        otherConditions: e.target.value,
                      }))
                    }
                    placeholder="حدد المشاكل الصحية..."
                    disabled={!canEdit}
                  />
                )}
              </div>

              {/* تعليمات طبيب */}
              <div className="space-y-1.5">
                <Label>
                  هل هناك أي شيء نصحك طبيبك بعدم القيام به؟ / Is there anything
                  your doctor told you not to do؟
                </Label>
                <Input
                  value={history.doctorRestrictions}
                  onChange={(e) =>
                    setHistory((h) => ({
                      ...h,
                      doctorRestrictions: e.target.value,
                    }))
                  }
                  placeholder="اذكر التعليمات..."
                  disabled={!canEdit}
                />
              </div>

              {/* أدوية بوصفة */}
              <div className="flex items-center justify-between">
                <Label>
                  هل تتناول حالياً أي أدوية بوصفة طبية أو بدون وصفة؟ / Are you
                  currently taking any prescription / over-counter drugs؟
                </Label>
                <div className="flex items-center gap-2 shrink-0 mr-2">
                  <span className="text-xs text-muted-foreground">لا</span>
                  <Switch
                    checked={history.prescriptionDrugs}
                    onCheckedChange={(v) =>
                      setHistory((h) => ({ ...h, prescriptionDrugs: v }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="text-xs text-muted-foreground">نعم</span>
                </div>
              </div>

              {/* مستحضرات عشبية */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل تتناول حالياً أي مستحضرات عشبية أو فيتامينات؟ / Are you
                    currently taking any herbal preparations / vitamins؟
                  </Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.herbalSupplements}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, herbalSupplements: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.herbalSupplements && (
                  <Input
                    className="mr-4"
                    value={history.supplementsList}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        supplementsList: e.target.value,
                      }))
                    }
                    placeholder="حدد المستحضرات والفيتامينات..."
                    disabled={!canEdit}
                  />
                )}
              </div>
            </div>
          </Section>

          <Section title="العلاج الطبيعي والعلاجات الأخرى / PT & Other Treatments">
            <div className="space-y-4">
              {/* علاج طبيعي لنفس المشكلة */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل خضعت للعلاج الطبيعي لنفس المشكلة؟ / Have you had physical
                    therapy for the same problem؟
                  </Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.hadPTSameProblem}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, hadPTSameProblem: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hadPTSameProblem && (
                  <Input
                    className="mr-4"
                    value={history.ptSameProblemDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        ptSameProblemDetail: e.target.value,
                      }))
                    }
                    placeholder="اذكر التفاصيل..."
                    disabled={!canEdit}
                  />
                )}
              </div>

              {/* علاجات أخرى حالياً */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل تتلقى علاجات أخرى لهذه المشكلة في هذا الوقت؟ / Are you
                    receiving other treatments for this problem at this time؟
                  </Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.receivingOtherTreatment}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({
                          ...h,
                          receivingOtherTreatment: v,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.receivingOtherTreatment && (
                  <Input
                    className="mr-4"
                    value={history.otherTreatmentDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        otherTreatmentDetail: e.target.value,
                      }))
                    }
                    placeholder="اذكر العلاجات الأخرى..."
                    disabled={!canEdit}
                  />
                )}
              </div>
            </div>
          </Section>
          <Section title="الأمراض المزمنة (30 مرض)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {CHRONIC_CONDITIONS.map((cond) => (
                <label
                  key={cond}
                  htmlFor={`cc-${cond}`}
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id={`cc-${cond}`}
                    checked={chronicConditions.includes(cond)}
                    onChange={() =>
                      toggleArr(chronicConditions, cond, setChronicConditions)
                    }
                    disabled={!canEdit}
                    className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                  />
                  <span className="text-sm leading-snug">
                    {CHRONIC_CONDITION_LABELS[cond]}
                  </span>
                </label>
              ))}
            </div>
          </Section>
          <Section title="الفحوصات والتحاليل / Tests & Analysis">
            <div className="space-y-4">
              {/* نوع التصوير الشعاعي */}
              <div className="space-y-2">
                <Label className="block">
                  ما هو نوع التصوير الشعاعي الذي قمت به لتشخيص حالتك؟ / What
                  type of radiography did you undergo؟
                </Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(TEST_LABELS) as [TestType, string][]).map(
                    ([t, l]) => (
                      <ToggleChip
                        key={t}
                        label={l}
                        active={testsHad.includes(t)}
                        onClick={() => toggleArr(testsHad, t, setTestsHad)}
                      />
                    ),
                  )}
                </div>
                {testsHad.includes("OTHER") && (
                  <Input
                    value={history.testsOther}
                    onChange={(e) =>
                      setHistory((h) => ({ ...h, testsOther: e.target.value }))
                    }
                    placeholder="حدد نوع الفحص الآخر..."
                    disabled={!canEdit}
                  />
                )}
              </div>

              {/* نتائج */}
              <div className="space-y-1.5">
                <Label>نتائج / Results</Label>
                <Textarea
                  rows={2}
                  value={history.testResults}
                  onChange={(e) =>
                    setHistory((h) => ({ ...h, testResults: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>

              {/* ماهي التحاليلات */}
              <Label className="block font-medium">
                ماهي التحاليلات التي تم اجراؤها لمشكلتك الحالية؟ / What analysis
                have been done for your current problem؟
              </Label>

              {/* تحليل جديد */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">تحليل جديد / New analysis</Label>
                  <Input
                    value={history.newAnalysis}
                    onChange={(e) =>
                      setHistory((h) => ({ ...h, newAnalysis: e.target.value }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    تاريخ التحليل الجديد / New analysis date
                  </Label>
                  <Input
                    type="date"
                    value={history.newAnalysisDate}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        newAnalysisDate: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">تحليل قديم / Old analysis</Label>
                  <Input
                    value={history.oldAnalysis}
                    onChange={(e) =>
                      setHistory((h) => ({ ...h, oldAnalysis: e.target.value }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    تاريخ التحليل القديم / Old analysis date
                  </Label>
                  <Input
                    type="date"
                    value={history.oldAnalysisDate}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        oldAnalysisDate: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* مرفقات التحاليل */}
              <div className="grid grid-cols-2 gap-3">
                {(["new", "old"] as const).map((kind) => {
                  const label =
                    kind === "new"
                      ? "مرفق التحليل الجديد"
                      : "مرفق التحليل القديم";
                  const attachKey =
                    kind === "new"
                      ? "newAnalysisAttachment"
                      : "oldAnalysisAttachment";
                  const url = history[attachKey];
                  const isUploading = attachmentUploading === kind;
                  return (
                    <div key={kind} className="space-y-1.5">
                      <Label className="text-sm">{label}</Label>
                      {url ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline truncate flex-1"
                          >
                            عرض الملف
                          </a>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() =>
                                setHistory((h) => ({ ...h, [attachKey]: "" }))
                              }
                            >
                              حذف
                            </Button>
                          )}
                        </div>
                      ) : (
                        <label
                          className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm cursor-pointer transition-colors ${isUploading ? "opacity-50 pointer-events-none" : "hover:bg-muted"}`}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {isUploading ? "جاري الرفع..." : "اختر ملف"}
                          <input
                            type="file"
                            className="hidden"
                            disabled={!canEdit || !!attachmentUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !c.patientId) return;
                              setAttachmentUploading(kind);
                              try {
                                const doc =
                                  await clinicPatientsApi.uploadDocument(
                                    c.patientId,
                                    file,
                                    "MEDICAL_REPORT",
                                  );
                                setHistory((h) => ({
                                  ...h,
                                  [attachKey]: doc.url ?? doc.filePath ?? "",
                                }));
                              } catch {
                                toast.error("فشل رفع الملف");
                              } finally {
                                setAttachmentUploading(null);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* قياس كثافة العظام */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>قياس كثافة العظام / Bone density scan / test</Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.boneDensityTest}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, boneDensityTest: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.boneDensityTest && (
                  <Input
                    className="mr-4"
                    value={history.boneDensityDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        boneDensityDetail: e.target.value,
                      }))
                    }
                    placeholder="حدد التفاصيل..."
                    disabled={!canEdit}
                  />
                )}
              </div>

              {/* هل سبق دخول المستشفى */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل سبق لك أن دخلت المستشفى خلال العام الماضي بسبب هذه
                    الحالة؟ / Have you been hospitalized in the past year for
                    this condition؟
                  </Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.hospitalizedLastYear}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, hospitalizedLastYear: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hospitalizedLastYear && (
                  <Input
                    className="mr-4"
                    value={history.hospitalizedDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        hospitalizedDetail: e.target.value,
                      }))
                    }
                    placeholder="اذكر التفاصيل..."
                    disabled={!canEdit}
                  />
                )}
              </div>
            </div>
          </Section>
          <Section title="العمليات الجراحية (حتى 5)">
            <div className="space-y-3">
              {surgeries.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {" "}
                      اسم العملية الجراحية / surgery name {i + 1}
                    </Label>
                    <Input
                      value={s.name}
                      onChange={(e) =>
                        setSurgeries((arr) =>
                          arr.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="العملية..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">النوع / type</Label>
                    <Input
                      value={s.type}
                      onChange={(e) =>
                        setSurgeries((arr) =>
                          arr.map((x, j) =>
                            j === i ? { ...x, type: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="نوع..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">التاريخ / date</Label>
                    <Input
                      type="date"
                      value={s.date}
                      onChange={(e) =>
                        setSurgeries((arr) =>
                          arr.map((x, j) =>
                            j === i ? { ...x, date: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
          {canEdit && (
            <Button
              onClick={handleSaveHistory}
              disabled={submitHistory.isPending || updateStatus.isPending}
              className="w-full gap-2"
            >
              {submitHistory.isPending || updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ والانتقال للأهداف
            </Button>
          )}
        </TabsContent>

        {/* ── GOALS ─────────────────────────────────────────────────────── */}
        <TabsContent value="goals" className="mt-4 space-y-4">
          <Section title="أهداف العلاج / Goals of Treatments">
            <div className="space-y-5">
              {/* Main goals chips */}
              <div>
                <Label className="mb-3 block text-sm font-medium">
                  ماهي الأهداف المرجوة من حضور جلسات العلاج الطبيعي؟ / What are
                  goals as a result of attending physical therapy?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PHYSIO_GOALS.map((g) => (
                    <ToggleChip
                      key={g}
                      label={PHYSIO_GOAL_LABELS[g]}
                      active={goals.includes(g)}
                      onClick={() => canEdit && toggleArr(goals, g, setGoals)}
                    />
                  ))}
                </div>
              </div>

              {goals.includes("OTHER") && (
                <div className="space-y-1.5">
                  <Label className="text-sm">أي شيء أخرى / Anything else</Label>
                  <Input
                    value={goalsExtra.customGoal}
                    onChange={(e) =>
                      setGoalsExtra((f) => ({
                        ...f,
                        customGoal: e.target.value,
                      }))
                    }
                    placeholder="اذكر الهدف..."
                    disabled={!canEdit}
                  />
                </div>
              )}

              <Separator />

              <div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {" "}
                  يرجى تحديد المربع المناسب/ Please check appropriate box
                </p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={goalsExtra.decreasePain}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          decreasePain: e.target.checked,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-sm">
                      تخفيف الألم / Decrease Pain{" "}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">
                      أطول فترة وقوف/ stand longer
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20 text-sm"
                      value={goalsExtra.standLongerMinutes}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          standLongerMinutes: e.target.value,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      دقائق / ساعات
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={goalsExtra.improveStrength}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          improveStrength: e.target.checked,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-sm">
                      تحسين القوة / Improve strength
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">
                      أطول فترة نوم / sleep longer
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20 text-sm"
                      value={goalsExtra.sleepLongerMinutes}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          sleepLongerMinutes: e.target.value,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      دقائق / ساعات
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={goalsExtra.lessDifficultyWork}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          lessDifficultyWork: e.target.checked,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-sm">
                      القيام ببعض الأنشطة / Less difficulty with work activities
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">
                      أطول فترة جلوس / hours sit longer
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20 text-sm"
                      value={goalsExtra.sitLongerMinutes}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          sitLongerMinutes: e.target.value,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      دقائق / ساعات
                    </span>
                  </div>

                  {/* <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={goalsExtra.improveMovement}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({
                          ...f,
                          improveMovement: e.target.checked,
                        }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-sm">
                      Improve movement / تحسين الحركة
                    </span>
                  </label> */}
                  <div />
                </div>
              </div>

              {/* <div className="space-y-1.5">
                <Label className="text-sm">أهداف أخرى / Other goals</Label>
                <Textarea
                  rows={2}
                  value={goalsExtra.otherGoals}
                  onChange={(e) =>
                    setGoalsExtra((f) => ({ ...f, otherGoals: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div> */}
            </div>
          </Section>
          {canEdit && (
            <Button
              onClick={handleSaveGoals}
              disabled={submitGoals.isPending || updateStatus.isPending}
              className="w-full gap-2"
            >
              {submitGoals.isPending || updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ والانتقال للتقييم الوضعي
            </Button>
          )}
        </TabsContent>

        {/* ── POSTURAL ASSESSMENT ─────────────────────────────────────────── */}
        <TabsContent value="postural_assessment" className="mt-4 space-y-4">
          {/* Seated position + trunk control */}
          <div className="rounded-lg border bg-card p-4 space-y-4" dir="rtl">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                الوضعية الحالية للجلوس (حسب أفضل تقييم مع - ملاحظة الوضعيات
                الثابتة)/ Current seated position (as best evaluated - note
                fixed positions)
              </Label>
              <Input
                value={postural.seatedPosition}
                onChange={(e) =>
                  setPostural((p) => ({ ...p, seatedPosition: e.target.value }))
                }
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                التحكم في التوازن / الجذع/  Balance / Trunk Control

               
              </Label>
              <Input
                value={postural.trunkControl}
                onChange={(e) =>
                  setPostural((p) => ({ ...p, trunkControl: e.target.value }))
                }
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Head */}
          <Section title="الرأس / Head">
            <div className="space-y-2">
              {(
                [
                  ["headNeutral", "حيادي / Neutral"],
                  ["headHyperextended", "فرط البسط / Hyperextended"],
                  ["headFwdFlexed", "تقدم للأمام / Fwd. Flexed"],
                  ["headLaterallyFlexed", "عطف جانبي / Laterally Flexed"],
                ] as [string, string][]
              ).map(([k, lbl]) => (
                <label
                  key={k}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={(postural as any)[k]}
                    onChange={(e) =>
                      setPostural((p) => ({ ...p, [k]: e.target.checked }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm">دوران / Rotated</span>
                <div className="flex items-center gap-4">
                  {(["headRotatedL", "headRotatedR"] as const).map((k, i) => (
                    <label
                      key={k}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={postural[k]}
                        onChange={(e) =>
                          setPostural((p) => ({ ...p, [k]: e.target.checked }))
                        }
                        disabled={!canEdit}
                      />
                      <span className="text-xs font-medium">
                        {i === 0 ? "L" : "R"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Shoulders */}
          <Section title="الأكتاف / Shoulders">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={postural.shouldersLevel}
                  onChange={(e) =>
                    setPostural((p) => ({
                      ...p,
                      shouldersLevel: e.target.checked,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm">متساوية / Level</span>
              </label>
              {(
                [
                  [
                    "shouldersElevatedL",
                    "shouldersElevatedR",
                    "مرتفعة / Elevated",
                  ],
                  [
                    "shouldersSublaxedL",
                    "shouldersSublaxedR",
                    "غير مستقرة / Sublaxed",
                  ],
                ] as [string, string, string][]
              ).map(([kL, kR, lbl]) => (
                <div
                  key={kL}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm">{lbl}</span>
                  <div className="flex items-center gap-4">
                    {(
                      [
                        [kL, "L"],
                        [kR, "R"],
                      ] as [string, string][]
                    ).map(([k, side]) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={(postural as any)[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Elbow */}
          <Section title="المرفق / Elbow">
            <div className="space-y-2">
              {(
                [
                  ["elbowHyperextended", "فرط البسط / Hyperextended"],
                  ["elbowFlexed", "عطف / Flexed"],
                ] as [string, string][]
              ).map(([k, lbl]) => (
                <label
                  key={k}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={(postural as any)[k]}
                    onChange={(e) =>
                      setPostural((p) => ({ ...p, [k]: e.target.checked }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
              {(
                [
                  [
                    "elbowSupinationL",
                    "elbowSupinationR",
                    "استلقاء / Supination",
                  ],
                  ["elbowPronationL", "elbowPronationR", "كب / Pronation"],
                ] as [string, string, string][]
              ).map(([kL, kR, lbl]) => (
                <div
                  key={kL}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm">{lbl}</span>
                  <div className="flex items-center gap-4">
                    {(
                      [
                        [kL, "L"],
                        [kR, "R"],
                      ] as [string, string][]
                    ).map(([k, side]) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={(postural as any)[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Rib cage */}
          <Section title="القفص الصدري / Rib Cage">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={postural.ribCageNeutral}
                  onChange={(e) =>
                    setPostural((p) => ({
                      ...p,
                      ribCageNeutral: e.target.checked,
                    }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-sm">حيادي / Neutral</span>
              </label>
              {(
                [
                  ["ribCageElevatedL", "ribCageElevatedR", "مرتفع / Elevated"],
                  [
                    "ribCageRotatedFwdL",
                    "ribCageRotatedFwdR",
                    "تدوير للأمام / Rotated Fwd",
                  ],
                ] as [string, string, string][]
              ).map(([kL, kR, lbl]) => (
                <div
                  key={kL}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm">{lbl}</span>
                  <div className="flex items-center gap-4">
                    {(
                      [
                        [kL, "L"],
                        [kR, "R"],
                      ] as [string, string][]
                    ).map(([k, side]) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={(postural as any)[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Spine */}
          <Section title="العمود الفقري / Spine">
            <div className="space-y-2">
              {(
                [
                  ["spineNeutral", "حيادي / Neutral"],
                  ["spineKyphosis", "حداب / Kyphosis"],
                  ["spineFlatLumbar", "تسطح قطني / Flat lumbar space"],
                  ["spineNormalLumbar", "مسافة طبيعية / Normal lumbar space"],
                  ["spineHyperLordotic", "فرط تقعر / Hyper-lordotic"],
                ] as [string, string][]
              ).map(([k, lbl]) => (
                <label
                  key={k}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={(postural as any)[k]}
                    onChange={(e) =>
                      setPostural((p) => ({ ...p, [k]: e.target.checked }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm">جنف / Scoliosis, apex on</span>
                <div className="flex items-center gap-4">
                  {(
                    ["spineScoliosisApexL", "spineScoliosisApexR"] as const
                  ).map((k, i) => (
                    <label
                      key={k}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={postural[k]}
                        onChange={(e) =>
                          setPostural((p) => ({ ...p, [k]: e.target.checked }))
                        }
                        disabled={!canEdit}
                      />
                      <span className="text-xs font-medium">
                        {i === 0 ? "L" : "R"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Pelvis */}
          <Section title="الحوض / Pelvis">
            <div className="space-y-2">
              {(
                [
                  ["pelvisNeutral", "حيادي / Neutral"],
                  ["pelvisRotatedFwd", "دوران للأمام / Rotated Fwd"],
                  ["pelvisAnteriorTilt", "إمالة أمامية / Anterior Tilt"],
                  ["pelvisPosteriorTilt", "إمالة خلفية / Posterior Tilt"],
                ] as [string, string][]
              ).map(([k, lbl]) => (
                <label
                  key={k}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={(postural as any)[k]}
                    onChange={(e) =>
                      setPostural((p) => ({ ...p, [k]: e.target.checked }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm">ميل جانبي / Oblique</span>
                <div className="flex items-center gap-4">
                  {(["pelvisObliqueL", "pelvisObliqueR"] as const).map(
                    (k, i) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={postural[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">
                          {i === 0 ? "L" : "R"}
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">آخر / Other:</span>
                <Input
                  className="h-8 text-sm"
                  value={postural.pelvisOther}
                  onChange={(e) =>
                    setPostural((p) => ({ ...p, pelvisOther: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {/* Hips */}
          <Section title="الورك / Hip">
            <div className="space-y-2">
              {(
                [
                  [
                    "hipsAbductedL",
                    "hipsAbductedR",
                    "تبعيد (>90) / Abducted (beyond 90)",
                  ],
                  ["hipsAdductedL", "hipsAdductedR", "تقريب / Adducted"],
                  [
                    "hipsFlexedL",
                    "hipsFlexedR",
                    "عطف (>90) / Flexed (beyond 90)",
                  ],
                  ["hipsExtendedL", "hipsExtendedR", "بسط / Extended"],
                ] as [string, string, string][]
              ).map(([kL, kR, lbl]) => (
                <div
                  key={kL}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm">{lbl}</span>
                  <div className="flex items-center gap-4">
                    {(
                      [
                        [kL, "L"],
                        [kR, "R"],
                      ] as [string, string][]
                    ).map(([k, side]) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={(postural as any)[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Knees */}
          <Section title="الركبتان / Knees">
            <div className="space-y-2">
              {(
                [
                  [
                    "kneesFlexedBeyond90L",
                    "kneesFlexedBeyond90R",
                    "عطف >90° / Flexed (beyond 90)",
                  ],
                  [
                    "kneesExtendedBeyond90L",
                    "kneesExtendedBeyond90R",
                    "بسط >90° / Extended (beyond 90)",
                  ],
                ] as [string, string, string][]
              ).map(([kL, kR, lbl]) => (
                <div
                  key={kL}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm">{lbl}</span>
                  <div className="flex items-center gap-4">
                    {(
                      [
                        [kL, "L"],
                        [kR, "R"],
                      ] as [string, string][]
                    ).map(([k, side]) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={(postural as any)[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Feet */}
          <Section title="القدم / Feet">
            <div className="space-y-2">
              {(
                [
                  [
                    "feetPronateEvertL",
                    "feetPronateEvertR",
                    "كب/انقلاب خارجي / Pronate/Evert",
                  ],
                  [
                    "feetSupinateInvL",
                    "feetSupinateInvR",
                    "استلقاء/انقلاب داخلي / Supinate/Inv",
                  ],
                  [
                    "feetDorsiflexedL",
                    "feetDorsiflexedR",
                    "عطف ظهري / Dorsiflexed",
                  ],
                  [
                    "feetPlantarflexedL",
                    "feetPlantarflexedR",
                    "عطف أخمصي / Plantarflexed",
                  ],
                ] as [string, string, string][]
              ).map(([kL, kR, lbl]) => (
                <div
                  key={kL}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-sm">{lbl}</span>
                  <div className="flex items-center gap-4">
                    {(
                      [
                        [kL, "L"],
                        [kR, "R"],
                      ] as [string, string][]
                    ).map(([k, side]) => (
                      <label
                        key={k}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={(postural as any)[k]}
                          onChange={(e) =>
                            setPostural((p) => ({
                              ...p,
                              [k]: e.target.checked,
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs font-medium">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">آخر / Other:</span>
                <Input
                  className="h-8 text-sm"
                  value={postural.feetOther}
                  onChange={(e) =>
                    setPostural((p) => ({ ...p, feetOther: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {/* Notes */}
          <Section title="الملاحظات والتشخيص / Comments & Diagnosis">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  التشنج/ردود الفعل/التوتر العضلي / Spasticity / Reflexes / Tone
                </Label>
                <Textarea
                  rows={2}
                  value={postural.spasticityNotes}
                  onChange={(e) =>
                    setPostural((p) => ({
                      ...p,
                      spasticityNotes: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">تعليقات / Comments</Label>
                <Textarea
                  rows={2}
                  value={postural.generalNotes}
                  onChange={(e) =>
                    setPostural((p) => ({ ...p, generalNotes: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">تشخيص / Diagnosis</Label>
                <Input
                  value={postural.diagnosis}
                  onChange={(e) =>
                    setPostural((p) => ({ ...p, diagnosis: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {canEdit && (
            <Button
              onClick={handleSavePostural}
              disabled={submitPostural.isPending || updateStatus.isPending}
              className="w-full gap-2"
            >
              {submitPostural.isPending || updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ والانتقال لخطة العلاج
            </Button>
          )}
        </TabsContent>

        {/* ── TREATMENT PLAN ──────────────────────────────────────────────── */}
        <TabsContent value="treatment_plan" className="mt-4 space-y-4">

          {/* Header */}
          <Section title="رأس خطة العلاج / Plan Header">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">من / From</Label>
                <Input
                  type="date"
                  value={planHeader.treatmentFrom}
                  onChange={(e) => setPlanHeader((h) => ({ ...h, treatmentFrom: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">إلى / To</Label>
                <Input
                  type="date"
                  value={planHeader.treatmentTo}
                  onChange={(e) => setPlanHeader((h) => ({ ...h, treatmentTo: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">عدد الزيارات المتوقعة / Anticipated Visits</Label>
                <Input
                  type="number"
                  min={1}
                  value={planHeader.anticipatedVisits}
                  onChange={(e) => setPlanHeader((h) => ({ ...h, anticipatedVisits: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">اسم أخصائي العلاج الطبيعي / Physiotherapist</Label>
                <Input
                  value={planHeader.physiotherapistId}
                  onChange={(e) => setPlanHeader((h) => ({ ...h, physiotherapistId: e.target.value }))}
                  placeholder="ID المعالج..."
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">مدير الحالة / Case Manager</Label>
                <Input
                  value={planHeader.caseManagerId}
                  onChange={(e) => setPlanHeader((h) => ({ ...h, caseManagerId: e.target.value }))}
                  placeholder="ID مدير الحالة..."
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {/* Modalities — 2-col checkbox grid */}
          <Section title="الوسائل العلاجية المستخدمة / Modalities Used">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {THERAPY_MODALITY_PAIRS.flatMap(([right, left]) =>
                [right, left].map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                      checked={planModalities.includes(m)}
                      onChange={(e) => {
                        if (!canEdit) return;
                        setPlanModalities((prev) =>
                          e.target.checked ? [...prev, m] : prev.filter((x) => x !== m)
                        );
                      }}
                      disabled={!canEdit}
                    />
                    <span className="text-sm leading-tight">{THERAPY_MODALITY_LABELS[m]}</span>
                  </label>
                ))
              )}
            </div>
            {planModalities.includes("OTHER") && (
              <Input
                className="mt-3"
                placeholder="حدد الوسيلة العلاجية الأخرى..."
                value={planOtherModality}
                onChange={(e) => setPlanOtherModality(e.target.value)}
                disabled={!canEdit}
              />
            )}
          </Section>

          {/* Remarks + Observation + Status */}
          <Section title="الملاحظات والحالة / Remarks & Status">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">الملاحظة / Observation</Label>
                <Textarea
                  rows={3}
                  value={planObservation}
                  onChange={(e) => setPlanObservation(e.target.value)}
                  disabled={!canEdit}
                  placeholder="ملاحظات الحالة..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">تعليقات الخطة / Remarks</Label>
                <Textarea
                  rows={2}
                  value={planRemarks}
                  onChange={(e) => setPlanRemarks(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">حالة الخطة / Plan Status</p>
                  <p className="text-xs text-muted-foreground">
                    {planStatus === "ACTIVE" ? "نشط / Active" : "غير نشط / Inactive"}
                  </p>
                </div>
                <Switch
                  checked={planStatus === "ACTIVE"}
                  onCheckedChange={(v) => canEdit && setPlanStatus(v ? "ACTIVE" : "INACTIVE")}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {canEdit && ["POSTURAL_ASSESSMENT", "GOALS", "TREATMENT_PLAN", "MEDICAL_HISTORY"].includes(c.status) && (
            <Button
              onClick={handleSavePlan}
              disabled={submitPlan.isPending || updateStatus.isPending}
              className="w-full gap-2"
            >
              {submitPlan.isPending || updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ خطة العلاج
            </Button>
          )}

        </TabsContent>

        {/* ── SUPERVISOR REVIEW ───────────────────────────────────────────── */}
        {/* ── EVALUATION ──────────────────────────────────────────────────── */}
        <TabsContent value="evaluation" className="mt-4 space-y-4">
          <Section title="الملاحظات والتقييم / Observation and Evaluation">
            {/* Modalities grid — 2 columns matching paper form */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {EVAL_MODALITY_PAIRS.flatMap(([right, left]) =>
                [right, left].map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                      checked={evalModalities.includes(m)}
                      onChange={(e) => {
                        if (!canEdit) return;
                        setEvalModalities((prev) =>
                          e.target.checked
                            ? [...prev, m]
                            : prev.filter((x) => x !== m),
                        );
                      }}
                      disabled={!canEdit}
                    />
                    <span className="text-sm leading-tight">
                      {EVALUATION_MODALITY_LABELS[m]}
                    </span>
                  </label>
                )),
              )}
            </div>
            {evalModalities.includes("OTHER") && (
              <Input
                className="mt-3"
                placeholder="حدد الوسيلة العلاجية الأخرى..."
                value={evalOtherModality}
                onChange={(e) => setEvalOtherModality(e.target.value)}
                disabled={!canEdit}
              />
            )}
          </Section>

          <Section title="الملاحظات / Notes">
            <Textarea
              rows={4}
              placeholder="اكتب ملاحظاتك حول تقدم المريض..."
              value={evalNotes}
              onChange={(e) => setEvalNotes(e.target.value)}
              disabled={!canEdit}
            />
          </Section>

          <Section title="التقييم / Evaluation">
            <Textarea
              rows={4}
              placeholder="اكتب تقييمك للحالة..."
              value={evalText}
              onChange={(e) => setEvalText(e.target.value)}
              disabled={!canEdit}
            />
          </Section>

          {canEdit && (
            <Button
              onClick={async () => {
                await submitEval.mutateAsync({
                  id,
                  dto: {
                    modalities: evalModalities.length
                      ? evalModalities
                      : undefined,
                    otherModality: evalModalities.includes("OTHER")
                      ? evalOtherModality || undefined
                      : undefined,
                    notes: evalNotes || undefined,
                    evaluation: evalText || undefined,
                  },
                });
              }}
              disabled={submitEval.isPending}
              className="w-full gap-2"
            >
              {submitEval.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ الملاحظات والتقييم
            </Button>
          )}
        </TabsContent>

        <TabsContent value="supervisor_review" className="mt-4">
          <Section title="نظرة رئيس القسم">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>نظرة رئيس القسم / Supervisor Gaze</Label>
                <Textarea
                  rows={4}
                  value={supervisorGaze}
                  onChange={(e) => setSupervisorGaze(e.target.value)}
                  placeholder="رأي رئيس القسم وملاحظاته على خطة العلاج..."
                />
              </div>
              {c.status === "TREATMENT_PLAN" ? (
                <ActionGuard
                  permission={PERMISSIONS.CLINIC_PHYSIO.SUPERVISOR_REVIEW}
                >
                  <Button
                    onClick={handleSupervisorReview}
                    disabled={supervisorRev.isPending}
                    className="w-full gap-2"
                  >
                    {supervisorRev.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    اعتماد واتجاه لتوقيع الطبيب
                  </Button>
                </ActionGuard>
              ) : (
                !["COMPLETED", "DISCHARGED", "CANCELLED"].includes(
                  c.status,
                ) && (
                  <ActionGuard
                    permission={PERMISSIONS.CLINIC_PHYSIO.SUPERVISOR_REVIEW}
                  >
                    <Button
                      variant="outline"
                      onClick={handleSupervisorReview}
                      disabled={supervisorRev.isPending}
                      className="w-full gap-2"
                    >
                      {supervisorRev.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      حفظ الملاحظات
                    </Button>
                  </ActionGuard>
                )
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── DOCTOR SIGN ─────────────────────────────────────────────────── */}
        <TabsContent value="doctor_sign" className="mt-4">
          <Section title="توقيع الطبيب">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                التوقيع متاح بعد اعتماد رئيس القسم. يجب أن تكون الطبيب المشرف
                المعيّن.
              </p>
              {c.status === "SUPERVISOR_REVIEW" && (
                <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.PLAN_SIGN}>
                  <Button onClick={() => setSignOpen(true)} className="w-full">
                    توقيع خطة العلاج وبدء الجلسات
                  </Button>
                </ActionGuard>
              )}
              {[
                "DOCTOR_SIGN",
                "ACTIVE_TREATMENT",
                "COMPLETED",
                "DISCHARGED",
              ].includes(c.status) && (
                <p className="text-sm text-green-600 font-medium">
                  تمت عملية التوقيع — الحالة جاهزة للجلسات
                </p>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── SESSIONS ────────────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          {["ACTIVE_TREATMENT", "DOCTOR_SIGN"].includes(c.status) && (
            <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.SESSIONS_CREATE}>
              <Section title="إضافة جلسة">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={sessionForm.date}
                        onChange={(e) =>
                          setSessionForm((f) => ({
                            ...f,
                            date: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الوقت</Label>
                      <Input
                        type="time"
                        value={sessionForm.time}
                        onChange={(e) =>
                          setSessionForm((f) => ({
                            ...f,
                            time: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الوسائل المطبقة</Label>
                    <div className="flex flex-wrap gap-2">
                      {THERAPY_MODALITIES.map((m) => (
                        <ToggleChip
                          key={m}
                          label={THERAPY_MODALITY_LABELS[m]}
                          active={sessionForm.modalities.includes(m)}
                          onClick={() =>
                            toggleArr(sessionForm.modalities, m, (v) =>
                              setSessionForm((f) => ({ ...f, modalities: v })),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>شدة الألم (0-10)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={sessionForm.painLevel}
                        onChange={(e) =>
                          setSessionForm((f) => ({
                            ...f,
                            painLevel: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>ملاحظات</Label>
                      <Input
                        value={sessionForm.notes}
                        onChange={(e) =>
                          setSessionForm((f) => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddSession}
                      disabled={addSession.isPending}
                      className="flex-1 gap-2"
                    >
                      <Plus className="h-4 w-4" /> إضافة جلسة
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateStatus.mutate({ id, status: "COMPLETED" })
                      }
                      disabled={sessions.length === 0}
                    >
                      إنهاء الجلسات
                    </Button>
                  </div>
                </div>
              </Section>
            </ActionGuard>
          )}

          {sessions.length > 0 && (
            <Section title={`الجلسات السابقة (${sessions.length})`}>
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="font-medium text-sm">
                          {new Date(s.date).toLocaleDateString("ar")}
                        </span>
                        {s.time && (
                          <span className="text-xs text-muted-foreground">
                            {s.time}
                          </span>
                        )}
                        {s.painLevel != null && (
                          <Badge variant="outline" className="text-xs">
                            ألم: {s.painLevel}/10
                          </Badge>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          deleteSession.mutate({ id, sessionId: s.id })
                        }
                        className="text-destructive hover:opacity-70"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {s.modalitiesApplied.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.modalitiesApplied.map((m) => (
                          <Badge
                            key={m}
                            variant="secondary"
                            className="text-xs"
                          >
                            {THERAPY_MODALITY_LABELS[m as TherapyModality] ?? m}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {s.notes && (
                      <p className="text-xs text-muted-foreground">{s.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </TabsContent>

        {/* ── TIMELINE ────────────────────────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-4">
          <Section title="السجل الزمني">
            {timeline.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                لا توجد أحداث بعد
              </p>
            ) : (
              <div className="relative space-y-4 pr-4">
                <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-border" />
                {timeline.map((ev) => (
                  <div key={ev.id} className="relative flex gap-3">
                    <div className="absolute -right-4 top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    <div className="flex-1 rounded-lg border p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.date).toLocaleDateString("ar")}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground">
                          {ev.description}
                        </p>
                      )}
                      {ev.actorName && (
                        <p className="text-xs text-muted-foreground">
                          بواسطة: {ev.actorName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      <SignaturePadDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title="توقيع خطة العلاج"
        legalNotice="بتوقيعك تؤكد اعتماد خطة العلاج والموافقة على بدء الجلسات."
        onSign={handleSign}
        isLoading={signPlan.isPending}
      />
    </div>
  );
}
