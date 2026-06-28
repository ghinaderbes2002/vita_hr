"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Save,
  Download,
  Calendar as CalendarIcon,
  XCircle,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useAuthStore } from "@/lib/stores/auth-store";
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
  useDoctorReview,
  useSignPhysioTreatmentPlan,
  usePhysioSessions,
  useAddPhysioSession,
  useDeletePhysioSession,
  useUpdatePhysioSession,
  useSubmitFinalSummary,
  useDownloadFinalSummaryPdf,
  usePhysioTimeline,
  useSendEmergencyAlert,
  useMyEmergencyAlerts,
  useIncomingEmergencyAlerts,
  useRespondToAlert,
} from "@/lib/hooks/use-clinic-physio";
import { useUsers } from "@/lib/hooks/use-users";
import { useEmployeesByDepartment, useMyEmployee } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
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
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <Card dir={dir}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${dir === "rtl" ? "text-right" : "text-left"}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  activeColor = "primary",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: "primary" | "red";
}) {
  const activeClass =
    activeColor === "red"
      ? "bg-red-500 text-white border-red-500"
      : "bg-primary text-primary-foreground border-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm transition-colors ${
        active ? activeClass : "bg-background border-border hover:border-primary/50"
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
const THERAPY_MODALITY_PAIRS: [TherapyModality, TherapyModality?][] = [
  ["ESWT",       "MANUAL_THERAPY"],
  ["US",         "MASSAGE"],
  ["TENS",       "KINESIO_TAPING"],
  ["EMS",        "COMPRESSION"],
  ["LASER",      "PARAFFIN"],
  ["CPM",        "GRASTON"],
  ["HOT_PACKS",  "MET"],
  ["COLD_PACKS", "PNF"],
  ["TRACTION",   "INFRARED"],
  ["SIS"],
  ["EXERCISES",  "OTHER"],
];
const EVAL_MODALITY_PAIRS: [EvaluationModality, EvaluationModality?][] = [
  ["ESWT", "MANUAL_THERAPY"],
  ["US", "MASSAGE"],
  ["TENS", "KINESIO_TAPING"],
  ["EMS", "COMPRESSION"],
  ["LASER", "PARAFFIN"],
  ["CPM", "GRASTON"],
  ["HOT_PACKS", "MET"],
  ["COLD_PACKS", "PNF"],
  ["TRACTION", "INFRARED"],
  ["SIS"],
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
  const t = useTranslations("clinic.physio.case");
  const isRtl = locale === "ar";

  const { user } = useAuthStore();
  const canSendAlert = !!user?.permissions?.includes("physio:emergency-alert");
  const { data: myEmployee } = useMyEmployee();
  const myJobTitleCode: string = (myEmployee as any)?.jobTitle?.code ?? "";
  const { data: caseData, isLoading } = usePhysioCase(id);
  const { data: sessions = [] } = usePhysioSessions(id);
  const { data: timeline = [] } = usePhysioTimeline(id);
  const { data: myAlerts = [] } = useMyEmergencyAlerts(canSendAlert);
  const { data: incomingAlerts = [] } = useIncomingEmergencyAlerts(!canSendAlert);
  const sendAlert = useSendEmergencyAlert();
  const respondAlert = useRespondToAlert();

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
  const doctorRev = useDoctorReview();
  const signPlan = useSignPhysioTreatmentPlan();
  const addSession = useAddPhysioSession();
  const deleteSession = useDeletePhysioSession();
  const updateSessionMut = useUpdatePhysioSession();
  const submitFinalSummary = useSubmitFinalSummary();
  const downloadFinalPdf = useDownloadFinalSummaryPdf();

  const tryAdvanceStatus = async (expectedCurrent: PhysioStatus, next: PhysioStatus) => {
    if (c.status !== expectedCurrent) return;
    try {
      await updateStatus.mutateAsync({ id, status: next });
    } catch (err: unknown) {
      const data = (err as any)?.response?.data;
      if (data?.from) {
        const allowed = Array.isArray(data.allowed) ? ` — ${t("statusTransitionAllowed")}: ${data.allowed.join(", ")}` : "";
        toast.error(`${t("statusTransitionError")} ${data.from} → ${data.to}${allowed}`);
      }
    }
  };

  const { data: usersData } = useUsers({ limit: 200 });
  const allUsers: { id: string; fullName: string }[] =
    (usersData as any)?.data?.items ?? (usersData as any)?.items ?? [];

  const { data: depsData } = useDepartments({ limit: 100 }, 30 * 60 * 1000);
  const caseManagerOptions: { id: string; name: string }[] = (
    (depsData as any)?.data?.items ?? (depsData as any)?.items ?? []
  )
    .filter((d: any) => {
      if (!d.manager) return false;
      const name: string = d.nameAr ?? "";
      return (
        name === "الإدارة العامة" ||
        name === "الإدارة الطبية" ||
        name.includes("فيزيائي") ||
        name.includes("طبيعي") ||
        name.includes("فيزيوثيرابي")
      );
    })
    .map((d: any) => ({
      id: d.manager.id,
      name: `${d.manager.firstNameAr} ${d.manager.lastNameAr}`,
    }));

  const PHYSIO_DEPT_ID = "8893e27d-3581-42b6-8111-0fb743ca2403";
  const { data: physioDeptData } = useEmployeesByDepartment(PHYSIO_DEPT_ID);
  const physioEmployees: { id: string; firstNameAr: string; lastNameAr: string }[] =
    Array.isArray(physioDeptData) ? physioDeptData : [];

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
  const [customPainTypes, setCustomPainTypes] = useState<{ name: string; color: string }[]>([]);
  const [customPainTypesDialogOpen, setCustomPainTypesDialogOpen] = useState(false);
  const [customPainTypesDraft, setCustomPainTypesDraft] = useState<{ name: string; color: string }[]>([]);
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
    hasDoctorRestrictions: false,
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
  const [planPhysiotherapistIds, setPlanPhysiotherapistIds] = useState<string[]>([]);
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

  // ── Doctor review state ──────────────────────────────────────────────────────
  const [doctorGaze, setDoctorGaze] = useState("");

  // ── Sign / session state ─────────────────────────────────────────────────────
  const [signOpen, setSignOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    sessionTime: "",
    notes: "",
    supervisorOpinion: "",
    doctorDecision: "",
    modalities: [] as TherapyModality[],
  });
  const [editingSession, setEditingSession] = useState<{ id: string; sessionDate: string; sessionTime: string; notes: string; supervisorOpinion: string; doctorDecision: string; modalities: TherapyModality[] } | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [finalSummary, setFinalSummary] = useState("");
  const [pdfExporting, setPdfExporting] = useState(false);
  const [respondingAlertId, setRespondingAlertId] = useState<string | null>(null);
  const [respondNote, setRespondNote] = useState("");

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
      majorComplaint: [caseData.majorComplaint, caseData.symptoms].filter(Boolean).join("\n") || "",
      symptoms: "",
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
    if (caseData.customPainTypes?.length) {
      setCustomPainTypes(caseData.customPainTypes);
    } else if (caseData.painTypeOther) {
      setCustomPainTypes([{ name: caseData.painTypeOther, color: caseData.painTypeOtherColor || "#00BCD4" }]);
    }
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
        hasDoctorRestrictions: mh.hasDoctorRestrictions ?? (!!mh.doctorRestrictions),
        doctorRestrictions: mh.doctorRestrictions ?? "",
        hadPTSameProblem: mh.hadPTSameProblem ?? false,
        ptSameProblemDetail: mh.ptSameProblemDetail ?? "",
        receivingOtherTreatment: mh.receivingOtherTreatment ?? false,
        otherTreatmentDetail: mh.otherTreatmentDetail ?? "",
        testsOther: mh.testsOther ?? "",
        testResults: mh.testResults ?? "",
        newAnalysis: mh.newAnalysis ?? "",
        newAnalysisDate: mh.newAnalysisDate ?? "",
        newAnalysisAttachment: mh.newAnalysisAttachment ?? "",
        oldAnalysis: mh.oldAnalysis ?? "",
        oldAnalysisDate: mh.oldAnalysisDate ?? "",
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
        ? caseData.treatmentFrom
        : "",
      treatmentTo: caseData.treatmentTo
        ? caseData.treatmentTo
        : "",
      anticipatedVisits:
        caseData.anticipatedVisits != null
          ? String(caseData.anticipatedVisits)
          : "",
      physiotherapistId: caseData.physiotherapistId ?? "",
      caseManagerId: caseData.caseManagerId ?? "",
    });
    const ids: string[] = (caseData as any).physiotherapistIds?.length
      ? (caseData as any).physiotherapistIds
      : caseData.physiotherapistId
        ? [caseData.physiotherapistId]
        : [];
    setPlanPhysiotherapistIds(ids);

    // Evaluation
    const ev = caseData.evaluation;
    if (ev) {
      if (ev.modalities?.length) setEvalModalities(ev.modalities);
      if (ev.otherModality) setEvalOtherModality(ev.otherModality);
      if (ev.notes) setEvalNotes(ev.notes);
      if (ev.evaluation) setEvalText(ev.evaluation);
    }

    // Supervisor / doctor review
    if (caseData.treatmentPlan?.supervisorGaze) setSupervisorGaze(caseData.treatmentPlan.supervisorGaze);
    if ((caseData.treatmentPlan as any)?.doctorGaze) setDoctorGaze((caseData.treatmentPlan as any).doctorGaze);
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
        {t("notFound")}
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
    await tryAdvanceStatus("INTAKE", "COMPLAINT");
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
        customPainTypes: painTypes.includes("OTHER") && customPainTypes.length ? customPainTypes : undefined,
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
    await tryAdvanceStatus("COMPLAINT", "PAIN_MAP");
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
        hasDoctorRestrictions: history.hasDoctorRestrictions,
        doctorRestrictions: history.hasDoctorRestrictions
          ? history.doctorRestrictions || undefined
          : undefined,
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

    await tryAdvanceStatus("PAIN_MAP", "MEDICAL_HISTORY");
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
    await tryAdvanceStatus("MEDICAL_HISTORY", "GOALS");
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
    await tryAdvanceStatus("GOALS", "POSTURAL_ASSESSMENT");
  };

  const handleSavePlan = async () => {
    await submitPlan.mutateAsync({
      id,
      dto: {
        treatmentFrom: planHeader.treatmentFrom || undefined,
        treatmentTo: planHeader.treatmentTo || undefined,
        anticipatedVisits: planHeader.anticipatedVisits ? Number(planHeader.anticipatedVisits) : undefined,
        physiotherapistIds: planPhysiotherapistIds.length ? planPhysiotherapistIds : undefined,
        caseManagerId: planHeader.caseManagerId || undefined,
        modalities: planModalities.length ? planModalities : undefined,
        otherModality: planModalities.includes("OTHER") ? (planOtherModality || undefined) : undefined,
        remarks: planRemarks || undefined,
        observation: planObservation || undefined,
        status: planStatus,
      },
    });
    await tryAdvanceStatus("POSTURAL_ASSESSMENT", "TREATMENT_PLAN");
  };

  const handleSupervisorReview = async () => {
    await supervisorRev.mutateAsync({
      id,
      dto: { supervisorGaze: supervisorGaze || undefined },
    });
    await tryAdvanceStatus("ACTIVE_TREATMENT", "SUPERVISOR_REVIEW");
  };

  const handleDoctorReview = async () => {
    await doctorRev.mutateAsync({
      id,
      dto: { doctorGaze: doctorGaze || undefined },
    });
  };

  const handleCompleteCase = async () => {
    await updateStatus.mutateAsync({ id, status: "COMPLETED" });
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
          supervisorOpinion: sessionForm.supervisorOpinion || undefined,
          doctorDecision: sessionForm.doctorDecision || undefined,
          modalities: sessionForm.modalities.length ? sessionForm.modalities : undefined,
        },
      });
      setSessionForm({ date: new Date().toISOString().slice(0, 10), sessionTime: "", notes: "", supervisorOpinion: "", doctorDecision: "", modalities: [] });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message;
      toast.error(msg || t("sessions.addError"));
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
        modalities: editingSession.modalities.length ? editingSession.modalities : undefined,
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

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const handleExportFullPdf = async () => {
    if (pdfExporting) return;
    setPdfExporting(true);
    try {
      const { downloadPhysioCasePdf } = await import(
        "@/components/clinic/physio-full-pdf"
      );
      await downloadPhysioCasePdf({
        patient: {
          firstName: patientFull?.firstName ?? c.patient?.firstName ?? "",
          lastName: patientFull?.lastName ?? c.patient?.lastName ?? "",
          patientNumber: patientFull?.patientNumber ?? c.patient?.patientNumber ?? "",
          gender: (patientFull as any)?.gender ?? "",
          dateOfBirth: (patientFull as any)?.dateOfBirth ?? "",
          occupation: (patientFull as any)?.occupation ?? "",
          receivesAid: (patientFull as any)?.receivesAid ?? "",
        },
        caseId: c.id,
        caseStatus: c.status,
        caseCreatedAt: c.createdAt,
        complaint,
        painRegions,
        painTypes,
        customPainTypes: customPainTypes.length ? customPainTypes : undefined,
        aggravatingFactors,
        alleviatingFactors,
        aggravatingOther,
        alleviatingOther,
        history,
        chronicConditions,
        testsHad,
        surgeries,
        goals,
        goalsExtra,
        postural,
        planModalities,
        planOtherModality,
        planHeader: {
          treatmentFrom: planHeader.treatmentFrom,
          treatmentTo: planHeader.treatmentTo,
          anticipatedVisits: planHeader.anticipatedVisits,
          physiotherapistName: (() => {
            const emp = physioEmployees.find((e) => planPhysiotherapistIds.includes(e.id));
            return emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : undefined;
          })(),
          caseManagerName: caseManagerOptions.find((u) => u.id === planHeader.caseManagerId)?.name,
        },
        planRemarks,
        planObservation,
        evalModalities,
        evalOtherModality,
        evalNotes,
        evalText,
        sessions,
        supervisorGaze,
        doctorGaze,
        finalSummary,
      });
      toast.success(t("sessions.pdfExported"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t("sessions.pdfExportFailed")}: ${msg.slice(0, 120)}`);
      console.error("[PDF Export]", e);
    } finally {
      setPdfExporting(false);
    }
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
    "DOCTOR_REVIEW",
    "COMPLETED",
  ];
  const defaultTab = (() => {
    if (["DISCHARGED", "CANCELLED"].includes(c.status)) return "timeline";
    if (c.status === "COMPLETED") return "doctor_review";
    if (c.status === "DOCTOR_REVIEW") return "doctor_review";
    if (c.status === "ACTIVE_TREATMENT") return "sessions";
    if (c.status === "SUPERVISOR_REVIEW") return "supervisor_review";
    if (c.status === "EVALUATION") return "evaluation";
    return c.status.toLowerCase();
  })();

  const canEdit = !["COMPLETED", "DISCHARGED", "CANCELLED"].includes(c.status);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
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
            <h1 className="text-xl font-bold">{t("pageTitle")}</h1>
            {c.caseNumber && (
              <span className="text-sm font-mono text-muted-foreground">
                {c.caseNumber}
              </span>
            )}
            <CaseStatusBadge status={c.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportFullPdf}
            disabled={pdfExporting}
            className="gap-2"
          >
            {pdfExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {pdfExporting ? t("exporting") : t("exportPdf")}
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate({ id, status: "CANCELLED" })}
              className="text-destructive"
            >
              {t("cancelCase")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList
          className="flex-wrap h-auto gap-1 w-full justify-start"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {(myJobTitleCode === "VTX-JTL-000011"
            ? ["intake"]
            : [
                "intake", "patient_info", "complaint", "pain_map",
                "medical_history", "goals", "postural_assessment",
                "treatment_plan", "evaluation", "sessions",
                "supervisor_review", "doctor_review", "timeline",
              ]
          ).map((value) => {
            const key = value.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as any;
            const label = value === "sessions"
              ? `${t("tabs.sessions")} (${sessions.length})`
              : t(`tabs.${key}`);
            return (
              <TabsTrigger
                key={value}
                value={value}
                className="text-sm py-1.5"
              >
                {label}
              </TabsTrigger>
            );
          })}
          {myJobTitleCode !== "VTX-JTL-000011" && (
            <TabsTrigger value="emergency" className="text-sm py-1.5 gap-1.5 text-destructive data-[state=active]:text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              تنبيه طارئ
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── INTAKE ─────────────────────────────────────────────────────── */}
        <TabsContent value="intake" className="mt-4">
          <Section title={t("intake.title")}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("intake.patient")} <strong>{patientName}</strong>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("intake.complaintType")}</Label>
                  <Input
                    value={complaint.complaintType}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintType: e.target.value,
                      }))
                    }
                    placeholder={t("intake.complaintTypePlaceholder")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("intake.painLocation")}</Label>
                  <Input
                    value={complaint.painLocation}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        painLocation: e.target.value,
                      }))
                    }
                    placeholder={t("intake.painLocationPlaceholder")}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("intake.complaintDuration")}</Label>
                  <Input
                    value={complaint.complaintDuration}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintDuration: e.target.value,
                      }))
                    }
                    placeholder={t("intake.complaintDurationPlaceholder")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("intake.notes")}</Label>
                  <Input
                    value={complaint.complaintNotes}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        complaintNotes: e.target.value,
                      }))
                    }
                    placeholder={t("intake.notesPlaceholder")}
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
                    <Label>{t("intake.hasChronicDiseases")}</Label>
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
                      placeholder={t("intake.chronicDiseasesDetail")}
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
                    <Label>{t("intake.visitedSpecialist")}</Label>
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
                      placeholder={t("intake.specialistReason")}
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
                    <Label>{t("intake.hadPreviousPT")}</Label>
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
                      placeholder="Details..."
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
                    <Label>{t("intake.hadSurgery")}</Label>
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
                      placeholder="Details..."
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
                    {t("intake.save")}
                  </Button>
                  {c.status === "INTAKE" && (
                    <Button
                      onClick={() =>
                        updateStatus.mutate({ id, status: "COMPLAINT" })
                      }
                      disabled={updateStatus.isPending}
                      className="gap-2"
                    >
                      {t("intake.startComplaint")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── PATIENT INFO ───────────────────────────────────────────────── */}
        <TabsContent value="patient_info" className="mt-4">
          <Section title={t("patientInfo.title")}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("patientInfo.name")}</p>
                <p className="text-sm font-medium">{patientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("patientInfo.age")}</p>
                <p className="text-sm font-medium">
                  {patientFull?.dateOfBirth
                    ? `${Math.floor((Date.now() - new Date(patientFull.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} ${t("years")}`
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("patientInfo.date")}</p>
                <p className="text-sm font-medium">
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString("en-GB")
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("patientInfo.patientId")}</p>
                <p className="text-sm font-medium font-mono">
                  {c.patient?.patientNumber ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("patientInfo.currentJob")}</p>
                <p className="text-sm font-medium">
                  {patientFull?.occupation ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("patientInfo.careProvider")}</p>
                <p className="text-sm font-medium">
                  {patientFull?.receivesAid || "—"}
                </p>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── COMPLAINT ──────────────────────────────────────────────────── */}
        <TabsContent value="complaint" className="mt-4 space-y-4">
          <Section title={t("complaint.title")}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("complaint.majorComplaint")} / {t("complaint.symptoms")}</Label>
                <Textarea
                  rows={3}
                  value={complaint.majorComplaint}
                  onChange={(e) =>
                    setComplaint((f) => ({ ...f, majorComplaint: e.target.value, symptoms: "" }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("complaint.startDate")}</Label>
                <Input
                  value={complaint.complaintStartDate}
                  onChange={(e) =>
                    setComplaint((f) => ({ ...f, complaintStartDate: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("complaint.possibleCause")}</Label>
                <Input
                  value={complaint.possibleCause}
                  onChange={(e) =>
                    setComplaint((f) => ({ ...f, possibleCause: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("complaint.previousDoctorSeen")}</Label>
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
                  <Label>{t("complaint.previousTreatment")}</Label>
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
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("complaint.worstTimeOfDay")}</Label>
                  <Input
                    value={complaint.worstTimeOfDay}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        worstTimeOfDay: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("complaint.bestTimeOfDay")}</Label>
                  <Input
                    value={complaint.bestTimeOfDay}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        bestTimeOfDay: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("complaint.painType")}</Label>
                  <div className="flex flex-wrap gap-4">
                    {(["INTERMITTENT", "CONSTANT", "WITH_CERTAIN_MOTIONS"] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          className="h-4 w-4 accent-primary"
                          checked={complaint.painDuration === v}
                          onChange={() => setComplaint((f) => ({ ...f, painDuration: v }))}
                        />
                        <span className="text-sm">{t(`complaint.${v}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("complaint.painLevel")}</Label>
                  <div className="flex flex-wrap gap-4">
                    {(["MILD", "MODERATE", "SEVERE", "EXCRUCIATING"] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          className="h-4 w-4 accent-primary"
                          checked={complaint.painLevel === v}
                          onChange={() => setComplaint((f) => ({ ...f, painLevel: v }))}
                        />
                        <span className="text-sm">{t(`complaint.${v}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("complaint.painProgression")}</Label>
                  <Select
                    value={complaint.painProgression}
                    onValueChange={(v) =>
                      setComplaint((f) => ({ ...f, painProgression: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BETTER">{t("complaint.BETTER")}</SelectItem>
                      <SelectItem value="WORSE">{t("complaint.WORSE")}</SelectItem>
                      <SelectItem value="SAME">{t("complaint.SAME")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("complaint.hadPreviousInjury")}</Label>
                  <Input
                    value={complaint.hadPreviousInjury}
                    onChange={(e) =>
                      setComplaint((f) => ({
                        ...f,
                        hadPreviousInjury: e.target.value,
                      }))
                    }
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
                  {t("complaint.saveAndNext")}
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── PAIN MAP ───────────────────────────────────────────────────── */}
        <TabsContent value="pain_map" className="mt-4 space-y-4">
          <Section title={t("painMap.painTypesTitle")}>
            <div className="flex flex-wrap gap-2">
              {(["NORMAL","NUMBNESS","DULL_ACHE","HOT_BURNING","SHARP_STABBING","PINS","OTHER"] as const).map((v) => (
                <ToggleChip
                  key={v}
                  label={v === "OTHER" && customPainTypes.length > 0 ? customPainTypes.map(c => c.name).filter(Boolean).join("، ") || t(`painMap.${v}`) : t(`painMap.${v}`)}
                  active={painTypes.includes(v)}
                  onClick={() => canEdit && toggleArr(painTypes, v, setPainTypes)}
                />
              ))}
            </div>
            {painTypes.includes("OTHER") && (
              <div className="mt-3 flex items-center gap-2">
                {customPainTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customPainTypes.map((ct, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: ct.color }}>
                        {ct.name || "—"}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setCustomPainTypesDraft([...customPainTypes]); setCustomPainTypesDialogOpen(true); }}
                >
                  {customPainTypes.length > 0 ? "تعديل الأنواع" : "+ إضافة نوع مخصص"}
                </Button>
              </div>
            )}

            <Dialog open={customPainTypesDialogOpen} onOpenChange={setCustomPainTypesDialogOpen}>
              <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
                <DialogHeader>
                  <DialogTitle>أنواع الألم المخصصة</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 max-h-72 overflow-y-auto">
                  {customPainTypesDraft.map((ct, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={ct.color}
                        onChange={(e) => setCustomPainTypesDraft(prev => prev.map((x, j) => j === i ? { ...x, color: e.target.value } : x))}
                        className="w-9 h-8 rounded cursor-pointer border border-input p-0.5 bg-background"
                      />
                      <Input
                        placeholder="اسم النوع (مثلاً: وخز كهربائي)"
                        value={ct.name}
                        onChange={(e) => setCustomPainTypesDraft(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setCustomPainTypesDraft(prev => prev.filter((_, j) => j !== i))}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setCustomPainTypesDraft(prev => [...prev, { name: "", color: "#00BCD4" }])}
                  >
                    + إضافة نوع
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomPainTypesDialogOpen(false)}>إلغاء</Button>
                  <Button onClick={() => { setCustomPainTypes(customPainTypesDraft); setCustomPainTypesDialogOpen(false); }}>حفظ</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
          <Section title={t("painMap.mapTitle")}>
            <BodyPainMap
              points={painRegions as any}
              onChange={(pts) => setPainRegions(pts as any)}
              readonly={!canEdit}
              customPainTypes={customPainTypes}
            />
          </Section>
          <Section title={t("painMap.factorsTitle")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("painMap.aggravatingFactors")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(["SITTING","HEAT","COLD","COUGHING","WALKING","EXERCISE","LYING_DOWN","FACTOR_OTHER"] as const).map((v) => (
                    <ToggleChip
                      key={v}
                      label={t(`painMap.${v}`)}
                      active={aggravatingFactors.includes(v === "FACTOR_OTHER" ? "OTHER" : v)}
                      onClick={() =>
                        toggleArr(aggravatingFactors, v === "FACTOR_OTHER" ? "OTHER" : v, setAggravatingFactors)
                      }
                    />
                  ))}
                </div>
                {aggravatingFactors.includes("OTHER") && (
                  <Input
                    placeholder={t("other")}
                    value={aggravatingOther}
                    onChange={(e) => setAggravatingOther(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("painMap.alleviatingFactors")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(["SITTING","HEAT","COLD","COUGHING","WALKING","EXERCISE","LYING_DOWN","FACTOR_OTHER"] as const).map((v) => (
                    <ToggleChip
                      key={v}
                      label={t(`painMap.${v}`)}
                      active={alleviatingFactors.includes(v === "FACTOR_OTHER" ? "OTHER" : v)}
                      onClick={() =>
                        toggleArr(alleviatingFactors, v === "FACTOR_OTHER" ? "OTHER" : v, setAlleviatingFactors)
                      }
                    />
                  ))}
                </div>
                {alleviatingFactors.includes("OTHER") && (
                  <Input
                    placeholder={t("other")}
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
              {t("painMap.saveAndNext")}
            </Button>
          )}
        </TabsContent>

        {/* ── MEDICAL HISTORY ─────────────────────────────────────────────── */}
        <TabsContent value="medical_history" className="mt-4 space-y-4">
          <Section title={t("medicalHistory.title")}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("medicalHistory.lifeType")}</Label>
                <Select
                  value={history.lifeType}
                  onValueChange={(v) => setHistory((h) => ({ ...h, lifeType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEDENTARY">{t("medicalHistory.SEDENTARY")}</SelectItem>
                    <SelectItem value="NORMAL">{t("medicalHistory.LIFE_NORMAL")}</SelectItem>
                    <SelectItem value="ABNORMAL">{t("medicalHistory.ABNORMAL")}</SelectItem>
                    <SelectItem value="PROFESSIONAL">{t("medicalHistory.PROFESSIONAL")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.smokes")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.smokes} onCheckedChange={(v) => setHistory((h) => ({ ...h, smokes: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.smokes && (
                  <div className="mr-4 space-y-1.5">
                    <Label className="text-sm">{t("medicalHistory.smokingFrequency")}</Label>
                    <Input value={history.smokingFrequency} onChange={(e) => setHistory((h) => ({ ...h, smokingFrequency: e.target.value }))} placeholder={t("medicalHistory.smokingFrequencyPlaceholder")} disabled={!canEdit} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hasSmokedBefore")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hasSmokedBefore} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasSmokedBefore: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.hasSmokedBefore && (
                  <div className="mr-4 space-y-1.5">
                    <Label className="text-sm">{t("medicalHistory.smokingFrequency")}</Label>
                    <Input value={history.smokingFrequency} onChange={(e) => setHistory((h) => ({ ...h, smokingFrequency: e.target.value }))} placeholder={t("medicalHistory.smokingFrequencyPlaceholder")} disabled={!canEdit} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hasPacemaker")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hasPacemaker} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasPacemaker: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.hasPacemaker && (
                  <Input className="mr-4" value={history.pacemakerDetail} onChange={(e) => setHistory((h) => ({ ...h, pacemakerDetail: e.target.value }))} placeholder={t("medicalHistory.pacemakerDetail")} disabled={!canEdit} />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>{t("medicalHistory.allergies")}</Label>
                <Input value={history.allergies} onChange={(e) => setHistory((h) => ({ ...h, allergies: e.target.value }))} placeholder={t("medicalHistory.allergiesPlaceholder")} disabled={!canEdit} />
              </div>

              {patientFull?.gender === "FEMALE" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>{t("medicalHistory.isPregnant")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("no")}</span>
                      <Switch checked={history.isPregnant} onCheckedChange={(v) => setHistory((h) => ({ ...h, isPregnant: v }))} disabled={!canEdit} />
                      <span className="text-xs text-muted-foreground">{t("yes")}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("medicalHistory.maritalStatus")}</Label>
                    <Input value={history.maritalStatus} onChange={(e) => setHistory((h) => ({ ...h, maritalStatus: e.target.value }))} disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("medicalHistory.lastMenstrualPeriod")}</Label>
                    <Input value={history.lastMenstrualPeriod} onChange={(e) => setHistory((h) => ({ ...h, lastMenstrualPeriod: e.target.value }))} disabled={!canEdit} />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label>{t("medicalHistory.previousDiagnoses")}</Label>
                <Textarea rows={2} value={history.previousDiagnoses} onChange={(e) => setHistory((h) => ({ ...h, previousDiagnoses: e.target.value }))} disabled={!canEdit} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hasOtherHealthProblems")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hasOtherHealthProblems} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasOtherHealthProblems: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.hasOtherHealthProblems && (
                  <Input className="mr-4" value={history.otherConditions} onChange={(e) => setHistory((h) => ({ ...h, otherConditions: e.target.value }))} placeholder={t("medicalHistory.otherConditionsPlaceholder")} disabled={!canEdit} />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hasDoctorRestrictions")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hasDoctorRestrictions} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasDoctorRestrictions: v, doctorRestrictions: v ? h.doctorRestrictions : "" }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.hasDoctorRestrictions && (
                  <Input value={history.doctorRestrictions} onChange={(e) => setHistory((h) => ({ ...h, doctorRestrictions: e.target.value }))} placeholder={t("medicalHistory.doctorRestrictionsPlaceholder")} disabled={!canEdit} />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.prescriptionDrugs")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.prescriptionDrugs} onCheckedChange={(v) => setHistory((h) => ({ ...h, prescriptionDrugs: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.prescriptionDrugs && (
                  <Input className="mr-4" value={history.currentMedications} onChange={(e) => setHistory((h) => ({ ...h, currentMedications: e.target.value }))} placeholder={t("medicalHistory.currentMedicationsPlaceholder")} disabled={!canEdit} />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.herbalSupplements")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.herbalSupplements} onCheckedChange={(v) => setHistory((h) => ({ ...h, herbalSupplements: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.herbalSupplements && (
                  <Input className="mr-4" value={history.supplementsList} onChange={(e) => setHistory((h) => ({ ...h, supplementsList: e.target.value }))} placeholder={t("medicalHistory.supplementsListPlaceholder")} disabled={!canEdit} />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.adhesiveAllergy")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.adhesiveAllergy} onCheckedChange={(v) => setHistory((h) => ({ ...h, adhesiveAllergy: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.adhesiveAllergy && (
                  <Input className="mr-4" value={history.adhesiveAllergyDetail} onChange={(e) => setHistory((h) => ({ ...h, adhesiveAllergyDetail: e.target.value }))} placeholder={t("medicalHistory.adhesiveAllergyDetail")} disabled={!canEdit} />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>{t("medicalHistory.previousComplaintsSurgeries")}</Label>
                <Textarea rows={2} value={history.previousComplaintsSurgeries} onChange={(e) => setHistory((h) => ({ ...h, previousComplaintsSurgeries: e.target.value }))} disabled={!canEdit} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hadSurgeries")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hadSurgeries} onCheckedChange={(v) => setHistory((h) => ({ ...h, hadSurgeries: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {history.hadSurgeries && (
            <Section title={t("medicalHistory.surgeriesTitle")}>
              <div className="space-y-3">
                {surgeries.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("medicalHistory.surgeryName")} {i + 1}</Label>
                      <Input value={s.name} onChange={(e) => setSurgeries((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={t("medicalHistory.surgeryNamePlaceholder")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("medicalHistory.surgeryType")}</Label>
                      <Input value={s.type} onChange={(e) => setSurgeries((arr) => arr.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} placeholder={t("medicalHistory.surgeryTypePlaceholder")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("medicalHistory.surgeryDate")}</Label>
                      <Input value={s.date} onChange={(e) => setSurgeries((arr) => arr.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title={t("medicalHistory.ptOtherTreatmentsTitle")}>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hadPTSameProblem")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hadPTSameProblem} onCheckedChange={(v) => setHistory((h) => ({ ...h, hadPTSameProblem: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.hadPTSameProblem && (
                  <Input className="mr-4" value={history.ptSameProblemDetail} onChange={(e) => setHistory((h) => ({ ...h, ptSameProblemDetail: e.target.value }))} disabled={!canEdit} />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.receivingOtherTreatment")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.receivingOtherTreatment} onCheckedChange={(v) => setHistory((h) => ({ ...h, receivingOtherTreatment: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.receivingOtherTreatment && (
                  <Input className="mr-4" value={history.otherTreatmentDetail} onChange={(e) => setHistory((h) => ({ ...h, otherTreatmentDetail: e.target.value }))} placeholder={t("medicalHistory.otherTreatmentPlaceholder")} disabled={!canEdit} />
                )}
              </div>
            </div>
          </Section>

          <Section title={t("medicalHistory.testsTitle")}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="block">{t("medicalHistory.imagingType")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(TEST_LABELS) as [TestType, string][]).map(([tk, l]) => (
                    <ToggleChip key={tk} label={l} active={testsHad.includes(tk)} onClick={() => toggleArr(testsHad, tk, setTestsHad)} />
                  ))}
                </div>
                {testsHad.includes("OTHER") && (
                  <Input value={history.testsOther} onChange={(e) => setHistory((h) => ({ ...h, testsOther: e.target.value }))} placeholder={t("other")} disabled={!canEdit} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("medicalHistory.testResults")}</Label>
                <Textarea rows={2} value={history.testResults} onChange={(e) => setHistory((h) => ({ ...h, testResults: e.target.value }))} disabled={!canEdit} />
              </div>
              <Label className="block font-medium">{t("medicalHistory.analysisTitle")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("medicalHistory.newAnalysis")}</Label>
                  <Input value={history.newAnalysis} onChange={(e) => setHistory((h) => ({ ...h, newAnalysis: e.target.value }))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("medicalHistory.newAnalysisDate")}</Label>
                  <Input value={history.newAnalysisDate} onChange={(e) => setHistory((h) => ({ ...h, newAnalysisDate: e.target.value }))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("medicalHistory.oldAnalysis")}</Label>
                  <Input value={history.oldAnalysis} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysis: e.target.value }))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("medicalHistory.oldAnalysisDate")}</Label>
                  <Input value={history.oldAnalysisDate} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysisDate: e.target.value }))} disabled={!canEdit} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["new", "old"] as const).map((kind) => {
                  const label = kind === "new" ? t("medicalHistory.newAttachment") : t("medicalHistory.oldAttachment");
                  const attachKey = kind === "new" ? "newAnalysisAttachment" : "oldAnalysisAttachment";
                  const url = history[attachKey];
                  const isUploading = attachmentUploading === kind;
                  return (
                    <div key={kind} className="space-y-1.5">
                      <Label className="text-sm">{label}</Label>
                      {url ? (
                        <div className="flex items-center gap-2">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate flex-1">{t("viewFile")}</a>
                          {canEdit && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => setHistory((h) => ({ ...h, [attachKey]: "" }))}>{t("deleteFile")}</Button>
                          )}
                        </div>
                      ) : (
                        <label className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm cursor-pointer transition-colors ${isUploading ? "opacity-50 pointer-events-none" : "hover:bg-muted"}`}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          {isUploading ? t("uploading") : t("chooseFile")}
                          <input type="file" className="hidden" disabled={!canEdit || !!attachmentUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !c.patientId) return;
                              setAttachmentUploading(kind);
                              try {
                                const doc = await clinicPatientsApi.uploadDocument(c.patientId, file, "MEDICAL_REPORT");
                                setHistory((h) => ({ ...h, [attachKey]: doc.url ?? doc.filePath ?? "" }));
                              } catch {
                                toast.error(t("uploadFailed"));
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.boneDensityTest")}</Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.boneDensityTest} onCheckedChange={(v) => setHistory((h) => ({ ...h, boneDensityTest: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.boneDensityTest && (
                  <Input className="mr-4" value={history.boneDensityDetail} onChange={(e) => setHistory((h) => ({ ...h, boneDensityDetail: e.target.value }))} disabled={!canEdit} />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("medicalHistory.hospitalizedLastYear")}</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{t("no")}</span>
                    <Switch checked={history.hospitalizedLastYear} onCheckedChange={(v) => setHistory((h) => ({ ...h, hospitalizedLastYear: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">{t("yes")}</span>
                  </div>
                </div>
                {history.hospitalizedLastYear && (
                  <Input className="mr-4" value={history.hospitalizedDetail} onChange={(e) => setHistory((h) => ({ ...h, hospitalizedDetail: e.target.value }))} disabled={!canEdit} />
                )}
              </div>
            </div>
          </Section>

          <Section title={t("medicalHistory.chronicConditionsTitle")}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {CHRONIC_CONDITIONS.map((cond) => (
                <label key={cond} htmlFor={`cc-${cond}`} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" id={`cc-${cond}`} checked={chronicConditions.includes(cond)} onChange={() => toggleArr(chronicConditions, cond, setChronicConditions)} disabled={!canEdit} className="mt-0.5 h-4 w-4 accent-primary shrink-0" />
                  <span className="text-sm leading-snug">{CHRONIC_CONDITION_LABELS[cond]}</span>
                </label>
              ))}
            </div>
            {chronicConditions.includes("OTHER") && (
              <div className="mt-3">
                <Input value={history.chronicConditionsOther} onChange={(e) => setHistory((h) => ({ ...h, chronicConditionsOther: e.target.value }))} placeholder={t("other")} disabled={!canEdit} />
              </div>
            )}
          </Section>

          {canEdit && (
            <Button onClick={handleSaveHistory} disabled={submitHistory.isPending || updateStatus.isPending} className="w-full gap-2">
              {submitHistory.isPending || updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("medicalHistory.saveAndNext")}
            </Button>
          )}
        </TabsContent>

        {/* ── GOALS ─────────────────────────────────────────────────────── */}
        <TabsContent value="goals" className="mt-4 space-y-4">
          <Section title={t("goals.title")}>
            <div className="space-y-5">
              <div>
                <Label className="mb-3 block text-sm font-medium">{t("goals.question")}</Label>
                <div className="flex flex-wrap gap-2">
                  {PHYSIO_GOALS.map((g) => (
                    <ToggleChip key={g} label={PHYSIO_GOAL_LABELS[g]} active={goals.includes(g)} onClick={() => canEdit && toggleArr(goals, g, setGoals)} />
                  ))}
                  <ToggleChip label={t("goals.decreasePain")} active={goalsExtra.decreasePain} onClick={() => canEdit && setGoalsExtra((f) => ({ ...f, decreasePain: !f.decreasePain }))} />
                  <ToggleChip label={t("goals.improveStrength")} active={goalsExtra.improveStrength} onClick={() => canEdit && setGoalsExtra((f) => ({ ...f, improveStrength: !f.improveStrength }))} />
                  <ToggleChip label={t("goals.lessDifficulty")} active={goalsExtra.lessDifficultyWork} onClick={() => canEdit && setGoalsExtra((f) => ({ ...f, lessDifficultyWork: !f.lessDifficultyWork }))} />
                </div>
              </div>

              {goals.includes("OTHER") && (
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("goals.customGoal")}</Label>
                  <Input value={goalsExtra.customGoal} onChange={(e) => setGoalsExtra((f) => ({ ...f, customGoal: e.target.value }))} placeholder={t("goals.customGoalPlaceholder")} disabled={!canEdit} />
                </div>
              )}

              <Separator />

              <div>
                <p className="mb-3 text-xs text-muted-foreground">{t("goals.checkboxHint")}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">{t("goals.standLonger")}</span>
                    <Input className="h-8 w-24 text-sm" value={goalsExtra.standLonger} onChange={(e) => setGoalsExtra((f) => ({ ...f, standLonger: e.target.value }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t("goals.hoursMinutes")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">{t("goals.sleepLonger")}</span>
                    <Input className="h-8 w-24 text-sm" value={goalsExtra.sleepLonger} onChange={(e) => setGoalsExtra((f) => ({ ...f, sleepLonger: e.target.value }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t("goals.hoursMinutes")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">{t("goals.sitLonger")}</span>
                    <Input className="h-8 w-24 text-sm" value={goalsExtra.sitLonger} onChange={(e) => setGoalsExtra((f) => ({ ...f, sitLonger: e.target.value }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t("goals.hoursMinutes")}</span>
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
              {t("goals.saveAndNext")}
            </Button>
          )}
        </TabsContent>

        {/* ── POSTURAL ASSESSMENT ─────────────────────────────────────────── */}
        <TabsContent value="postural_assessment" className="mt-4 space-y-4">
          {/* Seated position + trunk control */}
          <div className="rounded-lg border bg-card p-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("posturalAssessment.seatedPosition")}</Label>
              <Input value={postural.seatedPosition} onChange={(e) => setPostural((p) => ({ ...p, seatedPosition: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("posturalAssessment.trunkControl")}</Label>
              <Input value={postural.trunkControl} onChange={(e) => setPostural((p) => ({ ...p, trunkControl: e.target.value }))} disabled={!canEdit} />
            </div>
          </div>

          {/* Head */}
          <Section title={t("posturalAssessment.head")}>
            <div className="space-y-2">
              {(
                [
                  ["headNeutral", t("posturalAssessment.neutral")],
                  ["headHyperextended", t("posturalAssessment.hyperextended")],
                  ["headFwdFlexed", t("posturalAssessment.fwdFlexed")],
                ] as [string, string][]
              ).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={(postural as any)[k]} onChange={(e) => setPostural((p) => ({ ...p, [k]: e.target.checked }))} disabled={!canEdit} />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm">{t("posturalAssessment.lateralFlexion")}</span>
                <div className="flex items-center gap-4">
                  {(
                    ["headLaterallyFlexedL", "headLaterallyFlexedR"] as const
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
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm">{t("posturalAssessment.rotation")}</span>
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
          <Section title={t("posturalAssessment.shoulders")}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={postural.shouldersLevel} onChange={(e) => setPostural((p) => ({ ...p, shouldersLevel: e.target.checked }))} disabled={!canEdit} />
                <span className="text-sm">{t("posturalAssessment.level")}</span>
              </label>
              {(
                [
                  ["shouldersElevatedL", "shouldersElevatedR", t("posturalAssessment.elevated")],
                  ["shouldersSublaxedL", "shouldersSublaxedR", t("posturalAssessment.sublaxed")],
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
          <Section title={t("posturalAssessment.elbow")}>
            <div className="space-y-2">
              {(
                [
                  ["elbowHyperextended", t("posturalAssessment.hyperextended")],
                  ["elbowFlexed", t("posturalAssessment.flexed")],
                ] as [string, string][]
              ).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={(postural as any)[k]} onChange={(e) => setPostural((p) => ({ ...p, [k]: e.target.checked }))} disabled={!canEdit} />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
              {(
                [
                  ["elbowSupinationL", "elbowSupinationR", t("posturalAssessment.supination")],
                  ["elbowPronationL", "elbowPronationR", t("posturalAssessment.pronation")],
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
          <Section title={t("posturalAssessment.ribCage")}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={postural.ribCageNeutral} onChange={(e) => setPostural((p) => ({ ...p, ribCageNeutral: e.target.checked }))} disabled={!canEdit} />
                <span className="text-sm">{t("posturalAssessment.ribCageNeutral")}</span>
              </label>
              {(
                [
                  ["ribCageElevatedL", "ribCageElevatedR", t("posturalAssessment.ribCageElevated")],
                  ["ribCageRotatedFwdL", "ribCageRotatedFwdR", t("posturalAssessment.ribCageRotatedFwd")],
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
          <Section title={t("posturalAssessment.spine")}>
            <div className="space-y-2">
              {(
                [
                  ["spineNeutral", t("posturalAssessment.neutral")],
                  ["spineKyphosis", t("posturalAssessment.kyphosis")],
                  ["spineFlatLumbar", t("posturalAssessment.flatLumbar")],
                  ["spineNormalLumbar", t("posturalAssessment.normalLumbar")],
                  ["spineHyperLordotic", t("posturalAssessment.hyperLordotic")],
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
                <span className="text-sm">{t("posturalAssessment.scoliosis")}</span>
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
          <Section title={t("posturalAssessment.pelvis")}>
            <div className="space-y-2">
              {(
                [
                  ["pelvisNeutral", t("posturalAssessment.neutral")],
                  ["pelvisRotatedFwd", t("posturalAssessment.rotatedFwd")],
                  ["pelvisAnteriorTilt", t("posturalAssessment.anteriorTilt")],
                  ["pelvisPosteriorTilt", t("posturalAssessment.posteriorTilt")],
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
                <span className="text-sm">{t("posturalAssessment.oblique")}</span>
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
                <span className="text-sm whitespace-nowrap">{t("posturalAssessment.other")}</span>
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
          <Section title={t("posturalAssessment.hips")}>
            <div className="space-y-2">
              {(
                [
                  ["hipsAbductedL", "hipsAbductedR", t("posturalAssessment.abducted")],
                  ["hipsAdductedL", "hipsAdductedR", t("posturalAssessment.adducted")],
                  ["hipsFlexedL", "hipsFlexedR", t("posturalAssessment.flexed")],
                  ["hipsExtendedL", "hipsExtendedR", t("posturalAssessment.extended")],
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
          <Section title={t("posturalAssessment.knees")}>
            <div className="space-y-2">
              {(
                [
                  ["kneesFlexedBeyond90L", "kneesFlexedBeyond90R", `${t("posturalAssessment.flexed")} >90°`],
                  ["kneesExtendedBeyond90L", "kneesExtendedBeyond90R", `${t("posturalAssessment.extended")} >90°`],
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
          <Section title={t("posturalAssessment.feet")}>
            <div className="space-y-2">
              {(
                [
                  ["feetPronateEvertL", "feetPronateEvertR", t("posturalAssessment.pronateEvert")],
                  ["feetSupinateInvL", "feetSupinateInvR", t("posturalAssessment.supinateInv")],
                  ["feetDorsiflexedL", "feetDorsiflexedR", t("posturalAssessment.dorsiflexed")],
                  ["feetPlantarflexedL", "feetPlantarflexedR", t("posturalAssessment.plantarflexed")],
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
                <span className="text-sm whitespace-nowrap">{t("posturalAssessment.other")}</span>
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
          <Section title={t("posturalAssessment.notesTitle")}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">{t("posturalAssessment.spasticityNotes")}</Label>
                <Textarea rows={2} value={postural.spasticityNotes} onChange={(e) => setPostural((p) => ({ ...p, spasticityNotes: e.target.value }))} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("posturalAssessment.generalNotes")}</Label>
                <Textarea rows={2} value={postural.generalNotes} onChange={(e) => setPostural((p) => ({ ...p, generalNotes: e.target.value }))} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("posturalAssessment.diagnosis")}</Label>
                <Input value={postural.diagnosis} onChange={(e) => setPostural((p) => ({ ...p, diagnosis: e.target.value }))} disabled={!canEdit} />
              </div>
            </div>
          </Section>

          {canEdit && (
            <Button onClick={handleSavePostural} disabled={submitPostural.isPending || updateStatus.isPending} className="w-full gap-2">
              {submitPostural.isPending || updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("posturalAssessment.saveAndNext")}
            </Button>
          )}
        </TabsContent>

        {/* ── TREATMENT PLAN ──────────────────────────────────────────────── */}
        <TabsContent value="treatment_plan" className="mt-4 space-y-4">
          {/* Header */}
          <Section title={t("treatmentPlan.headerTitle")}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{t("treatmentPlan.from")}</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={planHeader.treatmentFrom}
                    onChange={(e) =>
                      setPlanHeader((h) => ({ ...h, treatmentFrom: e.target.value }))
                    }
                    placeholder={t("treatmentPlan.fromPlaceholder")}
                    disabled={!canEdit}
                  />
                  <div className="relative shrink-0">
                    <input
                      type="date"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      disabled={!canEdit}
                      onChange={(e) =>
                        setPlanHeader((h) => ({ ...h, treatmentFrom: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("treatmentPlan.to")}</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={planHeader.treatmentTo}
                    onChange={(e) =>
                      setPlanHeader((h) => ({ ...h, treatmentTo: e.target.value }))
                    }
                    placeholder={t("treatmentPlan.toPlaceholder")}
                    disabled={!canEdit}
                  />
                  <div className="relative shrink-0">
                    <input
                      type="date"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      disabled={!canEdit}
                      onChange={(e) =>
                        setPlanHeader((h) => ({ ...h, treatmentTo: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("treatmentPlan.anticipatedVisits")}</Label>
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
                <Label className="text-sm">{t("treatmentPlan.physiotherapistName")}</Label>
                <Select
                  value={planPhysiotherapistIds[0] ?? ""}
                  onValueChange={(v) => canEdit && setPlanPhysiotherapistIds(v ? [v] : [])}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("treatmentPlan.physiotherapistName")} />
                  </SelectTrigger>
                  <SelectContent>
                    {physioEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstNameAr} {emp.lastNameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">{t("treatmentPlan.caseManager")}</Label>
                <Select value={planHeader.caseManagerId || ""} onValueChange={(v) => canEdit && setPlanHeader((h) => ({ ...h, caseManagerId: v }))} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("treatmentPlan.caseManagerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {caseManagerOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{t("treatmentPlan.patientStatus")}</p>
                  <p className="text-xs text-muted-foreground">
                    {planStatus === "ACTIVE" ? t("treatmentPlan.active") : t("treatmentPlan.inactive")}
                  </p>
                </div>
                <Switch
                  checked={planStatus === "ACTIVE"}
                  onCheckedChange={(v) =>
                    canEdit && setPlanStatus(v ? "ACTIVE" : "INACTIVE")
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>
          </Section>

          {/* Modalities — 2-col checkbox grid */}
          <Section title={t("treatmentPlan.modalitiesTitle")}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {THERAPY_MODALITY_PAIRS.flatMap(([right, left]) =>
                (left ? [right, left] : [right]).map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-border accent-primary" checked={planModalities.includes(m)} onChange={(e) => { if (!canEdit) return; setPlanModalities((prev) => e.target.checked ? [...prev, m] : prev.filter((x) => x !== m)); }} disabled={!canEdit} />
                    <span className="text-sm leading-tight">{THERAPY_MODALITY_LABELS[m]}</span>
                  </label>
                )),
              )}
            </div>
            {planModalities.includes("OTHER") && (
              <Input className="mt-3" placeholder={t("evaluation.otherModalityPlaceholder")} value={planOtherModality} onChange={(e) => setPlanOtherModality(e.target.value)} disabled={!canEdit} />
            )}
          </Section>

          <Section title={t("treatmentPlan.remarksTitle")}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">{t("treatmentPlan.remarks")}</Label>
                <Textarea rows={3} value={planObservation} onChange={(e) => setPlanObservation(e.target.value)} disabled={!canEdit} placeholder={t("treatmentPlan.remarkPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("treatmentPlan.summary")}</Label>
                <Textarea rows={2} value={planRemarks} onChange={(e) => setPlanRemarks(e.target.value)} disabled={!canEdit} />
              </div>
            </div>
          </Section>

          {canEdit && (
            <Button onClick={handleSavePlan} disabled={submitPlan.isPending || updateStatus.isPending} className="w-full gap-2">
              {submitPlan.isPending || updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("treatmentPlan.save")}
            </Button>
          )}
        </TabsContent>

        {/* ── SUPERVISOR REVIEW ───────────────────────────────────────────── */}
        {/* ── EVALUATION ──────────────────────────────────────────────────── */}
        <TabsContent value="evaluation" className="mt-4 space-y-4">
          <Section title={t("evaluation.diagnosisTitle")}>
            <Textarea rows={4} placeholder={t("evaluation.diagnosisPlaceholder")} value={evalNotes} onChange={(e) => setEvalNotes(e.target.value)} disabled={!canEdit} />
          </Section>

          <Section title={t("evaluation.appliedTreatmentTitle")}>
            {/* Modalities grid — 2 columns matching paper form */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {EVAL_MODALITY_PAIRS.flatMap(([right, left]) =>
                (left ? [right, left] : [right]).map((m) => (
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
              <Input className="mt-3" placeholder={t("evaluation.otherModalityPlaceholder")} value={evalOtherModality} onChange={(e) => setEvalOtherModality(e.target.value)} disabled={!canEdit} />
            )}
          </Section>

          {canEdit && (
            <Button
              onClick={async () => {
                await submitEval.mutateAsync({
                  id,
                  dto: {
                    modalities: evalModalities.length ? evalModalities : undefined,
                    otherModality: evalModalities.includes("OTHER") ? evalOtherModality || undefined : undefined,
                    notes: evalNotes || undefined,
                    evaluation: evalText || undefined,
                  },
                });
                await tryAdvanceStatus("TREATMENT_PLAN", "EVALUATION");
              }}
              disabled={submitEval.isPending}
              className="w-full gap-2"
            >
              {submitEval.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("evaluation.save")}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="supervisor_review" className="mt-4">
          <Section title={t("supervisorReview.title")}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("supervisorReview.label")}</Label>
                <Textarea rows={4} value={supervisorGaze} onChange={(e) => setSupervisorGaze(e.target.value)} placeholder={t("supervisorReview.placeholder")} />
              </div>
              {c.status === "ACTIVE_TREATMENT" ? (
                <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.SUPERVISOR_REVIEW}>
                  <Button onClick={handleSupervisorReview} disabled={supervisorRev.isPending} className="w-full gap-2">
                    {supervisorRev.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("supervisorReview.approveAndReview")}
                  </Button>
                </ActionGuard>
              ) : (
                !["COMPLETED", "DISCHARGED", "CANCELLED"].includes(c.status) && (
                  <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.SUPERVISOR_REVIEW}>
                    <Button variant="outline" onClick={handleSupervisorReview} disabled={supervisorRev.isPending} className="w-full gap-2">
                      {supervisorRev.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t("supervisorReview.saveNotes")}
                    </Button>
                  </ActionGuard>
                )
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── DOCTOR REVIEW ───────────────────────────────────────────────── */}
        <TabsContent value="doctor_review" className="mt-4">
          <Section title={t("doctorReview.title")}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("doctorReview.label")}</Label>
                <Textarea rows={4} value={doctorGaze} onChange={(e) => setDoctorGaze(e.target.value)} placeholder={t("doctorReview.placeholder")} disabled={!["SUPERVISOR_REVIEW", "DOCTOR_REVIEW"].includes(c.status)} />
              </div>
              {c.status === "SUPERVISOR_REVIEW" && (
                <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.PLAN_SIGN}>
                  <Button onClick={handleDoctorReview} disabled={doctorRev.isPending || updateStatus.isPending} className="w-full gap-2">
                    {doctorRev.isPending || updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("doctorReview.approveDoctorReview")}
                  </Button>
                </ActionGuard>
              )}
              {c.status === "DOCTOR_REVIEW" && (
                <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.PLAN_SIGN}>
                  <Button onClick={handleCompleteCase} disabled={updateStatus.isPending} className="w-full gap-2">
                    {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("doctorReview.closeCase")}
                  </Button>
                </ActionGuard>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── SESSIONS ────────────────────────────────────────────────────── */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          {canEdit && (
            <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.SESSIONS_CREATE}>
              <Section title={t("sessions.addTitle")}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("sessions.date")}</Label>
                    <Input type="date" value={sessionForm.date} onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("sessions.time")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal">
                          <span className={sessionForm.sessionTime ? "" : "text-muted-foreground"}>
                            {sessionForm.sessionTime || "--:--"}
                          </span>
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start">
                        <div className="text-center text-3xl font-bold tracking-widest mb-3 text-primary">
                          {sessionForm.sessionTime || "--:--"}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">الساعة</p>
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {Array.from({ length: 9 }, (_, i) => {
                            const h = String(10 + i).padStart(2, "0");
                            const active = sessionForm.sessionTime?.split(":")[0] === h;
                            return (
                              <button key={h} type="button"
                                className={`py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground shadow" : "bg-muted hover:bg-muted/70"}`}
                                onClick={() => {
                                  const m = sessionForm.sessionTime?.split(":")[1] || "00";
                                  setSessionForm((f) => ({ ...f, sessionTime: `${h}:${m}` }));
                                }}
                              >{h}</button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">الدقيقة</p>
                        <div className="grid grid-cols-6 gap-1">
                          {Array.from({ length: 60 }, (_, i) => {
                            const m = String(i).padStart(2, "0");
                            const active = sessionForm.sessionTime?.split(":")[1] === m;
                            return (
                              <button key={m} type="button"
                                className={`py-1 rounded text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground shadow" : "bg-muted hover:bg-muted/70"}`}
                                onClick={() => {
                                  const h = sessionForm.sessionTime?.split(":")[0] || "10";
                                  setSessionForm((f) => ({ ...f, sessionTime: `${h}:${m}` }));
                                }}
                              >{m}</button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">{t("sessions.notes")}</Label>
                    <Textarea rows={2} value={sessionForm.notes} onChange={(e) => { setSessionForm((f) => ({ ...f, notes: e.target.value })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} className="resize-none overflow-hidden" placeholder={t("sessions.notesPlaceholder")} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">{t("sessions.supervisorOpinion")}</Label>
                    <Textarea rows={2} value={sessionForm.supervisorOpinion} onChange={(e) => { setSessionForm((f) => ({ ...f, supervisorOpinion: e.target.value })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} className="resize-none overflow-hidden" placeholder={t("sessions.supervisorOpinionPlaceholder")} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">{t("sessions.doctorDecision")}</Label>
                    <Textarea rows={2} value={sessionForm.doctorDecision} onChange={(e) => { setSessionForm((f) => ({ ...f, doctorDecision: e.target.value })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} className="resize-none overflow-hidden" placeholder={t("sessions.doctorDecisionPlaceholder")} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddSession} disabled={!sessionForm.date || addSession.isPending} className="flex-1 gap-2">
                    {addSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t("sessions.addSession")}
                  </Button>
                  <Button variant="outline" onClick={() => tryAdvanceStatus("ACTIVE_TREATMENT", "SUPERVISOR_REVIEW")} disabled={sessions.length === 0}>
                    {t("sessions.endSessions")}
                  </Button>
                </div>
              </Section>
            </ActionGuard>
          )}

          {sessions.length > 0 && (
            <Section title={`${t("sessions.sessionsListTitle")} (${sessions.length})`}>
              <div className="space-y-3">
                {[...sessions].sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)).map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 space-y-2">
                    {editingSession?.id === s.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("sessions.date")}</Label>
                            <Input type="date" value={editingSession.sessionDate} onChange={(e) => setEditingSession((v) => v && { ...v, sessionDate: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("sessions.time")}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal">
                                  <span className={editingSession.sessionTime ? "" : "text-muted-foreground"}>
                                    {editingSession.sessionTime || "--:--"}
                                  </span>
                                  <CalendarIcon className="h-4 w-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" align="start">
                                <div className="text-center text-3xl font-bold tracking-widest mb-3 text-primary">
                                  {editingSession.sessionTime || "--:--"}
                                </div>
                                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">الساعة</p>
                                <div className="grid grid-cols-3 gap-1.5 mb-3">
                                  {Array.from({ length: 9 }, (_, i) => {
                                    const h = String(10 + i).padStart(2, "0");
                                    const active = editingSession.sessionTime?.split(":")[0] === h;
                                    return (
                                      <button key={h} type="button"
                                        className={`py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground shadow" : "bg-muted hover:bg-muted/70"}`}
                                        onClick={() => {
                                          const m = editingSession.sessionTime?.split(":")[1] || "00";
                                          setEditingSession((s) => s && { ...s, sessionTime: `${h}:${m}` });
                                        }}
                                      >{h}</button>
                                    );
                                  })}
                                </div>
                                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">الدقيقة</p>
                                <div className="grid grid-cols-6 gap-1">
                                  {Array.from({ length: 60 }, (_, i) => {
                                    const m = String(i).padStart(2, "0");
                                    const active = editingSession.sessionTime?.split(":")[1] === m;
                                    return (
                                      <button key={m} type="button"
                                        className={`py-1 rounded text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground shadow" : "bg-muted hover:bg-muted/70"}`}
                                        onClick={() => {
                                          const h = editingSession.sessionTime?.split(":")[0] || "10";
                                          setEditingSession((s) => s && { ...s, sessionTime: `${h}:${m}` });
                                        }}
                                      >{m}</button>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">{t("sessions.notes")}</Label>
                            <Textarea rows={2} value={editingSession.notes} onChange={(e) => setEditingSession((v) => v && { ...v, notes: e.target.value })} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">{t("sessions.supervisorOpinion")}</Label>
                            <Textarea rows={2} value={editingSession.supervisorOpinion} onChange={(e) => setEditingSession((v) => v && { ...v, supervisorOpinion: e.target.value })} placeholder={t("sessions.supervisorOpinionPlaceholder")} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">{t("sessions.doctorDecision")}</Label>
                            <Textarea rows={2} value={editingSession.doctorDecision} onChange={(e) => setEditingSession((v) => v && { ...v, doctorDecision: e.target.value })} placeholder={t("sessions.doctorDecisionPlaceholder")} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateSession} disabled={updateSessionMut.isPending} className="gap-1">
                            {updateSessionMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {t("sessions.save")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSession(null)}>
                            {t("sessions.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start cursor-pointer select-none" onClick={() => setExpandedSessionId((prev) => prev === s.id ? null : s.id)}>
                          <div className="flex gap-2 items-center flex-wrap">
                            <Badge variant="secondary" className="text-base font-bold px-3 py-1">#{s.sessionNumber}</Badge>
                            <span className="font-medium text-sm">{new Date(s.sessionDate).toLocaleDateString("en-GB")}</span>
                            {s.sessionTime && <span className="text-xs text-muted-foreground">{s.sessionTime}</span>}
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <button
                                onClick={() => setEditingSession({ id: s.id, sessionDate: s.sessionDate?.slice(0, 10) ?? "", sessionTime: s.sessionTime ?? "", notes: s.notes ?? "", supervisorOpinion: s.supervisorOpinion ?? "", doctorDecision: s.doctorDecision ?? "", modalities: s.modalities ?? [] })}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title={t("sessions.edit")}
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => setConfirmDeleteSessionId(s.id)} className="text-destructive hover:opacity-70 p-1">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {expandedSessionId === s.id && (
                          <div className="space-y-2 pt-1">
                            {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                            {s.modalities && s.modalities.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {s.modalities.map((m) => (
                                  <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0">{THERAPY_MODALITY_LABELS[m]}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 border-t pt-2">
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-medium text-muted-foreground">{t("sessions.supervisorOpinion")}</p>
                                <p className="text-xs">{s.supervisorOpinion || <span className="text-muted-foreground/50">—</span>}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-medium text-muted-foreground">{t("sessions.doctorDecision")}</p>
                                <p className="text-xs">{s.doctorDecision || <span className="text-muted-foreground/50">—</span>}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title={t("sessions.finalSummaryTitle")}>
            <div className="space-y-3">
              <Textarea rows={5} value={finalSummary} onChange={(e) => setFinalSummary(e.target.value)} placeholder={t("sessions.finalSummaryPlaceholder")} />
              <div className="flex gap-2">
                <Button onClick={handleSaveFinalSummary} disabled={!finalSummary || submitFinalSummary.isPending} className="flex-1 gap-2">
                  {submitFinalSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("sessions.saveSummary")}
                </Button>
                <Button variant="outline" onClick={() => downloadFinalPdf.mutate(id)} disabled={downloadFinalPdf.isPending} className="gap-2">
                  {downloadFinalPdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("sessions.exportPdf")}
                </Button>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── EMERGENCY ───────────────────────────────────────────────────── */}
        <TabsContent value="emergency" className="mt-4 space-y-6">
          {/* زر إرسال التنبيه */}
          {canSendAlert && (
            <Section title="إرسال تنبيه طارئ">
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-sm text-muted-foreground text-center">
                  اضغط الزر لإرسال تنبيه طارئ فوري للموظف الثابت
                </p>
                <Button
                  variant="destructive"
                  size="lg"
                  className="gap-2 px-8"
                  onClick={() => sendAlert.mutate()}
                  disabled={sendAlert.isPending}
                >
                  {sendAlert.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
                  إرسال تنبيه طارئ
                </Button>
              </div>
            </Section>
          )}

          {/* تنبيهاتي المُرسَلة */}
          {canSendAlert && (
            <Section title="تنبيهاتي المُرسَلة">
              {(myAlerts as any[]).length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">لا توجد تنبيهات مُرسَلة</p>
              ) : (
                <div className="space-y-2">
                  {(myAlerts as any[]).map((alert: any) => (
                    <div key={alert.id} className="flex items-start justify-between rounded-lg border p-3 gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.status === "RESPONDED" ? "default" : "destructive"} className="text-xs">
                            {alert.status === "RESPONDED" ? "تم الرد" : "بانتظار الرد"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString(locale)}
                          </span>
                        </div>
                        {alert.note && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">رد الموظف: </span>{alert.note}
                          </p>
                        )}
                        {alert.respondedAt && (
                          <p className="text-xs text-muted-foreground">
                            رُدَّ عليه في: {new Date(alert.respondedAt).toLocaleString(locale)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* التنبيهات الواردة (الموظف الثابت) */}
          {!canSendAlert && (
            <Section title="التنبيهات الطارئة الواردة">
              {(incomingAlerts as any[]).length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">لا توجد تنبيهات واردة</p>
              ) : (
                <div className="space-y-3">
                  {(incomingAlerts as any[]).map((alert: any) => (
                    <div key={alert.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-sm">تنبيه طارئ</span>
                          <Badge variant={alert.status === "RESPONDED" ? "secondary" : "destructive"} className="text-xs">
                            {alert.status === "RESPONDED" ? "تم الرد" : "جديد"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString(locale)}
                        </span>
                      </div>

                      {alert.note ? (
                        <p className="text-sm bg-muted/50 rounded p-2">
                          <span className="font-medium">ردك: </span>{alert.note}
                        </p>
                      ) : (
                        respondingAlertId === alert.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={respondNote}
                              onChange={(e) => setRespondNote(e.target.value)}
                              placeholder="اكتب ملاحظتك هنا..."
                              rows={3}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!respondNote.trim()) return;
                                  await respondAlert.mutateAsync({ id: alert.id, note: respondNote.trim() });
                                  setRespondingAlertId(null);
                                  setRespondNote("");
                                }}
                                disabled={respondAlert.isPending || !respondNote.trim()}
                              >
                                {respondAlert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "إرسال الرد"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setRespondingAlertId(null); setRespondNote(""); }}
                              >
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setRespondingAlertId(alert.id)}
                          >
                            <Bell className="h-3.5 w-3.5" />
                            الرد على التنبيه
                          </Button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </TabsContent>

        {/* ── TIMELINE ────────────────────────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-4">
          <Section title={t("timeline.title")}>
            {timeline.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t("timeline.empty")}</p>
            ) : (
              <div className="relative space-y-4 pr-4">
                <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-border" />
                {timeline.map((ev) => (
                  <div key={ev.id} className="relative flex gap-3">
                    <div className="absolute -right-4 top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    <div className="flex-1 rounded-lg border p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString(locale)}</span>
                      </div>
                      {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                      {ev.actorName && <p className="text-xs text-muted-foreground">{t("timeline.by")} {ev.actorName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDeleteSessionId !== null} onOpenChange={(o) => !o && setConfirmDeleteSessionId(null)}>
        <DialogContent className="max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("deleteSession.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteSession.confirm")}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteSessionId(null)}>{t("deleteSession.cancel")}</Button>
            <Button variant="destructive" onClick={() => { if (confirmDeleteSessionId) { deleteSession.mutate({ id, sessionId: confirmDeleteSessionId }); setConfirmDeleteSessionId(null); } }}>
              {t("deleteSession.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignaturePadDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title={t("sign.title")}
        legalNotice={t("sign.legalNotice")}
        onSign={handleSign}
        isLoading={signPlan.isPending}
      />
    </div>
  );
}
