"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowRight, User, Clock, Trash2, Plus, Download, Loader2,
  CheckCircle2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { KLevelSelector } from "@/components/clinic/k-level-selector";
import { AmputationLevelSelector } from "@/components/clinic/amputation-level-selector";
import { SignaturePadDialog } from "@/components/clinic/signature-pad-dialog";
import { PdfExportButton } from "@/components/clinic/pdf-export-button";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { useClinicPatient, useUpdateClinicPatient, usePatientDocuments } from "@/lib/hooks/use-clinic-patients";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import {
  useProstheticsCase, useUpdateProstheticsCase, useUpdateProstheticsStatus,
  useSubmitAssessmentUpper, useSubmitAssessmentLower,
  useSubmitCommitteeOpinion, useSubmitCommitteeDecision, useSignCommitteeDecision,
  useCaseComponents, useAddCaseComponent, useDeleteCaseComponent,
  useSubmitGaitAnalysis, useSubmitBalanceAssessment,
  useAddConsumable, useSubmitFinalEvaluation, useSignFinalEvaluation,
  useSubmitDelivery, useSignDelivery,
  useProstheticsFollowUps, useAddProstheticsFollowUp,
  useProstheticsTimeline, useDownloadProstheticsPdf,
} from "@/lib/hooks/use-clinic-prosthetics";
import {
  ProstheticsStatus, ProstheticsCase,
  AmputationType, AmputationSide, AmputationCause, KLevel, CommitteeDecision, ProstheticType,
} from "@/lib/api/clinic-prosthetics";

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = { UPPER: "طرف علوي", LOWER: "طرف سفلي" };
const SIDE_LABEL: Record<string, string> = { RIGHT: "أيمن", LEFT: "أيسر", BILATERAL: "ثنائي" };
const DECISION_LABEL: Record<CommitteeDecision, string> = {
  APPROVED: "مقبول", NEEDS_ADJUSTMENT: "يحتاج تعديل", REJECTED: "مرفوض",
};
const PROSTHETIC_TYPE_LABEL: Record<ProstheticType, string> = {
  BIONIC: "بيوني", MYOBOCK: "ميوبوك", MECHANIC: "ميكانيكي", COSMETIC: "تجميلي",
};

// ─── Workflow step order ───────────────────────────────────────────────────────

const STATUS_ORDER: ProstheticsStatus[] = [
  "INTAKE", "ASSESSMENT", "COMMITTEE_REVIEW", "COMMITTEE_APPROVED",
  "FITTING", "GAIT_ANALYSIS", "FINAL_EVALUATION", "DELIVERED", "FOLLOW_UP",
];

