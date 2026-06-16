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
  useUpdatePhysioSession,
  useSubmitFinalSummary,
  useDownloadFinalSummaryPdf,
  usePhysioTimeline,
} from "@/lib/hooks/use-clinic-physio";
import { useUsers } from "@/lib/hooks/use-users";
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
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const updateSessionMut = useUpdatePhysioSession();
  const submitFinalSummary = useSubmitFinalSummary();
  const downloadFinalPdf = useDownloadFinalSummaryPdf();

  const { data: usersData } = useUsers({ limit: 200 });
  const allUsers: { id: string; fullName: string }[] =
    (usersData as any)?.data?.items ?? (usersData as any)?.items ?? [];

  const { data: patientFull } = useClinicPatient(caseData?.patientId ?? "");

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
    hadPreviousInjury: "",
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
    adhesiveAllergyDetail: "",
    chronicConditionsOther: "",
    isPregnant: false,
    maritalStatus: "",
    lastMenstrualPeriod: "",
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
    hadSurgeries: false,
    surgeriesDetail: "",
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
    standLonger: "",
    sleepLonger: "",
    sitLonger: "",
    otherGoals: "",
  });

  // ── Postural assessment state ────────────────────────────────────────────────
  const [postural, setPostural] = useState({
    seatedPosition: "", trunkControl: "",
    headNeutral: false, headHyperextended: false, headFwdFlexed: false,
    headLaterallyFlexedL: false, headLaterallyFlexedR: false,
    headRotatedL: false, headRotatedR: false,
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
    sessionTime: "",
    notes: "",
  });
  const [editingSession, setEditingSession] = useState<{ id: string; sessionDate: string; sessionTime: string; notes: string; supervisorOpinion: string; doctorDecision: string } | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [finalSummary, setFinalSummary] = useState("");

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
      complaintStartDate: caseData.complaintStartDate ?? "",
      possibleCause: caseData.possibleCause ?? "",
      previousDoctorSeen: caseData.previousDoctorSeen ?? "",
      previousTreatment: caseData.previousTreatment ?? "",
      painLevel: caseData.painLevel ?? "",
      painDuration: caseData.painDuration ?? "",
      painProgression: caseData.painProgression ?? "",
      hadPreviousInjury: caseData.hadPreviousInjury ?? "",
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
        adhesiveAllergyDetail: mh.adhesiveAllergyDetail ?? "",
        chronicConditionsOther: mh.chronicConditionsOther ?? "",
        isPregnant: mh.isPregnant ?? false,
        maritalStatus: mh.maritalStatus ?? "",
        lastMenstrualPeriod: mh.lastMenstrualPeriod ?? "",
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
        hadSurgeries: mh.hadSurgeries ?? false,
        surgeriesDetail: mh.surgeriesDetail ?? "",
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
        standLonger: g.standLonger ?? "",
        sleepLonger: g.sleepLonger ?? "",
        sitLonger: g.sitLonger ?? "",
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
        headLaterallyFlexedL: pa.head?.laterallyFlexed?.L ?? false,
        headLaterallyFlexedR: pa.head?.laterallyFlexed?.R ?? false,
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

    // Final summary
    if (caseData.finalSummary) setFinalSummary(caseData.finalSummary);

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
        hadPreviousInjury: complaint.hadPreviousInjury || undefined,
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
        adhesiveAllergyDetail: history.adhesiveAllergy
          ? history.adhesiveAllergyDetail || undefined
          : undefined,
        isPregnant: history.isPregnant,
        maritalStatus: history.maritalStatus || undefined,
        lastMenstrualPeriod: history.lastMenstrualPeriod || undefined,
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
        chronicConditionsOther: chronicConditions.includes("OTHER")
          ? history.chronicConditionsOther || undefined
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
        hadSurgeries: history.hadSurgeries,
        surgeriesDetail: history.hadSurgeries
          ? history.surgeriesDetail || undefined
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
        standLonger: goalsExtra.standLonger || undefined,
        sleepLonger: goalsExtra.sleepLonger || undefined,
        sitLonger: goalsExtra.sitLonger || undefined,
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
        head: { neutral: p.headNeutral, hyperextended: p.headHyperextended, fwdFlexed: p.headFwdFlexed, laterallyFlexed: { L: p.headLaterallyFlexedL, R: p.headLaterallyFlexedR }, rotated: { L: p.headRotatedL, R: p.headRotatedR } },
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
    try {
      await addSession.mutateAsync({
        id,
        dto: {
          sessionDate: sessionForm.date,
          sessionTime: sessionForm.sessionTime || undefined,
          notes: sessionForm.notes || undefined,
        },
      });
      setSessionForm({ date: new Date().toISOString().slice(0, 10), sessionTime: "", notes: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message;
      toast.error(msg || "حدث خطأ أثناء إضافة الجلسة");
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;
    await updateSessionMut.mutateAsync({
      id,
      sessionId: editingSession.id,
      dto: {
        sessionDate: editingSession.sessionDate || undefined,
        sessionTime: editingSession.sessionTime || undefined,
        notes: editingSession.notes || undefined,
        supervisorOpinion: editingSession.supervisorOpinion || undefined,
        doctorDecision: editingSession.doctorDecision || undefined,
      },
    });
    setEditingSession(null);
  };

  const handleSaveFinalSummary = async () => {
    await submitFinalSummary.mutateAsync({ id, dto: { finalSummary } });
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
    "EVALUATION",
    "ACTIVE_TREATMENT",
    "SUPERVISOR_REVIEW",
  ];
  const defaultTab = (() => {
    if (["COMPLETED", "DISCHARGED", "CANCELLED"].includes(c.status))
      return "timeline";
    if (c.status === "ACTIVE_TREATMENT") return "sessions";
    if (c.status === "SUPERVISOR_REVIEW") return "supervisor_review";
    if (c.status === "EVALUATION") return "evaluation";
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
        <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir="rtl">
          {[
            { value: "intake",              ar: "الاستقبال",              en: "Intake" },
            { value: "patient_info",        ar: "نموذج العلاج الطبيعي",   en: "PT Medical Form" },
            { value: "complaint",           ar: "الشكوى",                 en: "Complaint" },
            { value: "pain_map",            ar: "حدد أماكن الألم",        en: "Mark Areas of Discomfort" },
            { value: "medical_history",     ar: "التاريخ الطبي",          en: "Medical History" },
            { value: "goals",               ar: "أهداف العلاج",           en: "Goals of Treatment" },
            { value: "postural_assessment", ar: "خطة العلاج",             en: "Plan of Assessment" },
            { value: "treatment_plan",      ar: "خطة العلاج",             en: "Plan of Treatment" },
            { value: "evaluation",          ar: "الملاحظات والتقييم",     en: "Observation & Evaluation" },
            { value: "sessions",            ar: `الجلسات العلاجية (${sessions.length})`, en: "Therapeutic Procedures" },
            { value: "supervisor_review",   ar: "رأي رئيس القسم",         en: "Supervisor Review" },
            { value: "timeline",            ar: "السجل الزمني",           en: "Timeline" },
          ].map(({ value, ar, en }) => (
            <TabsTrigger key={value} value={value} className="flex flex-col gap-0 leading-tight py-1.5">
              <span>{ar}</span>
              <span className="text-[10px] font-normal opacity-60">{en}</span>
            </TabsTrigger>
          ))}
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

        {/* ── PATIENT INFO ───────────────────────────────────────────────── */}
        <TabsContent value="patient_info" className="mt-4">
          <Section title="نموذج العلاج الطبيعي / Physical Therapy Medical Form">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">الاسم / Name</p>
                <p className="text-sm font-medium">{patientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">العمر / Age</p>
                <p className="text-sm font-medium">
                  {patientFull?.dateOfBirth
                    ? `${Math.floor((Date.now() - new Date(patientFull.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة`
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">التاريخ / Date</p>
                <p className="text-sm font-medium">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">رقم تعريف المريض / Patient ID</p>
                <p className="text-sm font-medium font-mono">{c.patient?.patientNumber ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">الوظيفة الحالية / Current Job</p>
                <p className="text-sm font-medium">{patientFull?.occupation ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">مقدم الرعاية / Care Provider</p>
                <p className="text-sm font-medium">
                  {patientFull?.receivesAid || "—"}
                </p>
              </div>
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
                    value={complaint.complaintStartDate}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintStartDate: e.target.value,
                      }))
                    }
                    placeholder="مثال: 2026-06-16"
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
                    في أي وقت من اليوم تكون الأعراض أقل إزعاجاً / In what part of the day are the symptoms less bothersome
                  </Label>
                  <Input
                    value={complaint.bestTimeOfDay}
                    onChange={(e) => setComplaint((f) => ({ ...f, bestTimeOfDay: e.target.value }))}
                    placeholder="مثال: الصباح / Morning"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    في أي وقت من اليوم تكون الأعراض أكثر إزعاجاً / In what part of the day are the symptoms more bothersome
                  </Label>
                  <Input
                    value={complaint.worstTimeOfDay}
                    onChange={(e) => setComplaint((f) => ({ ...f, worstTimeOfDay: e.target.value }))}
                    placeholder="مثال: المساء / Evening"
                  />
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
                <div className="space-y-1.5">
                  <Label>هل سبق التعرض لهذه الإصابة؟ / Have you had this injury before?</Label>
                  <Input
                    value={complaint.hadPreviousInjury}
                    onChange={(e) => setComplaint((f) => ({ ...f, hadPreviousInjury: e.target.value }))}
                    placeholder="مثال: نعم، قبل سنتين"
                    disabled={!canEdit}
                  />
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
                  <div className="mr-4 space-y-1.5">
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
                )}
              </div>

              {/* هل سبق أن دخنت */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل سبق لك أن دخنت؟ / Have you ever smoked؟</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.hasSmokedBefore}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, hasSmokedBefore: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hasSmokedBefore && (
                  <div className="mr-4 space-y-1.5">
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

              {/* الحساسية العامة */}
              <div className="space-y-1.5">
                <Label>الحساسية / Allergies</Label>
                <Input
                  value={history.allergies}
                  onChange={(e) =>
                    setHistory((h) => ({ ...h, allergies: e.target.value }))
                  }
                  placeholder="مثال: حساسية بنسلين..."
                  disabled={!canEdit}
                />
              </div>

              {/* حقول الأنثى فقط */}
              {patientFull?.gender === "FEMALE" && (
                <>
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
                  <div className="space-y-1.5">
                    <Label>الحالة الاجتماعية / Marital Status</Label>
                    <Input
                      value={history.maritalStatus}
                      onChange={(e) =>
                        setHistory((h) => ({
                          ...h,
                          maritalStatus: e.target.value,
                        }))
                      }
                      placeholder="مثال: عزباء / متزوجة"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      آخر دورة شهرية / Last Menstrual Period
                    </Label>
                    <Input
                      value={history.lastMenstrualPeriod}
                      onChange={(e) =>
                        setHistory((h) => ({
                          ...h,
                          lastMenstrualPeriod: e.target.value,
                        }))
                      }
                      placeholder="مثال: 2026-05-20"
                      disabled={!canEdit}
                    />
                  </div>
                </>
              )}

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

              {/* هل خضعت لعمليات جراحية */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل خضعت لأي عمليات جراحية؟ / Have you had any surgeries؟
                  </Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.hadSurgeries}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, hadSurgeries: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hadSurgeries && (
                  <Input
                    className="mr-4"
                    value={history.surgeriesDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        surgeriesDetail: e.target.value,
                      }))
                    }
                    placeholder="اذكر تفاصيل العمليات الجراحية..."
                    disabled={!canEdit}
                  />
                )}
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
              <div className="space-y-2">
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
                {history.prescriptionDrugs && (
                  <Input
                    className="mr-4"
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
                )}
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

              {/* حساسية اللاصق */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    هل لديك حساسية من المواد اللاصقة/الشريط اللاصق أو اللاتكس أو لسعات النحل؟ / Adhesive / latex / bee sting allergy؟
                  </Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch
                      checked={history.adhesiveAllergy}
                      onCheckedChange={(v) =>
                        setHistory((h) => ({ ...h, adhesiveAllergy: v }))
                      }
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.adhesiveAllergy && (
                  <Input
                    className="mr-4"
                    value={history.adhesiveAllergyDetail}
                    onChange={(e) =>
                      setHistory((h) => ({
                        ...h,
                        adhesiveAllergyDetail: e.target.value,
                      }))
                    }
                    placeholder="إذا نعم يرجى ذكر ما يلي..."
                    disabled={!canEdit}
                  />
                )}
              </div>
            </div>
          </Section>

          {history.hadSurgeries && (
            <Section title="العمليات الجراحية (حتى 5)">
              <div className="space-y-3">
                {surgeries.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">
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
          )}

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
          <Section title=" هل لديك أي مما يلي ؟ (ضع علامة إذا نعم)/ do you have any of the following today؟">
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
            {chronicConditions.includes("OTHER") && (
              <div className="mt-3">
                <Input
                  value={history.chronicConditionsOther}
                  onChange={(e) =>
                    setHistory((h) => ({
                      ...h,
                      chronicConditionsOther: e.target.value,
                    }))
                  }
                  placeholder="حدد الأمراض الأخرى..."
                  disabled={!canEdit}
                />
              </div>
            )}
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
                  <ToggleChip
                    label="تخفيف الألم / Decrease Pain"
                    active={goalsExtra.decreasePain}
                    onClick={() => canEdit && setGoalsExtra((f) => ({ ...f, decreasePain: !f.decreasePain }))}
                  />
                  <ToggleChip
                    label="تحسين القوة / Improve Strength"
                    active={goalsExtra.improveStrength}
                    onClick={() => canEdit && setGoalsExtra((f) => ({ ...f, improveStrength: !f.improveStrength }))}
                  />
                  <ToggleChip
                    label="القيام ببعض الأنشطة / Less Difficulty"
                    active={goalsExtra.lessDifficultyWork}
                    onClick={() => canEdit && setGoalsExtra((f) => ({ ...f, lessDifficultyWork: !f.lessDifficultyWork }))}
                  />
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">أطول فترة وقوف / Stand longer</span>
                    <Input
                      className="h-8 w-24 text-sm"
                      placeholder="2:30"
                      value={goalsExtra.standLonger}
                      onChange={(e) => setGoalsExtra((f) => ({ ...f, standLonger: e.target.value }))}
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">ساعات/دقائق</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">أطول فترة نوم / Sleep longer</span>
                    <Input
                      className="h-8 w-24 text-sm"
                      placeholder="8:00"
                      value={goalsExtra.sleepLonger}
                      onChange={(e) => setGoalsExtra((f) => ({ ...f, sleepLonger: e.target.value }))}
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">ساعات/دقائق</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">أطول فترة جلوس / Sit longer</span>
                    <Input
                      className="h-8 w-24 text-sm"
                      placeholder="1:15"
                      value={goalsExtra.sitLonger}
                      onChange={(e) => setGoalsExtra((f) => ({ ...f, sitLonger: e.target.value }))}
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">ساعات/دقائق</span>
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
                التحكم في التوازن / الجذع/ Balance / Trunk Control
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
                <span className="text-sm">عطف جانبي / Laterally Flexed</span>
                <div className="flex items-center gap-4">
                  {(["headLaterallyFlexedL", "headLaterallyFlexedR"] as const).map((k, i) => (
                    <label key={k} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={postural[k]}
                        onChange={(e) =>
                          setPostural((p) => ({ ...p, [k]: e.target.checked }))
                        }
                        disabled={!canEdit}
                      />
                      <span className="text-xs font-medium">{i === 0 ? "L" : "R"}</span>
                    </label>
                  ))}
                </div>
              </div>
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
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      treatmentFrom: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">إلى / To</Label>
                <Input
                  type="date"
                  value={planHeader.treatmentTo}
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      treatmentTo: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  عدد الزيارات المتوقعة / Anticipated Visits
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={planHeader.anticipatedVisits}
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      anticipatedVisits: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  اسم أخصائي العلاج الطبيعي / Physiotherapist
                </Label>
                <Select
                  value={planHeader.physiotherapistId || ""}
                  onValueChange={(v) =>
                    canEdit &&
                    setPlanHeader((h) => ({ ...h, physiotherapistId: v }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المعالج..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">مدير الحالة / Case Manager</Label>
                <Select
                  value={planHeader.caseManagerId || ""}
                  onValueChange={(v) =>
                    canEdit &&
                    setPlanHeader((h) => ({ ...h, caseManagerId: v }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مدير الحالة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">حالة المريض / Plan Status</p>
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

          {/* Modalities — 2-col checkbox grid */}
          <Section title="خطة علاج  المريض   /  patient treatment plan">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {THERAPY_MODALITY_PAIRS.flatMap(([right, left]) =>
                [right, left].map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                      checked={planModalities.includes(m)}
                      onChange={(e) => {
                        if (!canEdit) return;
                        setPlanModalities((prev) =>
                          e.target.checked
                            ? [...prev, m]
                            : prev.filter((x) => x !== m),
                        );
                      }}
                      disabled={!canEdit}
                    />
                    <span className="text-sm leading-tight">
                      {THERAPY_MODALITY_LABELS[m]}
                    </span>
                  </label>
                )),
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
                <Label className="text-sm">ملاحظات / remarks</Label>
                <Textarea
                  rows={3}
                  value={planObservation}
                  onChange={(e) => setPlanObservation(e.target.value)}
                  disabled={!canEdit}
                  placeholder="ملاحظات الحالة..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm"> الملخص / summarizing</Label>
                <Textarea
                  rows={2}
                  value={planRemarks}
                  onChange={(e) => setPlanRemarks(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {canEdit &&
            [
              "POSTURAL_ASSESSMENT",
              "GOALS",
              "TREATMENT_PLAN",
              "MEDICAL_HISTORY",
            ].includes(c.status) && (
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
          <Section title="العلاج المطبق ">
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

          <Section title="التشخيص / observations">
            <Textarea
              rows={4}
              placeholder="اكتب ملاحظاتك حول تقدم المريض..."
              value={evalNotes}
              onChange={(e) => setEvalNotes(e.target.value)}
              disabled={!canEdit}
            />
          </Section>

          {/* <Section title="التقييم / Evaluation">
            <Textarea
              rows={4}
              placeholder="اكتب تقييمك للحالة..."
              value={evalText}
              onChange={(e) => setEvalText(e.target.value)}
              disabled={!canEdit}
            />
          </Section> */}

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

        {/* ── SESSIONS ────────────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="mt-4 space-y-4">

          {/* Add session form */}
          {canEdit && (
            <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.SESSIONS_CREATE}>
              <Section title="إضافة جلسة جديدة">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">التاريخ *</Label>
                    <Input
                      type="date"
                      value={sessionForm.date}
                      onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">الوقت</Label>
                    <Input
                      type="time"
                      value={sessionForm.sessionTime}
                      onChange={(e) => setSessionForm((f) => ({ ...f, sessionTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">ملاحظات</Label>
                    <Textarea
                      rows={2}
                      value={sessionForm.notes}
                      onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="ملاحظات الجلسة..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleAddSession}
                    disabled={!sessionForm.date || addSession.isPending}
                    className="flex-1 gap-2"
                  >
                    {addSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    إضافة جلسة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id, status: "COMPLETED" })}
                    disabled={sessions.length === 0}
                  >
                    إنهاء الجلسات
                  </Button>
                </div>
              </Section>
            </ActionGuard>
          )}

          {/* Sessions list */}
          {sessions.length > 0 && (
            <Section title={`الجلسات (${sessions.length})`}>
              <div className="space-y-3">
                {[...sessions].sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)).map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 space-y-2">
                    {editingSession?.id === s.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">التاريخ</Label>
                            <Input
                              type="date"
                              value={editingSession.sessionDate}
                              onChange={(e) => setEditingSession((v) => v && ({ ...v, sessionDate: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">الوقت</Label>
                            <Input
                              type="time"
                              value={editingSession.sessionTime}
                              onChange={(e) => setEditingSession((v) => v && ({ ...v, sessionTime: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">ملاحظات</Label>
                            <Textarea
                              rows={2}
                              value={editingSession.notes}
                              onChange={(e) => setEditingSession((v) => v && ({ ...v, notes: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">رأي رئيس القسم / Supervisor Opinion</Label>
                            <Textarea
                              rows={2}
                              value={editingSession.supervisorOpinion}
                              onChange={(e) => setEditingSession((v) => v && ({ ...v, supervisorOpinion: e.target.value }))}
                              placeholder="رأي رئيس القسم..."
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">قرار الطبيب / Doctor Decision</Label>
                            <Textarea
                              rows={2}
                              value={editingSession.doctorDecision}
                              onChange={(e) => setEditingSession((v) => v && ({ ...v, doctorDecision: e.target.value }))}
                              placeholder="قرار الطبيب..."
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateSession} disabled={updateSessionMut.isPending} className="gap-1">
                            {updateSessionMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            حفظ
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSession(null)}>إلغاء</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2 items-center flex-wrap">
                            <Badge variant="secondary" className="text-xs font-bold">#{s.sessionNumber}</Badge>
                            <span className="font-medium text-sm">
                              {new Date(s.sessionDate).toLocaleDateString("en-GB")}
                            </span>
                            {s.sessionTime && (
                              <span className="text-xs text-muted-foreground">{s.sessionTime}</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {canEdit && (
                              <button
                                onClick={() => setEditingSession({
                                  id: s.id,
                                  sessionDate: s.sessionDate?.slice(0, 10) ?? "",
                                  sessionTime: s.sessionTime ?? "",
                                  notes: s.notes ?? "",
                                  supervisorOpinion: s.supervisorOpinion ?? "",
                                  doctorDecision: s.doctorDecision ?? "",
                                })}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title="تعديل"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteSessionId(s.id)}
                              className="text-destructive hover:opacity-70 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {s.notes && (
                          <p className="text-xs text-muted-foreground">{s.notes}</p>
                        )}
                        {(s.supervisorOpinion || s.doctorDecision) && (
                          <div className="mt-2 grid grid-cols-2 gap-3 border-t pt-2">
                            {s.supervisorOpinion && (
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-medium text-muted-foreground">رأي رئيس القسم</p>
                                <p className="text-xs">{s.supervisorOpinion}</p>
                              </div>
                            )}
                            {s.doctorDecision && (
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-medium text-muted-foreground">قرار الطبيب</p>
                                <p className="text-xs">{s.doctorDecision}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Final Summary */}
          <Section title="الملخص النهائي / Final Summary">
            <div className="space-y-3">
              <Textarea
                rows={5}
                value={finalSummary}
                onChange={(e) => setFinalSummary(e.target.value)}
                placeholder="ملخص الحالة بعد انتهاء كل الجلسات..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveFinalSummary}
                  disabled={!finalSummary || submitFinalSummary.isPending}
                  className="flex-1 gap-2"
                >
                  {submitFinalSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ الملخص
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadFinalPdf.mutate(id)}
                  disabled={downloadFinalPdf.isPending}
                  className="gap-2"
                >
                  {downloadFinalPdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  تصدير PDF
                </Button>
              </div>
            </div>
          </Section>

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

      <Dialog open={confirmDeleteSessionId !== null} onOpenChange={(o) => !o && setConfirmDeleteSessionId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف الجلسة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل تريد حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteSessionId(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteSessionId) {
                  deleteSession.mutate({ id, sessionId: confirmDeleteSessionId });
                  setConfirmDeleteSessionId(null);
                }
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