function StepIndicator({ status }: { status: ProstheticsStatus }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1 shrink-0">
          <div className={`w-2 h-2 rounded-full ${
            i < idx ? "bg-primary" : i === idx ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/30"
          }`} />
          {i < STATUS_ORDER.length - 1 && (
            <div className={`h-0.5 w-4 ${i < idx ? "bg-primary" : "bg-muted-foreground/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Patient photo via authenticated download ─────────────────────────────────
function PatientPhotoViewer({ patientId, docId }: { patientId: string; docId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string;
    clinicPatientsApi.downloadDocument(patientId, docId).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [patientId, docId]);
  if (!src) return <span className="opacity-40 text-xs">جاري التحميل...</span>;
  return <img src={src} alt="الصورة الشخصية" className="h-full w-full object-cover" />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Paper-form helpers ───────────────────────────────────────────────────────

function PfSq({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1 text-sm leading-none ${checked ? "text-primary" : "text-foreground"}`}>
      <span className={`inline-flex h-3.5 w-3.5 border rounded-none shrink-0 items-center justify-center transition-colors ${checked ? "border-primary bg-primary" : "border-foreground/50"}`}>
        {checked && <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1.5,5 4,7.5 8.5,2.5" /></svg>}
      </span>
      <span>{label}</span>
    </button>
  );
}

function PfNumPicker({ value, onChange, max = 10 }: { value: number | null; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`h-6 w-6 border rounded-none text-xs flex items-center justify-center font-medium transition-colors ${value === n ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/50"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function PfGrader({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[0,1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`h-6 w-6 border rounded-none text-xs flex items-center justify-center font-medium transition-colors ${value === n ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/50"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function PfRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-52 pt-0.5 leading-tight">{label}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1">{children}</div>
    </div>
  );
}

function PfDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex-1 border-t border-border/50" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{label}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProstheticsCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: caseData, isLoading } = useProstheticsCase(id);
  const { data: patientFull } = useClinicPatient(caseData?.patientId ?? "");
  const { data: patientDocs = [] } = usePatientDocuments(caseData?.patientId ?? "");
  const { data: components = [] } = useCaseComponents(id);
  const { data: followUps = [] } = useProstheticsFollowUps(id);
  const { data: timeline = [] } = useProstheticsTimeline(id);

  const qc = useQueryClient();
  const updateCase = useUpdateProstheticsCase();
  const updateStatus = useUpdateProstheticsStatus();
  const updatePatient = useUpdateClinicPatient();
  const submitAssessmentUpper = useSubmitAssessmentUpper();
  const submitAssessmentLower = useSubmitAssessmentLower();
  const submitOpinion = useSubmitCommitteeOpinion();
  const submitDecision = useSubmitCommitteeDecision();
  const signDecision = useSignCommitteeDecision();
  const addComponent = useAddCaseComponent();
  const deleteComponent = useDeleteCaseComponent();
  const submitGait = useSubmitGaitAnalysis();
  const submitBalance = useSubmitBalanceAssessment();
  const addConsumable = useAddConsumable();
  const submitFinalEval = useSubmitFinalEvaluation();
  const signFinalEval = useSignFinalEvaluation();
  const submitDelivery = useSubmitDelivery();
  const signDelivery = useSignDelivery();
  const addFollowUp = useAddProstheticsFollowUp();
  const downloadPdf = useDownloadProstheticsPdf();

  // ── Local form state ──
  const [intakeForm, setIntakeForm] = useState({
    amputationType: "", amputationSide: "", amputationLevel: "",
    amputationDate: "", amputationCause: "", amputationCauseOtherDetail: "", amputationCount: "1",
    appointmentDate: "", appointmentTime: "",
    hasChronicDiseases: null as boolean | null,
    chronicDiseases: "",
    hasPhysicalTherapy: null as boolean | null,
    physicalTherapyDetails: "",
    hasPreviousProsthesis: null as boolean | null,
    previousProsthesisDetails: "",
    previousProsthesisWhen: "",
    previousProsthesisWhere: "",
    previousProsthesisType: "",
    hasRevisionSurgery: null as boolean | null,
    revisionDetails: "",
  });
  // ── General assessment (PUT) ──
  const [genAssessForm, setGenAssessForm] = useState({
    amputationDate: "",
    amputationCause: "",
    amputationCauseOtherDetail: "",
    clinicalHistory: "",
    moreAffectedSide: "",
    currentlyUsingProsthesis: null as boolean | null,
    previouslyUsedProsthesis: null as boolean | null,
    previousProsthesisSystemDetail: "",
  });

  // ── Upper assessment form ──
  const emptyUpperForm = () => ({
    amputationSide: "" as "RIGHT" | "LEFT" | "BILATERAL" | "",
    side: "LEFT" as "LEFT" | "RIGHT",
    residualLimbLength: "" as string,
    residualLimbShape: "" as string,
    amputationLevelNote: "",
    painPresent: null as boolean | null,
    painIntensity: 0,
    painTypes: [] as string[],
    painTypeOtherDetail: "",
    phantomPainPresent: null as boolean | null,
    phantomPainIntensity: 0,
    neuromaPalpable: null as boolean | null,
    skinNotes: "",
    skinAppearance: [] as string[],
    skinColor: [] as string[],
    skinTemperature: "" as string,
    scarCondition: [] as string[],
    hasSkinGrafts: false,
    graftArea: "",
    closureNotes: "",
    generalHealthNotes: "",
    otherLimbCondition: "",
    canBalanceOneSide: false,
    usesCompressionBandage: false,
    jointsRangeOfMotion: "" as string,
    activityLevel: "" as string,
    // قوة العضلات
    msElbowFlexion: false,
    msElbowExtension: false,
    msElbowPronation: false,
    msElbowSupination: false,
    msShoulderExtension: false,
    msShoulderFlexion: false,
    msShoulderAdduction: false,
    msShoulderAbduction: false,
    msShoulderInternalRotation: false,
    msWristFlexion: false,
    msWristExtension: false,
    msWristRadialDeviation: false,
    msWristUlnarDeviation: false,
    msNotes: "",
  });
  const [upperAssessForm, setUpperAssessForm] = useState(emptyUpperForm());

  // ── Lower assessment form ──
  const emptyLowerForm = () => ({
    amputationSide: "" as "RIGHT" | "LEFT" | "BILATERAL" | "",
    side: "LEFT" as "LEFT" | "RIGHT",
    residualLimbLength: "" as string,
    residualLimbShape: "" as string,
    amputationLevelNote: "",
    painPresent: null as boolean | null,
    painIntensity: 0,
    painArea: "",
    painTypes: [] as string[],
    painTypeOtherDetail: "",
    phantomPainPresent: null as boolean | null,
    phantomPainIntensity: 0,
    neuromaPalpable: null as boolean | null,
    loadTolerance: "" as string,
    weightBearingLevel: "" as string,
    notes: "",
    skinAppearance: [] as string[],
    skinColor: [] as string[],
    skinTemperature: "" as string,
    scarCondition: [] as string[],
    hasSkinGrafts: false,
    graftArea: "",
    generalHealthNotes: "",
    otherLimbCondition: "",
    usesAssistiveDevices: null as boolean | null,
    assistiveDeviceTypes: "",
    canClimbStairs: null as boolean | null,
    canBalanceOneSide: null as boolean | null,
    jointsRangeOfMotion: "" as string,
    activityLevel: "" as string,
    romData: {
      ankle: { dorsiflexion: false, plantarFlexion: false, inversion: false, eversion: false },
      knee: { flexion: false, extension: false },
      hip: { flexion: false, extension: false, abduction: false, adduction: false, internalRotation: false },
    } as Record<string, any>,
    muscleMotionNotes: "",
  });
  const [lowerAssessForm, setLowerAssessForm] = useState(emptyLowerForm());
  const [prosthetistOpinion, setProsthetistOpinion] = useState("");
  const [physioOpinion, setPhysioOpinion] = useState("");
  const [doctorOpinion, setDoctorOpinion] = useState("");
  const [decisionForm, setDecisionForm] = useState({ finalSummary: "" });
  const [prosthesisTypeForm, setProsthesisTypeForm] = useState("" as ProstheticType | "");
  const [signOpen, setSignOpen] = useState(false);
  const [signRole, setSignRole] = useState<"DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST">("DOCTOR");
  const [compForm, setCompForm] = useState({ partName: "", partCode: "", supplier: "", sourceLocation: "WAREHOUSE" as "WAREHOUSE" | "SUPPLIER", reason: "" });
  const [gaitForm, setGaitForm] = useState({ clinicalConclusion: "", recommendations: "", treatmentPlan: "" });
  const [balanceForm, setBalanceForm] = useState({ overallLevel: "", fallRisk: "LOW" as "LOW" | "MODERATE" | "HIGH", notes: "" });
  const [consumableForm, setConsumableForm] = useState({ name: "", quantity: "1", unit: "", notes: "" });
  const [consumables, setConsumables] = useState<Array<{ name: string; quantity: string; unit: string; notes: string }>>([]);
  const [finalEvalForm, setFinalEvalForm] = useState({ functionalOutcome: "", patientSatisfaction: "", notes: "" });
  const [finalSignOpen, setFinalSignOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ deliveryDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [deliverySignOpen, setDeliverySignOpen] = useState(false);
  const [patientEditMode, setPatientEditMode] = useState(false);
  const [patientEditForm, setPatientEditForm] = useState({ firstName: "", lastName: "", dateOfBirth: "", phone: "", heightCm: "", weightKg: "" });
  const [followUpForm, setFollowUpForm] = useState({ date: new Date().toISOString().slice(0, 10), notes: "", kLevel: null as KLevel | null, painLevel: "" });

  // يمنع إعادة تهيئة الفورم مباشرة بعد الحفظ
  const justSavedRef = useRef(false);

  // ملء الفورم من السيرفر عند أول تحميل أو عند العودة للصفحة
  useEffect(() => {
    if (!caseData) return;
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    setIntakeForm({
      amputationType: caseData.amputationType ?? "",
      amputationSide: caseData.amputationSide ?? "",
      amputationLevel: caseData.amputationLevel ?? "",
      amputationDate: caseData.dateOfAmputation ? caseData.dateOfAmputation.slice(0, 10) : "",
      amputationCause: caseData.causeOfAmputation ?? "",
      amputationCauseOtherDetail: caseData.amputationCauseOtherDetail ?? "",
      amputationCount: caseData.numberOfAmputations?.toString() ?? "1",
      appointmentDate: (caseData as any).appointmentDate ?? "",
      appointmentTime: (caseData as any).appointmentTime ?? "",
      hasChronicDiseases: caseData.hasChronicDiseases ?? null,
      chronicDiseases: caseData.chronicDiseases ?? "",
      hasPhysicalTherapy: caseData.hasPhysicalTherapy ?? null,
      physicalTherapyDetails: caseData.physicalTherapyDetails ?? "",
      hasPreviousProsthesis: caseData.hasPreviousProsthesis ?? null,
      previousProsthesisDetails: caseData.previousProsthesisDetails ?? "",
      previousProsthesisWhen: caseData.previousProsthesisWhen ?? "",
      previousProsthesisWhere: caseData.previousProsthesisWhere ?? "",
      previousProsthesisType: caseData.previousProsthesisType ?? "",
      hasRevisionSurgery: caseData.hasRevisionSurgery ?? null,
      revisionDetails: caseData.revisionDetails ?? "",
    });
  }, [caseData?.updatedAt]);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  if (!caseData) {
    return <div className="text-center py-20 text-muted-foreground">الحالة غير موجودة</div>;
  }

  const c = caseData;
  const patientName = patientFull
    ? `${patientFull.firstName} ${patientFull.lastName}`
    : c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—";

  const buildIntakeDto = () => {
    const hcd = intakeForm.hasChronicDiseases ?? c.hasChronicDiseases ?? false;
    const hpt = intakeForm.hasPhysicalTherapy ?? c.hasPhysicalTherapy ?? false;
    const hpp = intakeForm.hasPreviousProsthesis ?? c.hasPreviousProsthesis ?? false;
    const hrs = intakeForm.hasRevisionSurgery ?? c.hasRevisionSurgery ?? false;
    return {
      amputationType: (intakeForm.amputationType || c.amputationType || undefined) as AmputationType | undefined,
      amputationSide: (intakeForm.amputationSide || c.amputationSide || undefined) as AmputationSide | undefined,
      amputationLevel: intakeForm.amputationLevel || c.amputationLevel || undefined,
      amputationDate: intakeForm.amputationDate || (c.dateOfAmputation ? c.dateOfAmputation.slice(0, 10) : undefined),
      amputationCause: (intakeForm.amputationCause || c.causeOfAmputation || undefined) as AmputationCause | undefined,
      amputationCauseOtherDetail: intakeForm.amputationCause === "OTHER" ? intakeForm.amputationCauseOtherDetail || undefined : undefined,
      amputationCount: intakeForm.amputationCount ? parseInt(intakeForm.amputationCount) : (c.numberOfAmputations ?? undefined),
      appointmentDate: intakeForm.appointmentDate || (c as any).appointmentDate || undefined,
      appointmentTime: intakeForm.appointmentTime || (c as any).appointmentTime || undefined,
      hasChronicDiseases: hcd,
      chronicDiseases: hcd ? (intakeForm.chronicDiseases || c.chronicDiseases || undefined) : undefined,
      hasPhysicalTherapy: hpt,
      physicalTherapyDetails: hpt ? (intakeForm.physicalTherapyDetails || c.physicalTherapyDetails || undefined) : undefined,
      hasPreviousProsthesis: hpp,
      previousProsthesisDetails: hpp ? (intakeForm.previousProsthesisDetails || c.previousProsthesisDetails || undefined) : undefined,
      previousProsthesisWhen: hpp ? (intakeForm.previousProsthesisWhen || c.previousProsthesisWhen || undefined) : undefined,
      previousProsthesisWhere: hpp ? (intakeForm.previousProsthesisWhere || c.previousProsthesisWhere || undefined) : undefined,
      previousProsthesisType: hpp ? (intakeForm.previousProsthesisType || c.previousProsthesisType || undefined) : undefined,
      hasRevisionSurgery: hrs,
      revisionDetails: hrs ? (intakeForm.revisionDetails || c.revisionDetails || undefined) : undefined,
    };
  };

  const handleSavePatient = async () => {
    await updatePatient.mutateAsync({
      id: c.patientId,
      dto: {
        firstName: patientEditForm.firstName || undefined,
        lastName: patientEditForm.lastName || undefined,
        dateOfBirth: patientEditForm.dateOfBirth || undefined,
        phone: patientEditForm.phone || undefined,
        heightCm: patientEditForm.heightCm ? Number(patientEditForm.heightCm) : undefined,
        weightKg: patientEditForm.weightKg ? Number(patientEditForm.weightKg) : undefined,
      },
    });
    // إلغاء cache الحالة أيضاً حتى يتحدث اسم المريض في الهيدر
    qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
    setPatientEditMode(false);
  };

  const handleSaveIntake = async () => {
    justSavedRef.current = true;
    await updateCase.mutateAsync({ id, dto: buildIntakeDto() });
  };

  const handleSaveIntakeAndAdvance = async () => {
    justSavedRef.current = true;
    await updateCase.mutateAsync({ id, dto: buildIntakeDto() });
    await updateStatus.mutateAsync({ id, status: "ASSESSMENT" });
  };

  const buildUpperDto = () => {
    const f = upperAssessForm;
    const side = f.amputationSide === "BILATERAL" ? f.side : (f.amputationSide as "LEFT" | "RIGHT") || f.side;
    return {
      side,
      residualLimbLength: (f.residualLimbLength as any) || undefined,
      residualLimbShape: (f.residualLimbShape as any) || undefined,
      amputationLevelNote: f.amputationLevelNote || undefined,
      painPresent: f.painPresent ?? undefined,
      painIntensity: f.painPresent ? f.painIntensity : undefined,
      painTypes: f.painPresent && f.painTypes.length ? f.painTypes as any : undefined,
      painTypeOtherDetail: f.painTypes.includes("OTHER") ? f.painTypeOtherDetail || undefined : undefined,
      phantomPainPresent: f.phantomPainPresent ?? undefined,
      phantomPainIntensity: f.phantomPainPresent ? f.phantomPainIntensity : undefined,
      neuromaPalpable: f.neuromaPalpable ?? undefined,
      skinNotes: f.skinNotes || undefined,
      skinAppearance: f.skinAppearance.length ? f.skinAppearance as any : undefined,
      skinColor: f.skinColor.length ? f.skinColor as any : undefined,
      skinTemperature: (f.skinTemperature as any) || undefined,
      scarCondition: f.scarCondition.length ? f.scarCondition as any : undefined,
      hasSkinGrafts: f.hasSkinGrafts,
      graftArea: f.hasSkinGrafts ? f.graftArea || undefined : undefined,
      closureNotes: f.closureNotes || undefined,
      generalHealthNotes: f.generalHealthNotes || undefined,
      otherLimbCondition: f.otherLimbCondition || undefined,
      canBalanceOneSide: f.canBalanceOneSide,
      usesCompressionBandage: f.usesCompressionBandage,
      jointsRangeOfMotion: (f.jointsRangeOfMotion as any) || undefined,
      activityLevel: (f.activityLevel as any) || undefined,
      muscleStrength: {
        elbow: { flexion: f.msElbowFlexion, extension: f.msElbowExtension, pronation: f.msElbowPronation, supination: f.msElbowSupination },
        shoulder: { extension: f.msShoulderExtension, flexion: f.msShoulderFlexion, adduction: f.msShoulderAdduction, abduction: f.msShoulderAbduction, internalRotation: f.msShoulderInternalRotation },
        wrist: { flexion: f.msWristFlexion, extension: f.msWristExtension, radialDeviation: f.msWristRadialDeviation, ulnarDeviation: f.msWristUlnarDeviation },
        notes: f.msNotes || undefined,
      } as any,
      examinerProsthetistIds: [],
      examinerPhysioIds: [],
      examinerSupervisorIds: [],
    };
  };

  const buildLowerDto = () => {
    const f = lowerAssessForm;
    const side = f.amputationSide === "BILATERAL" ? f.side : (f.amputationSide as "LEFT" | "RIGHT") || f.side;
    return {
      side,
      residualLimbLength: (f.residualLimbLength as any) || undefined,
      residualLimbShape: (f.residualLimbShape as any) || undefined,
      amputationLevelNote: f.amputationLevelNote || undefined,
      painPresent: f.painPresent ?? undefined,
      painIntensity: f.painPresent ? f.painIntensity : undefined,
      painArea: f.painPresent ? f.painArea || undefined : undefined,
      painTypes: f.painPresent && f.painTypes.length ? f.painTypes as any : undefined,
      painTypeOtherDetail: f.painTypes.includes("OTHER") ? f.painTypeOtherDetail || undefined : undefined,
      phantomPainPresent: f.phantomPainPresent ?? undefined,
      phantomPainIntensity: f.phantomPainPresent ? f.phantomPainIntensity : undefined,
      neuromaPalpable: f.neuromaPalpable ?? undefined,
      loadTolerance: (f.loadTolerance as any) || undefined,
      weightBearingLevel: f.loadTolerance === "WEIGHT_BEARING" ? (f.weightBearingLevel as any) || undefined : undefined,
      notes: f.notes || undefined,
      skinAppearance: f.skinAppearance.length ? f.skinAppearance as any : undefined,
      skinColor: f.skinColor.length ? f.skinColor as any : undefined,
      skinTemperature: (f.skinTemperature as any) || undefined,
      scarCondition: f.scarCondition.length ? f.scarCondition as any : undefined,
      hasSkinGrafts: f.hasSkinGrafts,
      graftArea: f.hasSkinGrafts ? f.graftArea || undefined : undefined,
      generalHealthNotes: f.generalHealthNotes || undefined,
      otherLimbCondition: f.otherLimbCondition || undefined,
      usesAssistiveDevices: f.usesAssistiveDevices ?? undefined,
      assistiveDeviceTypes: f.usesAssistiveDevices ? f.assistiveDeviceTypes || undefined : undefined,
      canClimbStairs: f.canClimbStairs ?? undefined,
      canBalanceOneSide: f.canBalanceOneSide ?? undefined,
      jointsRangeOfMotion: (f.jointsRangeOfMotion as any) || undefined,
      activityLevel: (f.activityLevel as any) || undefined,
      romData: f.romData,
      muscleMotionNotes: f.muscleMotionNotes || undefined,
      examinerProsthetistIds: [],
      examinerPhysioIds: [],
      examinerSupervisorIds: [],
    };
  };

  const handleSaveGeneralAssessment = async () => {
    justSavedRef.current = true;
    await updateCase.mutateAsync({
      id,
      dto: {
        amputationDate: genAssessForm.amputationDate || undefined,
        amputationCause: (genAssessForm.amputationCause as any) || undefined,
        amputationCauseOtherDetail: genAssessForm.amputationCause === "OTHER" ? genAssessForm.amputationCauseOtherDetail || undefined : undefined,
        clinicalHistory: (genAssessForm.clinicalHistory as any) || undefined,
        moreAffectedSide: (genAssessForm.moreAffectedSide as any) || undefined,
        currentlyUsingProsthesis: genAssessForm.currentlyUsingProsthesis ?? undefined,
        previouslyUsedProsthesis: genAssessForm.currentlyUsingProsthesis === false ? (genAssessForm.previouslyUsedProsthesis ?? undefined) : undefined,
        previousProsthesisSystemDetail: genAssessForm.previouslyUsedProsthesis === true ? genAssessForm.previousProsthesisSystemDetail || undefined : undefined,
      },
    });
  };

  const handleSubmitUpperAssessment = async () => {
    await handleSaveGeneralAssessment();
    await submitAssessmentUpper.mutateAsync({ id, dto: buildUpperDto() });
  };

  const handleSubmitLowerAssessment = async () => {
    await handleSaveGeneralAssessment();
    await submitAssessmentLower.mutateAsync({ id, dto: buildLowerDto() });
  };

  const handleSubmitAssessmentAndAdvance = async () => {
    const ampType = (intakeForm.amputationType || c.amputationType || "").toUpperCase();
    if (ampType === "UPPER" || ampType === "BOTH") {
      await submitAssessmentUpper.mutateAsync({ id, dto: buildUpperDto() });
    }
    if (ampType === "LOWER" || ampType === "BOTH") {
      await submitAssessmentLower.mutateAsync({ id, dto: buildLowerDto() });
    }
    await updateStatus.mutateAsync({ id, status: "COMMITTEE_REVIEW" });
  };

  const handleSubmitOpinion = async (role: "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR", opinion: string) => {
    await submitOpinion.mutateAsync({ id, dto: { role, opinion } });
  };

  const handleSubmitDecision = async () => {
    if (prosthesisTypeForm) {
      await updateCase.mutateAsync({ id, dto: { prosthesisType: prosthesisTypeForm as ProstheticType } });
    }
    await submitDecision.mutateAsync({
      id,
      dto: { decision: "APPROVED" as CommitteeDecision, finalSummary: decisionForm.finalSummary },
    });
  };

  const handleSign = async (base64: string) => {
    await signDecision.mutateAsync({ id, role: signRole, signatureBase64: base64 });
  };

  const handleAddComponent = async () => {
    if (!compForm.partCode.trim() || !compForm.partName.trim()) return;
    await addComponent.mutateAsync({
      id,
      dto: {
        partCode: compForm.partCode,
        partName: compForm.partName,
        supplier: compForm.supplier || undefined,
        sourceLocation: compForm.sourceLocation,
        reason: compForm.reason || undefined,
      },
    });
    setCompForm({ partName: "", partCode: "", supplier: "", sourceLocation: "WAREHOUSE", reason: "" });
  };

  const handleAdvanceToGait = async () => {
    await updateStatus.mutateAsync({ id, status: "GAIT_ANALYSIS" });
  };

  const handleSubmitGait = async () => {
    await submitGait.mutateAsync({
      id,
      dto: {
        clinicalConclusion: gaitForm.clinicalConclusion || undefined,
        recommendations: gaitForm.recommendations || undefined,
        treatmentPlan: gaitForm.treatmentPlan || undefined,
      },
    });
    await updateStatus.mutateAsync({ id, status: "FINAL_EVALUATION" });
  };

  const handleMarkDelivered = async () => {
    await updateStatus.mutateAsync({ id, status: "DELIVERED" });
  };

  const handleSubmitBalance = async () => {
    await submitBalance.mutateAsync({ id, dto: { overallBalance: balanceForm.overallLevel, fallRisk: balanceForm.fallRisk, notes: balanceForm.notes || undefined } });
  };

  const handleAddConsumable = () => {
    if (!consumableForm.name.trim()) return;
    setConsumables((prev) => [...prev, { ...consumableForm }]);
    setConsumableForm({ name: "", quantity: "1", unit: "", notes: "" });
  };

  const handleSaveConsumables = async () => {
    for (const c of consumables) {
      await addConsumable.mutateAsync({ id, dto: { name: c.name, quantity: parseInt(c.quantity) || 1, unit: c.unit || undefined, notes: c.notes || undefined } });
    }
    setConsumables([]);
  };

  const handleSubmitFinalEval = async () => {
    await submitFinalEval.mutateAsync({ id, dto: { functionalOutcome: finalEvalForm.functionalOutcome || undefined, patientSatisfaction: finalEvalForm.patientSatisfaction || undefined, notes: finalEvalForm.notes || undefined } });
  };

  const handleSignFinalEval = async (sig: string) => {
    await signFinalEval.mutateAsync({ id, signature: sig });
    await updateStatus.mutateAsync({ id, status: "DELIVERED" });
  };

  const handleSubmitDelivery = async () => {
    await submitDelivery.mutateAsync({ id, dto: { deliveryDate: deliveryForm.deliveryDate, notes: deliveryForm.notes || undefined } });
  };

  const handleSignDelivery = async (sig: string) => {
    await signDelivery.mutateAsync({ id, signature: sig });
    await updateStatus.mutateAsync({ id, status: "FOLLOW_UP" });
  };

  const handleAddFollowUp = async () => {
    if (!followUpForm.notes.trim()) return;
    await addFollowUp.mutateAsync({
      id,
      dto: {
        date: followUpForm.date,
        notes: followUpForm.notes,
        kLevel: followUpForm.kLevel || undefined,
        painLevel: followUpForm.painLevel ? parseInt(followUpForm.painLevel) : undefined,
      },
    });
    setFollowUpForm({ date: new Date().toISOString().slice(0, 10), notes: "", kLevel: null, painLevel: "" });
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => c.patientId ? router.push(`/${locale}/clinic/patients/${c.patientId}`) : router.back()}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {patientName}
            {c.patient?.patientNumber && <span className="font-mono">— {c.patient.patientNumber}</span>}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">حالة أطراف صناعية</h1>
            <CaseStatusBadge status={c.status} />
            {c.amputationType && <Badge variant="outline">{TYPE_LABEL[c.amputationType]}</Badge>}
            {c.amputationSide && <Badge variant="outline">{SIDE_LABEL[c.amputationSide]}</Badge>}
          </div>
          <StepIndicator status={c.status} />
        </div>
        <div className="flex gap-2">
          <PdfExportButton type="prosthetics-case" id={id} size="sm" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                تغيير الحالة <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["CLOSED", "CANCELLED"] as ProstheticsStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => updateStatus.mutate({ id, status: s })}>
                  {s === "CLOSED" ? "إغلاق الحالة" : "إلغاء الحالة"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs by workflow stage */}
      <Tabs defaultValue={c.status === "CANCELLED" || c.status === "CLOSED" ? "timeline" : c.status.toLowerCase()} dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir={isRtl ? "rtl" : "ltr"}>
          <TabsTrigger value="intake" className="text-sm py-1.5">الاستقبال</TabsTrigger>
          <TabsTrigger value="patient_info" className="text-sm py-1.5">معلومات المريض</TabsTrigger>
          <TabsTrigger value="assessment" className="text-sm py-1.5">معلومات التقييم</TabsTrigger>
          <TabsTrigger value="committee_review" className="text-sm py-1.5">اللجنة</TabsTrigger>
          <TabsTrigger value="fitting" className="text-sm py-1.5">التركيب</TabsTrigger>
          <TabsTrigger value="gait_analysis" className="text-sm py-1.5">تحليل المشي</TabsTrigger>
          <TabsTrigger value="balance_assessment" className="text-sm py-1.5">التوازن</TabsTrigger>
          <TabsTrigger value="consumables" className="text-sm py-1.5">المستهلكات</TabsTrigger>
          <TabsTrigger value="final_evaluation" className="text-sm py-1.5">التقييم النهائي</TabsTrigger>
          <TabsTrigger value="delivered" className="text-sm py-1.5">التسليم</TabsTrigger>
          <TabsTrigger value="follow_up" className="text-sm py-1.5">المتابعة</TabsTrigger>
          <TabsTrigger value="timeline" className="text-sm py-1.5">السجل الزمني</TabsTrigger>
        </TabsList>

        {/* ── INTAKE ──────────────────────────────────────────────────────── */}
        <TabsContent value="intake" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="بيانات الاستقبال">
            <div className="space-y-5">

              {/* 1. هل يوجد أمراض مزمنة */}
              {(() => {
                const val = intakeForm.hasChronicDiseases ?? c.hasChronicDiseases ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">هل يوجد أمراض مزمنة؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasChronicDiseases: v, chronicDiseases: v ? f.chronicDiseases : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">اسم المرض</Label>
                        <Input value={intakeForm.chronicDiseases || c.chronicDiseases || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, chronicDiseases: e.target.value }))} placeholder="اذكر اسم المرض..." />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* 2. سبب الإصابة + تاريخ البتر */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>سبب الإصابة</Label>
                  <Select
                    value={intakeForm.amputationCause || c.causeOfAmputation || ""}
                    onValueChange={(v) => setIntakeForm((f) => ({ ...f, amputationCause: v, amputationCauseOtherDetail: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر السبب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAR_INJURY">إصابة حرب</SelectItem>
                      <SelectItem value="TRAFFIC_ACCIDENT">حادث مرور</SelectItem>
                      <SelectItem value="DIABETES">داء السكري</SelectItem>
                      <SelectItem value="VASCULAR_DISEASE">مرض الأوعية الدموية</SelectItem>
                      <SelectItem value="CONGENITAL">خلقي</SelectItem>
                      <SelectItem value="INFECTION">عدوى</SelectItem>
                      <SelectItem value="TUMOR">ورم</SelectItem>
                      <SelectItem value="WORK_INJURY">إصابة عمل</SelectItem>
                      <SelectItem value="OTHER">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {(intakeForm.amputationCause || c.causeOfAmputation) === "OTHER" && (
                    <Input
                      className="mt-1"
                      placeholder="يرجى التحديد..."
                      value={intakeForm.amputationCauseOtherDetail}
                      onChange={(e) => setIntakeForm((f) => ({ ...f, amputationCauseOtherDetail: e.target.value }))}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ البتر</Label>
                  <Input type="date" value={intakeForm.amputationDate || (c.dateOfAmputation ? c.dateOfAmputation.slice(0, 10) : "")} onChange={(e) => setIntakeForm((f) => ({ ...f, amputationDate: e.target.value }))} />
                </div>
              </div>

              {/* 3. عدد البتور */}
              <div className="space-y-1.5">
                <Label>عدد البتور</Label>
                <div className="flex gap-5">
                  {["1", "2", "3", "4"].map((n) => {
                    const cur = intakeForm.amputationCount || "1";
                    const selected = cur === n;
                    return (
                      <button key={n} type="button"
                        onClick={() => setIntakeForm((f) => ({ ...f, amputationCount: n }))}
                        className="flex items-center gap-1.5 group">
                        <div className={`h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. جانب الاصابة */}
              <div className="space-y-1.5">
                <Label>جانب الاصابة</Label>
                <div className="flex gap-5">
                  {([["RIGHT", "يمين (R)"], ["LEFT", "يسار (L)"], ["BILATERAL", "ثنائي"]] as const).map(([val, label]) => {
                    const cur = intakeForm.amputationSide || c.amputationSide || "";
                    const selected = cur === val;
                    return (
                      <button key={val} type="button"
                        onClick={() => setIntakeForm((f) => ({ ...f, amputationSide: val }))}
                        className="flex items-center gap-1.5 group">
                        <div className={`h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. نوع البتر */}
              <div className="space-y-1.5">
                <Label>نوع البتر</Label>
                <div className="flex gap-5">
                  {([["UPPER", "طرف علوي"], ["LOWER", "طرف سفلي"]] as const).map(([val, label]) => {
                    const current = (intakeForm.amputationType || c.amputationType || "") as string;
                    const selected = current === val || current === "BOTH";
                    return (
                      <button key={val} type="button"
                        onClick={() => {
                          const isUpper = current === "UPPER" || current === "BOTH";
                          const isLower = current === "LOWER" || current === "BOTH";
                          const newUpper = val === "UPPER" ? !isUpper : isUpper;
                          const newLower = val === "LOWER" ? !isLower : isLower;
                          const next = newUpper && newLower ? "BOTH" : newUpper ? "UPPER" : newLower ? "LOWER" : "";
                          setIntakeForm((f) => ({ ...f, amputationType: next as any, amputationLevel: "" }));
                        }}
                        className="flex items-center gap-1.5 group">
                        <div className={`h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. مستوى البتر */}
              <div className="space-y-1.5">
                <Label>مستوى البتر</Label>
                <AmputationLevelSelector
                  type={intakeForm.amputationType || c.amputationType || ""}
                  value={intakeForm.amputationLevel || c.amputationLevel || ""}
                  onChange={(v) => setIntakeForm((f) => ({ ...f, amputationLevel: v }))}
                  onTypeChange={(t) => setIntakeForm((f) => ({ ...f, amputationType: t, amputationLevel: f.amputationLevel }))}
                />
              </div>

              <Separator />

              {/* 7. هل خضع لجلسات علاج فيزيائي سابقاً */}
              {(() => {
                const val = intakeForm.hasPhysicalTherapy ?? c.hasPhysicalTherapy ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">هل خضع لجلسات علاج فيزيائي سابقاً؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasPhysicalTherapy: v, physicalTherapyDetails: v ? f.physicalTherapyDetails : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">التوضيح</Label>
                        <Input value={intakeForm.physicalTherapyDetails || c.physicalTherapyDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, physicalTherapyDetails: e.target.value }))} placeholder="تفاصيل جلسات العلاج..." />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 8. هل سبق أن ركّب طرفاً صناعياً */}
              {(() => {
                const val = intakeForm.hasPreviousProsthesis ?? c.hasPreviousProsthesis ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">هل سبق له تركيب طرف صناعي؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasPreviousProsthesis: v, previousProsthesisDetails: v ? f.previousProsthesisDetails : "", previousProsthesisWhen: v ? f.previousProsthesisWhen : "", previousProsthesisWhere: v ? f.previousProsthesisWhere : "", previousProsthesisType: v ? f.previousProsthesisType : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm text-muted-foreground">التوضيح</Label>
                          <Input value={intakeForm.previousProsthesisDetails || c.previousProsthesisDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisDetails: e.target.value }))} placeholder="تفاصيل الطرف السابق..." />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">متى؟</Label>
                            <Input value={intakeForm.previousProsthesisWhen || c.previousProsthesisWhen || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisWhen: e.target.value }))} placeholder="السنة أو التاريخ" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">أين؟</Label>
                            <Input value={intakeForm.previousProsthesisWhere || c.previousProsthesisWhere || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisWhere: e.target.value }))} placeholder="المكان أو المركز" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">نوع الطرف</Label>
                            <Input value={intakeForm.previousProsthesisType || c.previousProsthesisType || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisType: e.target.value }))} placeholder="نوع الطرف الصناعي" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 9. هل خضع لعملية تصحيح بتر */}
              {(() => {
                const val = intakeForm.hasRevisionSurgery ?? c.hasRevisionSurgery ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">هل سبق أن خضع لعملية تصحيح بتر؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasRevisionSurgery: v, revisionDetails: v ? f.revisionDetails : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">التوضيح</Label>
                        <Input value={intakeForm.revisionDetails || c.revisionDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, revisionDetails: e.target.value }))} placeholder="تفاصيل عملية التصحيح..." />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* تاريخ ووقت الموعد */}
              <div className="space-y-1.5">
                <Label className="text-base">تاريخ ووقت الموعد</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">التاريخ</Label>
                    <Input type="date" value={intakeForm.appointmentDate || (c as any).appointmentDate || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, appointmentDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">الوقت</Label>
                    <Input type="time" value={intakeForm.appointmentTime || (c as any).appointmentTime || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, appointmentTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveIntake} disabled={updateCase.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  {updateCase.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  حفظ
                </Button>
                {c.status === "INTAKE" && (
                  <Button onClick={handleSaveIntakeAndAdvance} disabled={updateCase.isPending || updateStatus.isPending} className="flex-1">
                    {(updateCase.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                    حفظ والانتقال للتقييم
                  </Button>
                )}
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── PATIENT INFO ─────────────────────────────────────────────────── */}
        <TabsContent value="patient_info" className="mt-4" dir="rtl">
          <Section
            title="معلومات المريض"
            action={
              <Button
                size="sm"
                variant={patientEditMode ? "outline" : "default"}
                className={patientEditMode ? "" : "bg-orange-500 hover:bg-orange-600 text-white"}
                onClick={() => {
                  if (!patientEditMode) {
                    setPatientEditForm({
                      firstName: patientFull?.firstName ?? "",
                      lastName: patientFull?.lastName ?? "",
                      dateOfBirth: patientFull?.dateOfBirth ? patientFull.dateOfBirth.slice(0, 10) : "",
                      phone: patientFull?.phone ?? "",
                      heightCm: patientFull?.heightCm?.toString() ?? "",
                      weightKg: patientFull?.weightKg?.toString() ?? "",
                    });
                  }
                  setPatientEditMode((v) => !v);
                }}
              >
                {patientEditMode ? "إلغاء" : "تعديل"}
              </Button>
            }
          >
            <div className="flex gap-6 items-start">
              {/* بيانات المريض — يمين */}
              <div className="flex-1">
                {patientEditMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">الاسم الأول</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.firstName} onChange={(e) => setPatientEditForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الاسم الأخير</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.lastName} onChange={(e) => setPatientEditForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">تاريخ الميلاد</Label>
                      <Input type="date" className="h-8 text-sm" value={patientEditForm.dateOfBirth} onChange={(e) => setPatientEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الهاتف</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.phone} onChange={(e) => setPatientEditForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الطول (cm)</Label>
                      <Input type="number" className="h-8 text-sm" value={patientEditForm.heightCm} onChange={(e) => setPatientEditForm((f) => ({ ...f, heightCm: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الوزن (kg)</Label>
                      <Input type="number" className="h-8 text-sm" value={patientEditForm.weightKg} onChange={(e) => setPatientEditForm((f) => ({ ...f, weightKg: e.target.value }))} />
                    </div>
                    <Button onClick={handleSavePatient} disabled={updatePatient.isPending} className="col-span-2 h-8">
                      {updatePatient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
                      حفظ التعديلات
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">رقم المريض</p>
                      <p className="font-medium">{patientFull?.patientNumber ?? c.patient?.patientNumber ?? "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">اسم المريض</p>
                      <p className="font-medium">{patientFull ? `${patientFull.firstName} ${patientFull.lastName}` : patientName}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">تاريخ الميلاد</p>
                      <p className="font-medium">{patientFull?.dateOfBirth ? patientFull.dateOfBirth.slice(0, 10) : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">الهاتف</p>
                      <p className="font-medium">{patientFull?.phone ?? "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">مستوى البتر</p>
                      <p className="font-medium">{c.amputationLevel ?? "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">الطول</p>
                      <p className="font-medium">{patientFull?.heightCm ? `${patientFull.heightCm} cm` : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">الوزن</p>
                      <p className="font-medium">{patientFull?.weightKg ? `${patientFull.weightKg} kg` : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">مؤشر كتلة الجسم</p>
                      <p className="font-medium">{patientFull?.bmi ? patientFull.bmi.toFixed(1) : "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* الصورة الشخصية — يسار */}
              {(() => {
                const photoDoc = patientDocs.find((d) => d.type === "PERSONAL_PHOTO");
                return (
                  <div className="shrink-0">
                    <div className="w-40 h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs text-center bg-muted/20 overflow-hidden">
                      {photoDoc && caseData?.patientId
                        ? <PatientPhotoViewer patientId={caseData.patientId} docId={photoDoc.id} />
                        : <span className="opacity-50">لا توجد صورة</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Section>
        </TabsContent>

        {/* ── ASSESSMENT ──────────────────────────────────────────────────── */}
        <TabsContent value="assessment" className="mt-4 space-y-4" dir="rtl">
          {/* ─── Upper Assessment ───────────────────────────────────────────── */}
          {(() => {
            const ampType = (intakeForm.amputationType || c.amputationType || "").toUpperCase();
            if (ampType !== "UPPER" && ampType !== "BOTH") return null;
            const f = upperAssessForm;
            const set = (patch: Partial<typeof upperAssessForm>) => setUpperAssessForm((prev) => ({ ...prev, ...patch }));
            const tog = (arr: string[], val: string) => arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
            const g = genAssessForm;
            const setG = (patch: Partial<typeof genAssessForm>) => setGenAssessForm((prev) => ({ ...prev, ...patch }));
            return (
              <Section title="تقييم الطرف العلوي">
                <div className="divide-y divide-border/30">

                  {/* 1 — جانب البتر */}
                  <PfRow label="جانب البتر">
                    <PfSq checked={f.amputationSide === "RIGHT"} label="يمين" onClick={() => set({ amputationSide: "RIGHT" })} />
                    <PfSq checked={f.amputationSide === "LEFT"} label="يسار" onClick={() => set({ amputationSide: "LEFT" })} />
                    <PfSq checked={f.amputationSide === "BILATERAL"} label="ثنائي" onClick={() => set({ amputationSide: "BILATERAL" })} />
                  </PfRow>

                  {/* 2 — الجانب المتابع عند الثنائي */}
                  {f.amputationSide === "BILATERAL" && (
                    <PfRow label="إذا كانت الإصابة متعددة الجانب، فأي جانب هو المتابع؟">
                      <PfSq checked={f.side === "RIGHT"} label="يمين" onClick={() => set({ side: "RIGHT" })} />
                      <PfSq checked={f.side === "LEFT"} label="يسار" onClick={() => set({ side: "LEFT" })} />
                    </PfRow>
                  )}

                  {/* 3 — طول الجذمور */}
                  <PfRow label="في البتور عبر الساعد والعضد، كم طول الجذمور؟">
                    {[["LONG","طويل"],["MEDIUM","وسط"],["SHORT","قصير"],["VERY_SHORT","قصير جداً"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.residualLimbLength === val} label={lbl} onClick={() => set({ residualLimbLength: val })} />
                    ))}
                  </PfRow>

                  {/* 4 — شكل الطرف المتبقي */}
                  <PfRow label="شكل الطرف المتبقي">
                    {[["BONY","عظمي"],["SOFT","لين"],["NORMAL","طبيعي"],["CONICAL_BONY","عظمي مخروطي"],["CONICAL_SOFT","لين مخروطي"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.residualLimbShape === val} label={lbl} onClick={() => set({ residualLimbShape: val })} />
                    ))}
                  </PfRow>

                  {/* 5 — ملاحظة حول مستوى البتر */}
                  <PfRow label="ملاحظة حول مستوى البتر">
                    <Input className="h-7 text-sm w-80" value={f.amputationLevelNote} onChange={(e) => set({ amputationLevelNote: e.target.value })} />
                  </PfRow>

                  {/* 6 — تاريخ البتر */}
                  <PfRow label="تاريخ البتر">
                    <Input type="date" className="h-7 text-sm w-48" value={g.amputationDate} onChange={(e) => setG({ amputationDate: e.target.value })} />
                  </PfRow>

                  {/* 7 — سبب البتر */}
                  <PfRow label="سبب البتر">
                    {[["WAR_INJURY","إصابة حرب"],["TRAFFIC_ACCIDENT","حادث سير"],["DIABETES","مضاعفات سكري"],["VASCULAR_DISEASE","مرض وعائي"],["CONGENITAL","خلقي"],["INFECTION","عدوى"],["TUMOR","ورم"],["WORK_INJURY","إصابة عمل"],["OTHER","أخرى"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={g.amputationCause === val} label={lbl} onClick={() => setG({ amputationCause: val })} />
                    ))}
                    {g.amputationCause === "OTHER" && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder="حدد السبب..." value={g.amputationCauseOtherDetail} onChange={(e) => setG({ amputationCauseOtherDetail: e.target.value })} />
                    )}
                  </PfRow>

                  {/* 8 — القصة السريرية */}
                  <PfRow label="القصة السريرية">
                    <Textarea rows={2} className="text-sm w-full" value={g.clinicalHistory} onChange={(e) => setG({ clinicalHistory: e.target.value })} />
                  </PfRow>

                  <PfDivider label="الألم والحساسية" />

                  {/* 9 — شدة الألم */}
                  <PfRow label="شدة الألم / الألم والحساسية">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={f.painPresent === true} onCheckedChange={(v) => set({ painPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                    {f.painPresent && <PfNumPicker value={f.painIntensity} onChange={(n) => set({ painIntensity: n })} max={9} />}
                  </PfRow>

                  {/* 10 — ألم وهمي */}
                  <PfRow label="ألم وهمي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={f.phantomPainPresent === true} onCheckedChange={(v) => set({ phantomPainPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                    {f.phantomPainPresent && <PfNumPicker value={f.phantomPainIntensity} onChange={(n) => set({ phantomPainIntensity: n })} max={9} />}
                  </PfRow>

                  {/* 11 — نوع الألم */}
                  <PfRow label="نوع الألم">
                    {[["NUMBNESS","خدر"],["DULL_ACHE","ألم خفيف"],["HOT_BURNING","حارق"],["SHARP_STABBING","حاد"],["PINS","واخز"],["OTHER","أخر"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.painTypes.includes(val)} label={lbl} onClick={() => set({ painTypes: tog(f.painTypes, val) })} />
                    ))}
                    {f.painTypes.includes("OTHER") && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder="حدد نوع الألم..." value={f.painTypeOtherDetail} onChange={(e) => set({ painTypeOtherDetail: e.target.value })} />
                    )}
                  </PfRow>

                  {/* 12 — النوروم العصبي */}
                  <PfRow label="النوروم العصبي / وضع الجذمور">
                    <PfSq checked={f.neuromaPalpable === true} label="قابل للمس" onClick={() => set({ neuromaPalpable: true })} />
                    <PfSq checked={f.neuromaPalpable === false} label="غير قابل للمس" onClick={() => set({ neuromaPalpable: false })} />
                  </PfRow>

                  {/* 13 — ملاحظات */}
                  <PfRow label="ملاحظات">
                    <Textarea rows={2} className="text-sm w-full" value={f.skinNotes} onChange={(e) => set({ skinNotes: e.target.value })} />
                  </PfRow>

                  <PfDivider label="الجلد" />

                  {/* 14 — المظهر العام */}
                  <PfRow label="المظهر العام">
                    {[["NORMAL","طبيعي"],["PALE","شاحب"],["DRY","جاف"],["INFLAMED","ملتهب"],["PEELING","متقشر"],["OOZING","ناز"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.skinAppearance.includes(val)} label={lbl} onClick={() => set({ skinAppearance: tog(f.skinAppearance, val) })} />
                    ))}
                  </PfRow>

                  {/* 15 — لون البشرة */}
                  <PfRow label="لون البشرة">
                    {[["NORMAL","طبيعي"],["PALE","شاحب"],["YELLOWISH","مصفر"],["ERYTHEMATOUS","محمر"],["CYANOTIC","مزرق"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.skinColor.includes(val)} label={lbl} onClick={() => set({ skinColor: tog(f.skinColor, val) })} />
                    ))}
                  </PfRow>

                  {/* 16 — درجة حرارة الجلد */}
                  <PfRow label="درجة حرارة الجلد">
                    {[["NORMAL","طبيعي"],["COLD","بارد"],["HOT","حار"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.skinTemperature === val} label={lbl} onClick={() => set({ skinTemperature: val })} />
                    ))}
                  </PfRow>

                  {/* 17 — الطعوم الجلدية / منطقة الطعم / حالة الندبة */}
                  <PfRow label="الطعوم الجلدية / منطقة الطعم / حالة الندبة">
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-3">
                        <PfSq checked={f.hasSkinGrafts} label="يوجد طعم جلدي" onClick={() => set({ hasSkinGrafts: !f.hasSkinGrafts })} />
                        {f.hasSkinGrafts && (
                          <Input className="h-7 text-sm w-52" placeholder="منطقة الطعم..." value={f.graftArea} onChange={(e) => set({ graftArea: e.target.value })} />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[["HEALED","ملتئمة"],["FLEXIBLE","مرنة"],["HEALED_WITH_PINS","ملتئمة مع ترس"],["OPEN","مفتوحة"],["DRY","جافة"],["INFLAMED","ملتهبة"],["OOZING","نازة"]].map(([val, lbl]) => (
                          <PfSq key={val} checked={f.scarCondition.includes(val)} label={lbl} onClick={() => set({ scarCondition: tog(f.scarCondition, val) })} />
                        ))}
                      </div>
                    </div>
                  </PfRow>

                  {/* 18 — تغليقات */}
                  <PfRow label="تغليقات">
                    <Input className="h-7 text-sm w-80" value={f.closureNotes} onChange={(e) => set({ closureNotes: e.target.value })} />
                  </PfRow>

                  <PfDivider label="الحالة العامة" />

                  {/* 19 — حالة الصحة العامة */}
                  <PfRow label="حالة الصحة العامة">
                    <Input className="h-7 text-sm w-80" value={f.generalHealthNotes} onChange={(e) => set({ generalHealthNotes: e.target.value })} />
                  </PfRow>

                  {/* 20 — حالة الأطراف الأخرى */}
                  <PfRow label="حالة الأطراف الأخرى">
                    <Input className="h-7 text-sm w-80" value={f.otherLimbCondition} onChange={(e) => set({ otherLimbCondition: e.target.value })} />
                  </PfRow>

                  {/* 21 — هل يستخدم طرفاً صناعياً حالياً؟ */}
                  <PfRow label="هل يستخدم المريض طرفاً صناعياً حالياً؟">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={g.currentlyUsingProsthesis === true} onCheckedChange={(v) => setG({ currentlyUsingProsthesis: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>

                  {/* 22 — إذا لا: هل استخدمه سابقاً؟ */}
                  {g.currentlyUsingProsthesis === false && (
                    <PfRow label="هل استخدم الطرف الصناعي سابقاً؟">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">لا</span>
                        <Switch checked={g.previouslyUsedProsthesis === true} onCheckedChange={(v) => setG({ previouslyUsedProsthesis: v })} />
                        <span className="text-sm text-muted-foreground">نعم</span>
                      </div>
                      {g.previouslyUsedProsthesis === true && (
                        <Input className="h-7 text-sm w-64 mt-1" placeholder="تحديد نظام الطرف الصناعي..." value={g.previousProsthesisSystemDetail} onChange={(e) => setG({ previousProsthesisSystemDetail: e.target.value })} />
                      )}
                    </PfRow>
                  )}

                  {/* 23 — التوازن على جانب واحد */}
                  <PfRow label="هل يستطيع الحفاظ على توازنه على جانب واحد فقط؟">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={f.canBalanceOneSide} onCheckedChange={(v) => set({ canBalanceOneSide: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>

                  {/* 24 — رباط ضاغط */}
                  <PfRow label="هل يستخدم المريض رباط ضاغط؟">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={f.usesCompressionBandage} onCheckedChange={(v) => set({ usesCompressionBandage: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>

                  <PfDivider label="تقييم مدى حركة المفصل" />

                  {/* 25 — مدى الحركة العام */}
                  <PfRow label="الحالة الطبيعية">
                    <PfSq checked={f.jointsRangeOfMotion === "ACTIVE"} label="نشط" onClick={() => set({ jointsRangeOfMotion: "ACTIVE" })} />
                    <PfSq checked={f.jointsRangeOfMotion === "SEDENTARY"} label="خامل" onClick={() => set({ jointsRangeOfMotion: "SEDENTARY" })} />
                  </PfRow>

                  {/* 26 — مستوى النشاط K */}
                  <PfRow label="مستوى النشاط">
                    {["K0","K1","K2","K3","K4"].map((k) => (
                      <PfSq key={k} checked={f.activityLevel === k} label={k} onClick={() => set({ activityLevel: k })} />
                    ))}
                  </PfRow>

                  <div className="pt-3">
                    <Button onClick={handleSubmitUpperAssessment} disabled={submitAssessmentUpper.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      {submitAssessmentUpper.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                      حفظ تقييم الطرف العلوي
                    </Button>
                  </div>
                </div>
              </Section>
            );
          })()}

          {/* ─── Muscle Strength Assessment (Upper only) ───────────────────── */}
          {(() => {
            const ampType = (intakeForm.amputationType || c.amputationType || "").toUpperCase();
            if (ampType !== "UPPER" && ampType !== "BOTH") return null;
            const f = upperAssessForm;
            const set = (patch: Partial<typeof upperAssessForm>) => setUpperAssessForm((prev) => ({ ...prev, ...patch }));
            return (
              <Section title="تقييم قوة الحركة العضلات">
                <div className="divide-y divide-border/30">
                  <PfRow label="المرفق">
                    <PfSq checked={f.msElbowFlexion} label="العطف" onClick={() => set({ msElbowFlexion: !f.msElbowFlexion })} />
                    <PfSq checked={f.msElbowExtension} label="البسط" onClick={() => set({ msElbowExtension: !f.msElbowExtension })} />
                    <PfSq checked={f.msElbowPronation} label="الكب" onClick={() => set({ msElbowPronation: !f.msElbowPronation })} />
                    <PfSq checked={f.msElbowSupination} label="الاستلقاء" onClick={() => set({ msElbowSupination: !f.msElbowSupination })} />
                  </PfRow>
                  <PfRow label="الكتف">
                    <PfSq checked={f.msShoulderExtension} label="البسط" onClick={() => set({ msShoulderExtension: !f.msShoulderExtension })} />
                    <PfSq checked={f.msShoulderFlexion} label="العطف" onClick={() => set({ msShoulderFlexion: !f.msShoulderFlexion })} />
                    <PfSq checked={f.msShoulderAdduction} label="التقريب" onClick={() => set({ msShoulderAdduction: !f.msShoulderAdduction })} />
                    <PfSq checked={f.msShoulderAbduction} label="التبعيد" onClick={() => set({ msShoulderAbduction: !f.msShoulderAbduction })} />
                    <PfSq checked={f.msShoulderInternalRotation} label="دوران داخلي" onClick={() => set({ msShoulderInternalRotation: !f.msShoulderInternalRotation })} />
                  </PfRow>
                  <PfRow label="الرسغ">
                    <PfSq checked={f.msWristFlexion} label="العطف" onClick={() => set({ msWristFlexion: !f.msWristFlexion })} />
                    <PfSq checked={f.msWristExtension} label="البسط" onClick={() => set({ msWristExtension: !f.msWristExtension })} />
                    <PfSq checked={f.msWristRadialDeviation} label="الانحراف الكعبري" onClick={() => set({ msWristRadialDeviation: !f.msWristRadialDeviation })} />
                    <PfSq checked={f.msWristUlnarDeviation} label="الانحراف الزندي" onClick={() => set({ msWristUlnarDeviation: !f.msWristUlnarDeviation })} />
                  </PfRow>
                  <PfRow label="الملاحظات">
                    <Textarea rows={2} className="text-sm w-full" value={f.msNotes} onChange={(e) => set({ msNotes: e.target.value })} />
                  </PfRow>
                  <div className="pt-3">
                    <Button onClick={handleSubmitUpperAssessment} disabled={submitAssessmentUpper.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      {submitAssessmentUpper.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                      حفظ تقييم قوة العضلات
                    </Button>
                  </div>
                </div>
              </Section>
            );
          })()}

          {/* ─── 3. Lower Assessment ────────────────────────────────────────── */}
          {(() => {
            const ampType = (intakeForm.amputationType || c.amputationType || "").toUpperCase();
            if (ampType !== "LOWER" && ampType !== "BOTH") return null;
            const f = lowerAssessForm;
            const set = (patch: Partial<typeof lowerAssessForm>) => setLowerAssessForm((prev) => ({ ...prev, ...patch }));
            const tog = (arr: string[], val: string) => arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
            const g = genAssessForm;
            const setG = (patch: Partial<typeof genAssessForm>) => setGenAssessForm((prev) => ({ ...prev, ...patch }));
            return (
              <Section title="تقييم الطرف السفلي">
                <div className="divide-y divide-border/30">

                  <PfRow label="جانب البتر">
                    <PfSq checked={f.amputationSide === "RIGHT"} label="يمين" onClick={() => set({ amputationSide: "RIGHT" })} />
                    <PfSq checked={f.amputationSide === "LEFT"} label="يسار" onClick={() => set({ amputationSide: "LEFT" })} />
                    <PfSq checked={f.amputationSide === "BILATERAL"} label="ثنائي الأطراف" onClick={() => set({ amputationSide: "BILATERAL" })} />
                  </PfRow>

                  {f.amputationSide === "BILATERAL" && (
                    <PfRow label="إذا كانت الإصابة متعددة الجانب فأي جانب هو المتابع">
                      <PfSq checked={f.side === "RIGHT"} label="يمين" onClick={() => set({ side: "RIGHT" })} />
                      <PfSq checked={f.side === "LEFT"} label="يسار" onClick={() => set({ side: "LEFT" })} />
                    </PfRow>
                  )}

                  <PfRow label="ما هو طول الجذمور في البتر فوق الركبة وتحت الركبة">
                    {[["LONG","طويل"],["MEDIUM","وسط"],["SHORT","قصير"],["VERY_SHORT","قصير جداً"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.residualLimbLength === val} label={lbl} onClick={() => set({ residualLimbLength: val })} />
                    ))}
                  </PfRow>

                  <PfRow label="شكل الطرف المتبقي">
                    {[["BONY","عظمي"],["SOFT","لين"],["NORMAL","طبيعي"],["CONICAL_BONY","عظمي مخروطي"],["CONICAL_SOFT","لين مخروطي"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.residualLimbShape === val} label={lbl} onClick={() => set({ residualLimbShape: val })} />
                    ))}
                  </PfRow>

                  <PfRow label="ملاحظة حول مستوى البتر">
                    <Input className="h-7 text-sm w-80" value={f.amputationLevelNote} onChange={(e) => set({ amputationLevelNote: e.target.value })} />
                  </PfRow>

                  <PfRow label="تاريخ البتر">
                    <Input type="date" className="h-7 text-sm w-44" value={g.amputationDate} onChange={(e) => setG({ amputationDate: e.target.value })} />
                  </PfRow>

                  <PfRow label="سبب البتر">
                    {[["WAR_INJURY","إصابة حرب"],["TRAFFIC_ACCIDENT","حادث مرور"],["DIABETES","داء السكري"],["VASCULAR_DISEASE","مرض الأوعية"],["CONGENITAL","خلقي"],["INFECTION","عدوى"],["TUMOR","ورم"],["WORK_INJURY","إصابة عمل"],["OTHER","أخرى"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={g.amputationCause === val} label={lbl} onClick={() => setG({ amputationCause: val })} />
                    ))}
                    {g.amputationCause === "OTHER" && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder="تحديد السبب..." value={g.amputationCauseOtherDetail} onChange={(e) => setG({ amputationCauseOtherDetail: e.target.value })} />
                    )}
                  </PfRow>

                  <PfRow label="القصة السريرية">
                    <Textarea rows={2} className="text-sm w-full" value={g.clinicalHistory} onChange={(e) => setG({ clinicalHistory: e.target.value })} />
                  </PfRow>

                  <PfRow label="الألم والحساسية">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={f.painPresent === true} onCheckedChange={(v) => set({ painPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                    {f.painPresent && (
                      <>
                        <Input className="h-7 text-sm w-64 mt-1" placeholder="المنطقة..." value={f.painArea} onChange={(e) => set({ painArea: e.target.value })} />
                        <div className="mt-1"><PfNumPicker value={f.painIntensity} onChange={(n) => set({ painIntensity: n })} max={10} /></div>
                      </>
                    )}
                  </PfRow>

                  <PfRow label="ألم وهمي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={f.phantomPainPresent === true} onCheckedChange={(v) => set({ phantomPainPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                    {f.phantomPainPresent && (
                      <>
                        <Input className="h-7 text-sm w-64 mt-1" placeholder="المنطقة..." value={f.painArea} onChange={(e) => set({ painArea: e.target.value })} />
                        <div className="mt-1"><PfNumPicker value={f.phantomPainIntensity} onChange={(n) => set({ phantomPainIntensity: n })} max={9} /></div>
                      </>
                    )}
                  </PfRow>

                  <PfRow label="نوع الألم">
                    {[["NUMBNESS","خدر"],["DULL_ACHE","ألم خفيف"],["HOT_BURNING","حارق"],["SHARP_STABBING","حاد"],["PINS","واخز"],["OTHER","أخر"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.painTypes.includes(val)} label={lbl} onClick={() => set({ painTypes: tog(f.painTypes, val) })} />
                    ))}
                    {f.painTypes.includes("OTHER") && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder="وصف..." value={f.painTypeOtherDetail} onChange={(e) => set({ painTypeOtherDetail: e.target.value })} />
                    )}
                  </PfRow>

                  <PfRow label="النوروم العصبي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={f.neuromaPalpable === true} onCheckedChange={(v) => set({ neuromaPalpable: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                  </PfRow>

                  <PfRow label="قابلية التحميل على الجذمور">
                    {[["PALPABLE","قابل للمس"],["WEIGHT_BEARING","قابل لتحمل الوزن"],["NON_WEIGHT_BEARING","غير قابل لتحمل الوزن"],["NOT_PALPABLE","غير قابل للمس"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.loadTolerance === val} label={lbl} onClick={() => set({ loadTolerance: val })} />
                    ))}
                  </PfRow>

                  {f.loadTolerance === "WEIGHT_BEARING" && (
                    <PfRow label="إذا كان قابل لتحمل الوزن">
                      {[["FULL","كامل"],["HIGH","مرتفع"],["MEDIUM","متوسط"],["LOW","منخفض"]].map(([val, lbl]) => (
                        <PfSq key={val} checked={f.weightBearingLevel === val} label={lbl} onClick={() => set({ weightBearingLevel: val })} />
                      ))}
                    </PfRow>
                  )}

                  <PfRow label="ملاحظات">
                    <Textarea rows={2} className="text-sm w-full" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
                  </PfRow>

                  <PfRow label="المظهر العام للجلد">
                    {[["NORMAL","طبيعي"],["PALE","شاحب"],["DRY","جاف"],["INFLAMED","ملتهب"],["PEELING","متقشر"],["OOZING","نازّ"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.skinAppearance.includes(val)} label={lbl} onClick={() => set({ skinAppearance: tog(f.skinAppearance, val) })} />
                    ))}
                  </PfRow>

                  <PfRow label="لون البشرة">
                    {[["NORMAL","طبيعي"],["PALE","شاحب"],["YELLOWISH","مصفر"],["ERYTHEMATOUS","محمر"],["CYANOTIC","مزرق"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.skinColor.includes(val)} label={lbl} onClick={() => set({ skinColor: tog(f.skinColor, val) })} />
                    ))}
                  </PfRow>

                  <PfRow label="درجة حرارة الجسم">
                    {[["NORMAL","طبيعي"],["COLD","بارد"],["HOT","حار"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.skinTemperature === val} label={lbl} onClick={() => set({ skinTemperature: val })} />
                    ))}
                  </PfRow>

                  <PfRow label="الطعوم الجلدية">
                    <PfSq checked={f.hasSkinGrafts} label="يوجد طعم جلدي" onClick={() => set({ hasSkinGrafts: !f.hasSkinGrafts })} />
                    {f.hasSkinGrafts && (
                      <Input className="h-7 text-sm w-64 mt-1" placeholder="منطقة الطعم..." value={f.graftArea} onChange={(e) => set({ graftArea: e.target.value })} />
                    )}
                  </PfRow>

                  <PfRow label="حالة الندبة">
                    {[["HEALED","ملتئمة"],["INFLAMED","ملتهبة"],["FLEXIBLE","مرنة"],["HEALED_WITH_PINS","ملتئمة مع ترس"],["DRY","جافة"],["OPEN","مفتوحة"],["OOZING","نازّة"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.scarCondition.includes(val)} label={lbl} onClick={() => set({ scarCondition: tog(f.scarCondition, val) })} />
                    ))}
                  </PfRow>

                  <PfRow label="حالة الصحة العامة">
                    <Input className="h-7 text-sm w-80" value={f.generalHealthNotes} onChange={(e) => set({ generalHealthNotes: e.target.value })} />
                  </PfRow>

                  <PfRow label="حالة الأطراف الأخرى">
                    <Input className="h-7 text-sm w-80" value={f.otherLimbCondition} onChange={(e) => set({ otherLimbCondition: e.target.value })} />
                  </PfRow>

                  <PfRow label="هل يستخدم المريض طرفاً صناعياً">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={g.currentlyUsingProsthesis === true} onCheckedChange={(v) => setG({ currentlyUsingProsthesis: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>

                  {g.currentlyUsingProsthesis === false && (
                    <PfRow label="إذا كانت الإجابة لا هل استخدمه سابقاً">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">لا</span>
                        <Switch checked={g.previouslyUsedProsthesis === true} onCheckedChange={(v) => setG({ previouslyUsedProsthesis: v })} />
                        <span className="text-sm text-muted-foreground">نعم</span>
                      </div>
                      {g.previouslyUsedProsthesis === true && (
                        <Input className="h-7 text-sm w-64 mt-1" placeholder="يرجى تحديد نظام الطرف الصناعي..." value={g.previousProsthesisSystemDetail} onChange={(e) => setG({ previousProsthesisSystemDetail: e.target.value })} />
                      )}
                    </PfRow>
                  )}

                  <PfRow label="هل يستخدم وسائل مساعدة في عملية التنقل">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={f.usesAssistiveDevices === true} onCheckedChange={(v) => set({ usesAssistiveDevices: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                    {f.usesAssistiveDevices && (
                      <Input className="h-7 text-sm w-64 mt-1" placeholder="نوع الوسيلة المساعدة..." value={f.assistiveDeviceTypes} onChange={(e) => set({ assistiveDeviceTypes: e.target.value })} />
                    )}
                  </PfRow>

                  <PfRow label="هل يمكنه صعود ونزول درج">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={f.canClimbStairs === true} onCheckedChange={(v) => set({ canClimbStairs: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>

                  <PfRow label="هل يستطيع الحفاظ على توازنه على جانب واحد فقط">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={f.canBalanceOneSide === true} onCheckedChange={(v) => set({ canBalanceOneSide: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>

                  <PfRow label="مدى حركة المفاصل">
                    {[["NORMAL","الحالة الطبيعية"],["ACTIVE","نشط"],["SEDENTARY","خامل"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={f.jointsRangeOfMotion === val} label={lbl} onClick={() => set({ jointsRangeOfMotion: val })} />
                    ))}
                  </PfRow>

                  <PfRow label="مستوى النشاط">
                    {["K0","K1","K2","K3","K4"].map((k) => (
                      <PfSq key={k} checked={f.activityLevel === k} label={k} onClick={() => set({ activityLevel: k })} />
                    ))}
                  </PfRow>

                  <div className="pt-3">
                    <Button onClick={handleSubmitLowerAssessment} disabled={submitAssessmentLower.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      {submitAssessmentLower.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                      حفظ تقييم الطرف السفلي
                    </Button>
                  </div>
                </div>
              </Section>
            );
          })()}

          {/* ─── 4. Lower Muscle Strength ───────────────────────────────────── */}
          {(() => {
            const ampType = (intakeForm.amputationType || c.amputationType || "").toUpperCase();
            if (ampType !== "LOWER" && ampType !== "BOTH") return null;
            const f = lowerAssessForm;
            const set = (patch: Partial<typeof lowerAssessForm>) => setLowerAssessForm((prev) => ({ ...prev, ...patch }));
            const rd = f.romData;
            const setJoint = (joint: string, field: string, val: boolean) =>
              set({ romData: { ...rd, [joint]: { ...rd[joint], [field]: val } } });
            return (
              <Section title="تقييم قوة حركة العضلات">
                <div className="divide-y divide-border/30">
                  <PfRow label="الكاحل">
                    <PfSq checked={rd.ankle?.dorsiflexion ?? false} label="عطف ظهري" onClick={() => setJoint("ankle","dorsiflexion", !rd.ankle?.dorsiflexion)} />
                    <PfSq checked={rd.ankle?.plantarFlexion ?? false} label="عطف أخمصي" onClick={() => setJoint("ankle","plantarFlexion", !rd.ankle?.plantarFlexion)} />
                    <PfSq checked={rd.ankle?.inversion ?? false} label="انقلاب داخلي" onClick={() => setJoint("ankle","inversion", !rd.ankle?.inversion)} />
                    <PfSq checked={rd.ankle?.eversion ?? false} label="انقلاب خارجي" onClick={() => setJoint("ankle","eversion", !rd.ankle?.eversion)} />
                  </PfRow>
                  <PfRow label="الركبة">
                    <PfSq checked={rd.knee?.extension ?? false} label="البسط" onClick={() => setJoint("knee","extension", !rd.knee?.extension)} />
                    <PfSq checked={rd.knee?.flexion ?? false} label="العطف" onClick={() => setJoint("knee","flexion", !rd.knee?.flexion)} />
                  </PfRow>
                  <PfRow label="الورك">
                    <PfSq checked={rd.hip?.flexion ?? false} label="العطف" onClick={() => setJoint("hip","flexion", !rd.hip?.flexion)} />
                    <PfSq checked={rd.hip?.extension ?? false} label="البسط" onClick={() => setJoint("hip","extension", !rd.hip?.extension)} />
                    <PfSq checked={rd.hip?.adduction ?? false} label="التقريب" onClick={() => setJoint("hip","adduction", !rd.hip?.adduction)} />
                    <PfSq checked={rd.hip?.abduction ?? false} label="التبعيد" onClick={() => setJoint("hip","abduction", !rd.hip?.abduction)} />
                    <PfSq checked={rd.hip?.internalRotation ?? false} label="دوران داخلي" onClick={() => setJoint("hip","internalRotation", !rd.hip?.internalRotation)} />
                  </PfRow>
                  <PfRow label="ملاحظات">
                    <Textarea rows={2} className="text-sm w-full" value={f.muscleMotionNotes} onChange={(e) => set({ muscleMotionNotes: e.target.value })} />
                  </PfRow>
                  <div className="pt-3">
                    <Button onClick={handleSubmitLowerAssessment} disabled={submitAssessmentLower.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      {submitAssessmentLower.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                      حفظ تقييم قوة حركة العضلات
                    </Button>
                  </div>
                </div>
              </Section>
            );
          })()}

          {/* ─── زر الإرسال للجنة ────────────────────────────────────────────── */}
          {c.status === "ASSESSMENT" && (
            <Button
              onClick={handleSubmitAssessmentAndAdvance}
              disabled={submitAssessmentUpper.isPending || submitAssessmentLower.isPending || updateStatus.isPending}
              className="w-full"
            >
              {(submitAssessmentUpper.isPending || submitAssessmentLower.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
              إرسال التقييم للجنة
            </Button>
          )}
        </TabsContent>

        {/* ── COMMITTEE ───────────────────────────────────────────────────── */}
        <TabsContent value="committee_review" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>

          {/* آراء أعضاء اللجنة */}
          <Section title="آراء أعضاء اللجنة">
            <div className="space-y-5 divide-y divide-border/40">

              {/* فني الأطراف الصناعية */}
              <div className="space-y-2 pt-2 first:pt-0">
                <Label className="font-semibold">تقييم فني الأطراف الصناعية</Label>
                <Textarea rows={3} value={prosthetistOpinion} onChange={(e) => setProsthetistOpinion(e.target.value)} placeholder="رأي فني الأطراف الصناعية..." />
                {c.status === "COMMITTEE_REVIEW" && (
                  <Button size="sm" variant="outline" onClick={() => handleSubmitOpinion("PROSTHETIST", prosthetistOpinion)} disabled={!prosthetistOpinion.trim() || submitOpinion.isPending}>
                    حفظ رأي الفني
                  </Button>
                )}
              </div>

              {/* المعالج الفيزيائي */}
              <div className="space-y-2 pt-4">
                <Label className="font-semibold">تقييم المعالج الفيزيائي</Label>
                <Textarea rows={3} value={physioOpinion} onChange={(e) => setPhysioOpinion(e.target.value)} placeholder="رأي المعالج الفيزيائي..." />
                {c.status === "COMMITTEE_REVIEW" && (
                  <Button size="sm" variant="outline" onClick={() => handleSubmitOpinion("PHYSIOTHERAPIST", physioOpinion)} disabled={!physioOpinion.trim() || submitOpinion.isPending}>
                    حفظ رأي المعالج
                  </Button>
                )}
              </div>

              {/* الطبيب المختص */}
              <div className="space-y-2 pt-4">
                <Label className="font-semibold">رأي الطبيب المختص</Label>
                <Textarea rows={3} value={doctorOpinion} onChange={(e) => setDoctorOpinion(e.target.value)} placeholder="رأي الطبيب المختص..." />
                {c.status === "COMMITTEE_REVIEW" && (
                  <Button size="sm" variant="outline" onClick={() => handleSubmitOpinion("DOCTOR", doctorOpinion)} disabled={!doctorOpinion.trim() || submitOpinion.isPending}>
                    حفظ رأي الطبيب
                  </Button>
                )}
              </div>
            </div>
          </Section>

          {/* القرار النهائي */}
          <Section title="القرار النهائي">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>نوع الطرف الصناعي المراد تطبيقه</Label>
                <Select value={prosthesisTypeForm} onValueChange={(v) => setProsthesisTypeForm(v as ProstheticType)}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROSTHETIC_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الخلاصة <span className="text-destructive">*</span></Label>
                <Textarea rows={2} value={decisionForm.finalSummary} onChange={(e) => setDecisionForm((f) => ({ ...f, finalSummary: e.target.value }))} />
              </div>
              {(c.status === "COMMITTEE_REVIEW" || c.status === "COMMITTEE_APPROVED") && (
                <Button variant="outline" onClick={handleSubmitDecision} disabled={!decisionForm.finalSummary || submitDecision.isPending} className="w-full">
                  حفظ القرار
                </Button>
              )}
            </div>
          </Section>

          {/* التوقيعات */}
          {(c.status === "COMMITTEE_REVIEW" || c.status === "COMMITTEE_APPROVED") && (
            <Section title="التوقيعات">
              <div className="grid grid-cols-3 gap-3">
                <ActionGuard permission={PERMISSIONS.CLINIC_PROSTHETICS.COMMITTEE_SIGN}>
                  <Button variant="outline" className="w-full flex-col h-auto py-3 gap-1" onClick={() => { setSignRole("DOCTOR"); setSignOpen(true); }}>
                    <span className="text-sm font-medium">توقيع الطبيب</span>
                    <span className="text-xs text-muted-foreground">DOCTOR</span>
                  </Button>
                </ActionGuard>
                <ActionGuard permission={PERMISSIONS.CLINIC_PROSTHETICS.COMMITTEE_SIGN}>
                  <Button variant="outline" className="w-full flex-col h-auto py-3 gap-1" onClick={() => { setSignRole("PROSTHETIST"); setSignOpen(true); }}>
                    <span className="text-sm font-medium">توقيع فني الأطراف</span>
                    <span className="text-xs text-muted-foreground">PROSTHETIST</span>
                  </Button>
                </ActionGuard>
                <ActionGuard permission={PERMISSIONS.CLINIC_PROSTHETICS.COMMITTEE_SIGN}>
                  <Button variant="outline" className="w-full flex-col h-auto py-3 gap-1" onClick={() => { setSignRole("PHYSIOTHERAPIST"); setSignOpen(true); }}>
                    <span className="text-sm font-medium">توقيع المعالج الفيزيائي</span>
                    <span className="text-xs text-muted-foreground">PHYSIOTHERAPIST</span>
                  </Button>
                </ActionGuard>
              </div>
            </Section>
          )}
        </TabsContent>

        {/* ── FITTING ─────────────────────────────────────────────────────── */}
        <TabsContent value="fitting" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="قطع الطرف الصناعي">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الكود <span className="text-destructive">*</span></Label>
                  <Input value={compForm.partCode} onChange={(e) => setCompForm((f) => ({ ...f, partCode: e.target.value }))} placeholder="4R72=32AL" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>اسم القطعة <span className="text-destructive">*</span></Label>
                  <Input value={compForm.partName} onChange={(e) => setCompForm((f) => ({ ...f, partName: e.target.value }))} placeholder="Socket, Pylon..." />
                </div>
                <div className="space-y-1.5">
                  <Label>الشركة</Label>
                  <Input value={compForm.supplier} onChange={(e) => setCompForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="OTTOBOCK، أخرى..." />
                </div>
                <div className="space-y-1.5">
                  <Label>المصدر</Label>
                  <Select value={compForm.sourceLocation} onValueChange={(v) => setCompForm((f) => ({ ...f, sourceLocation: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAREHOUSE">المستودع</SelectItem>
                      <SelectItem value="SUPPLIER">مورّد الجهاز</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>السبب (اختياري)</Label>
                <Input value={compForm.reason} onChange={(e) => setCompForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
              <Button onClick={handleAddComponent} disabled={!compForm.partCode.trim() || !compForm.partName.trim() || addComponent.isPending} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" /> إضافة قطعة
              </Button>
              {components.length > 0 && (
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-right p-2 font-medium">الكود</th>
                        <th className="text-right p-2 font-medium">القطعة</th>
                        <th className="text-right p-2 font-medium">الشركة</th>
                        <th className="text-right p-2 font-medium">المصدر</th>
                        <th className="text-right p-2 font-medium">المخزون</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((comp) => (
                        <tr key={comp.id} className="border-t">
                          <td className="p-2 font-mono text-xs">{comp.partCode ?? comp.code ?? "—"}</td>
                          <td className="p-2 font-medium">{comp.partName ?? comp.name ?? "—"}</td>
                          <td className="p-2 text-muted-foreground">{comp.supplier ?? "—"}</td>
                          <td className="p-2 text-muted-foreground">{(comp.sourceLocation ?? comp.source) === "WAREHOUSE" ? "مستودع" : "مورد"}</td>
                          <td className="p-2">
                            {comp.matchedInInventory === false
                              ? <span className="text-xs text-orange-600 font-medium">غير موجود بالمخزون</span>
                              : comp.matchedInInventory === true
                              ? <span className="text-xs text-green-600 font-medium">خُصم</span>
                              : "—"}
                          </td>
                          <td className="p-2">
                            <button onClick={() => deleteComponent.mutate({ id, compId: comp.id })} className="text-destructive hover:opacity-70">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {c.status === "FITTING" && (
                <div className="flex gap-2">
                  <Button onClick={() => updateCase.mutateAsync({ id, dto: { prosthesisCompleted: true } })} variant="outline" className="flex-1" disabled={updateCase.isPending}>
                    الطرف مكتمل ✓
                  </Button>
                  <Button onClick={handleAdvanceToGait} disabled={updateStatus.isPending} className="flex-1">
                    الانتقال لتحليل المشي
                  </Button>
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── GAIT ANALYSIS ───────────────────────────────────────────────── */}
        <TabsContent value="gait_analysis" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="تحليل المشي">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>الاستنتاج السريري</Label>
                <Textarea rows={3} value={gaitForm.clinicalConclusion} onChange={(e) => setGaitForm((f) => ({ ...f, clinicalConclusion: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>التوصيات</Label>
                <Textarea rows={2} value={gaitForm.recommendations} onChange={(e) => setGaitForm((f) => ({ ...f, recommendations: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>خطة العلاج</Label>
                <Textarea rows={2} value={gaitForm.treatmentPlan} onChange={(e) => setGaitForm((f) => ({ ...f, treatmentPlan: e.target.value }))} />
              </div>
              {c.status === "GAIT_ANALYSIS" && (
                <Button onClick={handleSubmitGait} disabled={submitGait.isPending || updateStatus.isPending} className="w-full">
                  {submitGait.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  حفظ والانتقال للتقييم النهائي
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── BALANCE ASSESSMENT ──────────────────────────────────────────── */}
        <TabsContent value="balance_assessment" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="تقييم التوازن">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>المستوى العام للتوازن</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={balanceForm.overallLevel}
                  onChange={(e) => setBalanceForm((f) => ({ ...f, overallLevel: e.target.value }))}
                >
                  <option value="">اختر</option>
                  <option value="INDEPENDENT">مستقل</option>
                  <option value="NEEDS_ASSISTANCE">يحتاج مساعدة</option>
                  <option value="DEPENDENT">يعتمد على الغير</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>مستوى خطر السقوط</Label>
                <div className="flex gap-3">
                  {(["LOW", "MODERATE", "HIGH"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBalanceForm((f) => ({ ...f, fallRisk: r }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        balanceForm.fallRisk === r
                          ? r === "LOW" ? "bg-green-100 border-green-500 text-green-800"
                            : r === "MODERATE" ? "bg-yellow-100 border-yellow-500 text-yellow-800"
                            : "bg-red-100 border-red-500 text-red-800"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {r === "LOW" ? "منخفض" : r === "MODERATE" ? "متوسط" : "عالي"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea rows={3} value={balanceForm.notes} onChange={(e) => setBalanceForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button onClick={handleSubmitBalance} disabled={!balanceForm.overallLevel || submitBalance.isPending} className="w-full">
                {submitBalance.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                حفظ تقييم التوازن
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── CONSUMABLES ─────────────────────────────────────────────────── */}
        <TabsContent value="consumables" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="المستهلكات">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>اسم المادة <span className="text-destructive">*</span></Label>
                  <Input value={consumableForm.name} onChange={(e) => setConsumableForm((f) => ({ ...f, name: e.target.value }))} placeholder="قطن، ضمادة..." />
                </div>
                <div className="space-y-1.5">
                  <Label>الكمية</Label>
                  <Input type="number" min={1} value={consumableForm.quantity} onChange={(e) => setConsumableForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>الوحدة</Label>
                  <Input value={consumableForm.unit} onChange={(e) => setConsumableForm((f) => ({ ...f, unit: e.target.value }))} placeholder="قطعة، رول، مل..." />
                </div>
                <div className="space-y-1.5">
                  <Label>ملاحظات</Label>
                  <Input value={consumableForm.notes} onChange={(e) => setConsumableForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <Button variant="outline" onClick={handleAddConsumable} disabled={!consumableForm.name.trim()} className="w-full gap-2">
                <Plus className="h-4 w-4" /> إضافة للقائمة
              </Button>
              {consumables.length > 0 && (
                <>
                  <div className="rounded-lg border text-sm">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-2 font-medium">المادة</th>
                          <th className="text-right p-2 font-medium">الكمية</th>
                          <th className="text-right p-2 font-medium">الوحدة</th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {consumables.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2">{item.quantity}</td>
                            <td className="p-2 text-muted-foreground">{item.unit || "—"}</td>
                            <td className="p-2">
                              <button onClick={() => setConsumables((prev) => prev.filter((_, j) => j !== i))} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button onClick={handleSaveConsumables} disabled={addConsumable.isPending} className="w-full">
                    {addConsumable.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    حفظ المستهلكات
                  </Button>
                </>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── FINAL EVALUATION ────────────────────────────────────────────── */}
        <TabsContent value="final_evaluation" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="التقييم النهائي">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>النتيجة الوظيفية</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={finalEvalForm.functionalOutcome}
                  onChange={(e) => setFinalEvalForm((f) => ({ ...f, functionalOutcome: e.target.value }))}
                >
                  <option value="">اختر</option>
                  <option value="EXCELLENT">ممتاز</option>
                  <option value="GOOD">جيد</option>
                  <option value="FAIR">مقبول</option>
                  <option value="POOR">ضعيف</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>رضا المريض</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={finalEvalForm.patientSatisfaction}
                  onChange={(e) => setFinalEvalForm((f) => ({ ...f, patientSatisfaction: e.target.value }))}
                >
                  <option value="">اختر</option>
                  <option value="VERY_SATISFIED">راضٍ جداً</option>
                  <option value="SATISFIED">راضٍ</option>
                  <option value="NEUTRAL">محايد</option>
                  <option value="DISSATISFIED">غير راضٍ</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات التقييم النهائي</Label>
                <Textarea rows={3} value={finalEvalForm.notes} onChange={(e) => setFinalEvalForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              {c.status === "FINAL_EVALUATION" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSubmitFinalEval} disabled={submitFinalEval.isPending} className="flex-1">
                    حفظ التقييم
                  </Button>
                  <ActionGuard permission={PERMISSIONS.CLINIC_PROSTHETICS.DELIVERY_APPROVE}>
                    <Button onClick={() => setFinalSignOpen(true)} className="flex-1">
                      توقيع المدير والانتقال للتسليم
                    </Button>
                  </ActionGuard>
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── DELIVERED ───────────────────────────────────────────────────── */}
        <TabsContent value="delivered" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="تفاصيل التسليم">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>تاريخ التسليم</Label>
                <Input
                  type="date"
                  value={deliveryForm.deliveryDate}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات التسليم</Label>
                <Textarea rows={2} value={deliveryForm.notes} onChange={(e) => setDeliveryForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              {c.status === "DELIVERED" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSubmitDelivery} disabled={submitDelivery.isPending} className="flex-1">
                    حفظ بيانات التسليم
                  </Button>
                  <Button onClick={() => setDeliverySignOpen(true)} className="flex-1">
                    توقيع المريض وإنهاء الحالة
                  </Button>
                </div>
              )}
              {c.deliveryDate && (
                <div className="rounded-lg border bg-green-50 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">تم تسليم الطرف الصناعي</p>
                    <p className="text-sm text-green-700">{new Date(c.deliveryDate).toLocaleDateString("ar")}</p>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── FOLLOW UP ───────────────────────────────────────────────────── */}
        <TabsContent value="follow_up" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="إضافة متابعة">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>التاريخ</Label>
                  <Input type="date" value={followUpForm.date} onChange={(e) => setFollowUpForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>شدة الألم (0-10)</Label>
                  <Input type="number" min={0} max={10} value={followUpForm.painLevel} onChange={(e) => setFollowUpForm((f) => ({ ...f, painLevel: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>مستوى K الحالي</Label>
                <KLevelSelector value={followUpForm.kLevel} onChange={(v) => setFollowUpForm((f) => ({ ...f, kLevel: v }))} />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات <span className="text-destructive">*</span></Label>
                <Textarea rows={2} value={followUpForm.notes} onChange={(e) => setFollowUpForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button onClick={handleAddFollowUp} disabled={!followUpForm.notes.trim() || addFollowUp.isPending} className="w-full gap-2">
                <Plus className="h-4 w-4" /> إضافة متابعة
              </Button>
            </div>
          </Section>
          {followUps.length > 0 && (
            <Section title={`سجل المتابعات (${followUps.length})`}>
              <div className="space-y-3">
                {followUps.map((fu) => (
                  <div key={fu.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{new Date(fu.date).toLocaleDateString("ar")}</span>
                      <div className="flex gap-3 text-muted-foreground">
                        {fu.kLevel && <span>K: {fu.kLevel}</span>}
                        {fu.painLevel != null && <span>ألم: {fu.painLevel}/10</span>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{fu.notes}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </TabsContent>

        {/* ── TIMELINE ────────────────────────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="السجل الزمني">
            {timeline.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد أحداث بعد</p>
            ) : (
              <div className="relative space-y-4 pr-4">
                <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-border" />
                {timeline.map((ev) => (
                  <div key={ev.id} className="relative flex gap-3">
                    <div className="absolute -right-4 top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    <div className="flex-1 rounded-lg border p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString("ar")}</span>
                      </div>
                      {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                      {ev.actorName && <p className="text-xs text-muted-foreground">بواسطة: {ev.actorName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      {/* Signature dialog for committee sign */}
      <SignaturePadDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title={signRole === "DOCTOR" ? "توقيع الطبيب" : signRole === "PROSTHETIST" ? "توقيع فني الأطراف الصناعية" : "توقيع المعالج الفيزيائي"}
        legalNotice="بتوقيعك هذا تؤكد مشاركتك في قرار اللجنة الطبية."
        onSign={handleSign}
        isLoading={signDecision.isPending}
      />

      <SignaturePadDialog
        open={finalSignOpen}
        onOpenChange={setFinalSignOpen}
        title="توقيع المدير على التقييم النهائي"
        legalNotice="بتوقيعك تؤكد اعتماد التقييم النهائي والموافقة على انتقال الحالة للتسليم."
        onSign={handleSignFinalEval}
        isLoading={signFinalEval.isPending}
      />

      <SignaturePadDialog
        open={deliverySignOpen}
        onOpenChange={setDeliverySignOpen}
        title="توقيع المريض على استلام الطرف الصناعي"
        legalNotice="بتوقيعك تؤكد استلامك الطرف الصناعي بحالة جيدة."
        onSign={handleSignDelivery}
        isLoading={signDelivery.isPending}
      />
    </div>
  );
}
