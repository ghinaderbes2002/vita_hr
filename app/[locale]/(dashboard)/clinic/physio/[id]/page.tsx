"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowRight, Plus, Trash2, CheckCircle2, Loader2, Save,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { BodyPainMap } from "@/components/clinic/body-pain-map";
import { SignaturePadDialog } from "@/components/clinic/signature-pad-dialog";
import { PdfExportButton } from "@/components/clinic/pdf-export-button";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ActionGuard } from "@/components/permissions/action-guard";
import {
  usePhysioCase, useUpdatePhysioCase, useUpdatePhysioStatus,
  useSubmitComplaint,
  useSubmitPainMap, useSubmitMedicalHistory, useAddPhysioSurgery,
  useSubmitPhysioGoals, useSubmitPosturalAssessment,
  useSubmitTreatmentPlan, useSupervisorReview, useSignPhysioTreatmentPlan,
  usePhysioSessions, useAddPhysioSession, useDeletePhysioSession,
  usePhysioTimeline,
} from "@/lib/hooks/use-clinic-physio";
import {
  PhysioStatus, PainRegion,
  TherapyModality, THERAPY_MODALITY_LABELS,
  ChronicCondition, CHRONIC_CONDITION_LABELS,
  PhysioGoal, PHYSIO_GOAL_LABELS,
  TestType,
} from "@/lib/api/clinic-physio";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card dir="rtl">
      <CardHeader className="pb-2"><CardTitle className="text-base text-right">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
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
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
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

const THERAPY_MODALITIES = Object.keys(THERAPY_MODALITY_LABELS) as TherapyModality[];
const CHRONIC_CONDITIONS  = Object.keys(CHRONIC_CONDITION_LABELS) as ChronicCondition[];
const PHYSIO_GOALS        = Object.keys(PHYSIO_GOAL_LABELS) as PhysioGoal[];

const TEST_LABELS: Record<TestType, string> = {
  MRI:         "MRI",
  XRAY:        "صورة شعاعية",
  CT:          "CT Scan",
  MYELOGRAM:   "Myelogram",
  BONE_DENSITY:"كثافة العظام",
  OTHER:       "أخرى",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PhysioCasePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const locale  = useLocale();

  const { data: caseData, isLoading } = usePhysioCase(id);
  const { data: sessions = [] }       = usePhysioSessions(id);
  const { data: timeline = [] }       = usePhysioTimeline(id);

  const updateCase      = useUpdatePhysioCase();
  const updateStatus    = useUpdatePhysioStatus();
  const submitComplaint = useSubmitComplaint();
  const submitPainMap = useSubmitPainMap();
  const submitHistory = useSubmitMedicalHistory();
  const addSurgery    = useAddPhysioSurgery();
  const submitGoals   = useSubmitPhysioGoals();
  const submitPostural = useSubmitPosturalAssessment();
  const submitPlan    = useSubmitTreatmentPlan();
  const supervisorRev = useSupervisorReview();
  const signPlan      = useSignPhysioTreatmentPlan();
  const addSession    = useAddPhysioSession();
  const deleteSession = useDeletePhysioSession();

  // ── Complaint state ──────────────────────────────────────────────────────────
  const [complaint, setComplaint] = useState({
    majorComplaint: "", symptoms: "", currentJob: "", lifeType: "",
    complaintStartDate: "", possibleCause: "", previousDoctorSeen: "",
    previousTreatment: "", painLevel: "", painDuration: "", painProgression: "",
    hadPreviousInjury: false, bestTimeOfDay: "", worstTimeOfDay: "",
    // New fields
    complaintType: "", painLocation: "", complaintDuration: "", complaintNotes: "",
    hasChronicDiseases: false, chronicDiseasesDetail: "",
    visitedSpecialist: false, specialistReason: "",
    hadPreviousPT: false, previousPTDetail: "",
    hadSurgery: false, surgeryDetail: "",
  });

  // ── Pain map state ───────────────────────────────────────────────────────────
  const [painRegions, setPainRegions]             = useState<PainRegion[]>([]);
  const [painTypes, setPainTypes]                 = useState<string[]>([]);
  const [painTypeOther, setPainTypeOther]         = useState("");
  const [aggravatingFactors, setAggravatingFactors] = useState<string[]>([]);
  const [alleviatingFactors, setAlleviatingFactors] = useState<string[]>([]);
  const [aggravatingOther, setAggravatingOther]   = useState("");
  const [alleviatingOther, setAlleviatingOther]   = useState("");

  // ── Medical history state ────────────────────────────────────────────────────
  const [history, setHistory] = useState({
    lifeType: "",
    smokes: false, hasSmokedBefore: false, smokingFrequency: "",
    hasPacemaker: false, pacemakerDetail: "",
    allergies: "", adhesiveAllergy: false,
    isPregnant: false,
    currentMedications: "", prescriptionDrugs: false,
    herbalSupplements: false, supplementsList: "",
    previousDiagnoses: "", previousComplaintsSurgeries: "",
    hasOtherHealthProblems: false, otherConditions: "",
    doctorRestrictions: "",
    hadPTSameProblem: false, ptSameProblemDetail: "",
    receivingOtherTreatment: false, otherTreatmentDetail: "",
    testsOther: "", testResults: "",
    newAnalysis: "", newAnalysisDate: "", newAnalysisAttachment: "",
    oldAnalysis: "", oldAnalysisDate: "", oldAnalysisAttachment: "",
    boneDensityTest: false, boneDensityDetail: "",
    hospitalizedLastYear: false, hospitalizedDetail: "",
  });
  const [chronicConditions, setChronicConditions] = useState<ChronicCondition[]>([]);
  const [testsHad, setTestsHad]                   = useState<TestType[]>([]);
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
    customGoal: "", decreasePain: false, improveStrength: false,
    lessDifficultyWork: false, improveMovement: false,
    standLongerMinutes: "", sleepLongerMinutes: "", sitLongerMinutes: "", otherGoals: "",
  });

  // ── Postural assessment state ────────────────────────────────────────────────
  const [postural, setPostural] = useState({
    headPosition: "",
    shoulderRight: "", shoulderLeft: "",
    elbowRight: "", elbowLeft: "",
    thoraxPosition: "",
    spineLumbar: "", spineScoliosis: false, scoliosisApex: "", scoliosisDirection: "",
    pelvisTilt: "", pelvisLateral: "",
    hipRight: "", hipLeft: "",
    kneeRight: "", kneeLeft: "",
    footRight: "", footLeft: "",
    spasticityNotes: "", generalNotes: "", diagnosis: "",
    seatedPosition: "", trunkControl: "",
  });

  // ── Treatment plan state ─────────────────────────────────────────────────────
  const [planModalities, setPlanModalities] = useState<TherapyModality[]>([]);
  const [planHeader, setPlanHeader] = useState({
    treatmentFrom: "", treatmentTo: "", anticipatedVisits: "",
    physiotherapistId: "", caseManagerId: "",
  });
  const [planRemarks, setPlanRemarks]         = useState("");
  const [planObservation, setPlanObservation] = useState("");

  // ── Supervisor review state ──────────────────────────────────────────────────
  const [supervisorGaze, setSupervisorGaze] = useState("");

  // ── Sign / session state ─────────────────────────────────────────────────────
  const [signOpen, setSignOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "", notes: "", painLevel: "",
    modalities: [] as TherapyModality[],
  });

  // ── Auto-save pain regions ───────────────────────────────────────────────────
  const autoSaveReady  = useRef(false);
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    setTimeout(() => { autoSaveReady.current = true; }, 500);

    // Complaint
    setComplaint({
      majorComplaint:        caseData.majorComplaint        ?? "",
      symptoms:              caseData.symptoms              ?? "",
      currentJob:            caseData.currentJob            ?? "",
      lifeType:              caseData.lifeType              ?? "",
      complaintStartDate:    caseData.complaintStartDate ? caseData.complaintStartDate.slice(0, 10) : "",
      possibleCause:         caseData.possibleCause         ?? "",
      previousDoctorSeen:    caseData.previousDoctorSeen    ?? "",
      previousTreatment:     caseData.previousTreatment     ?? "",
      painLevel:             caseData.painLevel             ?? "",
      painDuration:          caseData.painDuration          ?? "",
      painProgression:       caseData.painProgression       ?? "",
      hadPreviousInjury:     caseData.hadPreviousInjury     ?? false,
      bestTimeOfDay:         caseData.bestTimeOfDay         ?? "",
      worstTimeOfDay:        caseData.worstTimeOfDay        ?? "",
      complaintType:         caseData.complaintType         ?? "",
      painLocation:          caseData.painLocation          ?? "",
      complaintDuration:     caseData.complaintDuration     ?? "",
      complaintNotes:        caseData.complaintNotes        ?? "",
      hasChronicDiseases:    caseData.hasChronicDiseases    ?? false,
      chronicDiseasesDetail: caseData.chronicDiseasesDetail ?? "",
      visitedSpecialist:     caseData.visitedSpecialist     ?? false,
      specialistReason:      caseData.specialistReason      ?? "",
      hadPreviousPT:         caseData.hadPreviousPT         ?? false,
      previousPTDetail:      caseData.previousPTDetail      ?? "",
      hadSurgery:            caseData.hadSurgery            ?? false,
      surgeryDetail:         caseData.surgeryDetail         ?? "",
    });

    // Pain map
    if (caseData.painMap?.regions?.length) {
      setPainRegions(caseData.painMap.regions);
    }
    if (caseData.painTypes?.length)          setPainTypes(caseData.painTypes);
    if (caseData.painTypeOther)              setPainTypeOther(caseData.painTypeOther);
    if (caseData.aggravatingFactors?.length) setAggravatingFactors(caseData.aggravatingFactors);
    if (caseData.alleviatingFactors?.length) setAlleviatingFactors(caseData.alleviatingFactors);
    if (caseData.aggravatingOther)           setAggravatingOther(caseData.aggravatingOther);
    if (caseData.alleviatingOther)           setAlleviatingOther(caseData.alleviatingOther);

    // Medical history
    const mh = caseData.medicalHistory;
    if (mh) {
      setHistory({
        lifeType:                   caseData.lifeType              ?? mh.lifeType ?? "",
        smokes:                     mh.smokes                      ?? false,
        hasSmokedBefore:            mh.hasSmokedBefore             ?? false,
        smokingFrequency:           mh.smokingFrequency            ?? "",
        hasPacemaker:               mh.hasPacemaker                ?? false,
        pacemakerDetail:            mh.pacemakerDetail             ?? "",
        allergies:                  mh.allergies                   ?? "",
        adhesiveAllergy:            mh.adhesiveAllergy             ?? false,
        isPregnant:                 mh.isPregnant                  ?? false,
        currentMedications:         mh.currentMedications          ?? "",
        prescriptionDrugs:          mh.prescriptionDrugs           ?? false,
        herbalSupplements:          mh.herbalSupplements           ?? false,
        supplementsList:            mh.supplementsList             ?? "",
        previousDiagnoses:          mh.previousDiagnoses           ?? "",
        previousComplaintsSurgeries: mh.previousComplaintsSurgeries ?? "",
        hasOtherHealthProblems:     mh.hasOtherHealthProblems      ?? false,
        otherConditions:            mh.otherConditions             ?? "",
        doctorRestrictions:         mh.doctorRestrictions          ?? "",
        hadPTSameProblem:           mh.hadPTSameProblem            ?? false,
        ptSameProblemDetail:        mh.ptSameProblemDetail         ?? "",
        receivingOtherTreatment:    mh.receivingOtherTreatment     ?? false,
        otherTreatmentDetail:       mh.otherTreatmentDetail        ?? "",
        testsOther:                 mh.testsOther                  ?? "",
        testResults:                mh.testResults                 ?? "",
        newAnalysis:                mh.newAnalysis                 ?? "",
        newAnalysisDate:            mh.newAnalysisDate             ? mh.newAnalysisDate.slice(0, 10) : "",
        newAnalysisAttachment:      mh.newAnalysisAttachment       ?? "",
        oldAnalysis:                mh.oldAnalysis                 ?? "",
        oldAnalysisDate:            mh.oldAnalysisDate             ? mh.oldAnalysisDate.slice(0, 10) : "",
        oldAnalysisAttachment:      mh.oldAnalysisAttachment       ?? "",
        boneDensityTest:            mh.boneDensityTest             ?? false,
        boneDensityDetail:          mh.boneDensityDetail           ?? "",
        hospitalizedLastYear:       mh.hospitalizedLastYear        ?? false,
        hospitalizedDetail:         mh.hospitalizedDetail          ?? "",
      });
      if (mh.chronicConditions?.length) setChronicConditions(mh.chronicConditions);
      if (mh.testsHad?.length)          setTestsHad(mh.testsHad);

      // Surgeries — load existing rows from backend
      const backendSurgeries: any[] = mh.surgeries ?? [];
      if (backendSurgeries.length > 0) {
        const rows = Array.from({ length: 5 }, (_, i) => ({
          name: backendSurgeries[i]?.name  ?? "",
          type: backendSurgeries[i]?.type  ?? "",
          date: backendSurgeries[i]?.date  ? (backendSurgeries[i].date as string).slice(0, 10) : "",
        }));
        setSurgeries(rows);
      }
    }

    // Goals
    const g = caseData.goals;
    if (g) {
      if (g.goals?.length) setGoals(g.goals);
      setGoalsExtra({
        customGoal:          g.customGoal         ?? "",
        decreasePain:        g.decreasePain       ?? false,
        improveStrength:     g.improveStrength    ?? false,
        lessDifficultyWork:  g.lessDifficultyWork ?? false,
        improveMovement:     g.improveMovement    ?? false,
        standLongerMinutes:  g.standLongerMinutes != null ? String(g.standLongerMinutes) : "",
        sleepLongerMinutes:  g.sleepLongerMinutes != null ? String(g.sleepLongerMinutes) : "",
        sitLongerMinutes:    g.sitLongerMinutes   != null ? String(g.sitLongerMinutes)   : "",
        otherGoals:          g.otherGoals         ?? "",
      });
    }

    // Postural assessment
    const pa = caseData.posturalAssessment;
    if (pa) {
      setPostural({
        headPosition:       pa.head?.position         ?? "",
        shoulderRight:      pa.shoulders?.right       ?? "",
        shoulderLeft:       pa.shoulders?.left        ?? "",
        elbowRight:         pa.elbows?.right          ?? "",
        elbowLeft:          pa.elbows?.left           ?? "",
        thoraxPosition:     pa.thorax?.position       ?? "",
        spineLumbar:        pa.spine?.lumbar          ?? "",
        spineScoliosis:     pa.spine?.scoliosis       ?? false,
        scoliosisApex:      pa.spine?.scoliosisApex   ?? "",
        scoliosisDirection: pa.spine?.scoliosisDirection ?? "",
        pelvisTilt:         pa.pelvis?.tilt           ?? "",
        pelvisLateral:      pa.pelvis?.lateralTilt    ?? "",
        hipRight:           pa.hips?.right            ?? "",
        hipLeft:            pa.hips?.left             ?? "",
        kneeRight:          pa.knees?.right           ?? "",
        kneeLeft:           pa.knees?.left            ?? "",
        footRight:          pa.feet?.right            ?? "",
        footLeft:           pa.feet?.left             ?? "",
        spasticityNotes:    pa.spasticityNotes        ?? "",
        generalNotes:       pa.generalNotes           ?? "",
        diagnosis:          pa.diagnosis              ?? "",
        seatedPosition:     pa.seatedPosition         ?? "",
        trunkControl:       pa.trunkControl           ?? "",
      });
    }

    // Treatment plan
    const tp = caseData.treatmentPlan;
    if (tp) {
      if (tp.modalities?.length) setPlanModalities(tp.modalities);
      if (tp.remarks)     setPlanRemarks(tp.remarks);
      if (tp.observation) setPlanObservation(tp.observation);
    }
    setPlanHeader({
      treatmentFrom:     caseData.treatmentFrom     ? caseData.treatmentFrom.slice(0, 10) : "",
      treatmentTo:       caseData.treatmentTo       ? caseData.treatmentTo.slice(0, 10)   : "",
      anticipatedVisits: caseData.anticipatedVisits != null ? String(caseData.anticipatedVisits) : "",
      physiotherapistId: caseData.physiotherapistId ?? "",
      caseManagerId:     caseData.caseManagerId     ?? "",
    });
  }, [caseData]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }
  if (!caseData) {
    return <div className="text-center py-20 text-muted-foreground">الحالة غير موجودة</div>;
  }

  const c = caseData;
  const patientName = c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—";

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveComplaint = async () => {
    await updateCase.mutateAsync({
      id,
      dto: {
        majorComplaint:      complaint.majorComplaint || undefined,
        symptoms:            complaint.symptoms || undefined,
        currentJob:          complaint.currentJob || undefined,
        lifeType:            (complaint.lifeType as any) || undefined,
        complaintStartDate:  complaint.complaintStartDate || undefined,
        possibleCause:       complaint.possibleCause || undefined,
        previousDoctorSeen:  complaint.previousDoctorSeen || undefined,
        previousTreatment:   complaint.previousTreatment || undefined,
        painLevel:           (complaint.painLevel as any) || undefined,
        painDuration:        (complaint.painDuration as any) || undefined,
        painProgression:       complaint.painProgression || undefined,
        hadPreviousInjury:     complaint.hadPreviousInjury,
        bestTimeOfDay:         complaint.bestTimeOfDay || undefined,
        worstTimeOfDay:        complaint.worstTimeOfDay || undefined,
        complaintType:         complaint.complaintType || undefined,
        painLocation:          complaint.painLocation || undefined,
        complaintDuration:     complaint.complaintDuration || undefined,
        complaintNotes:        complaint.complaintNotes || undefined,
        hasChronicDiseases:    complaint.hasChronicDiseases,
        chronicDiseasesDetail: complaint.hasChronicDiseases ? (complaint.chronicDiseasesDetail || undefined) : undefined,
        visitedSpecialist:     complaint.visitedSpecialist,
        specialistReason:      complaint.visitedSpecialist ? (complaint.specialistReason || undefined) : undefined,
        hadPreviousPT:         complaint.hadPreviousPT,
        previousPTDetail:      complaint.hadPreviousPT ? (complaint.previousPTDetail || undefined) : undefined,
        hadSurgery:            complaint.hadSurgery,
        surgeryDetail:         complaint.hadSurgery ? (complaint.surgeryDetail || undefined) : undefined,
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
        complaintType:         complaint.complaintType || undefined,
        painLocation:          complaint.painLocation || undefined,
        complaintDuration:     complaint.complaintDuration || undefined,
        complaintNotes:        complaint.complaintNotes || undefined,
        hasChronicDiseases:    complaint.hasChronicDiseases,
        chronicDiseasesDetail: complaint.hasChronicDiseases ? (complaint.chronicDiseasesDetail || undefined) : undefined,
        visitedSpecialist:     complaint.visitedSpecialist,
        specialistReason:      complaint.visitedSpecialist ? (complaint.specialistReason || undefined) : undefined,
        hadPreviousPT:         complaint.hadPreviousPT,
        previousPTDetail:      complaint.hadPreviousPT ? (complaint.previousPTDetail || undefined) : undefined,
        hadSurgery:            complaint.hadSurgery,
        surgeryDetail:         complaint.hadSurgery ? (complaint.surgeryDetail || undefined) : undefined,
      },
    });
  };

  const handleSavePainMap = async () => {
    await submitPainMap.mutateAsync({
      id,
      dto: {
        regions:             painRegions,
        painTypes:           painTypes.length ? painTypes : undefined,
        painTypeOther:       painTypes.includes("OTHER") ? (painTypeOther || undefined) : undefined,
        aggravatingFactors:  aggravatingFactors.length ? aggravatingFactors : undefined,
        aggravatingOther:    aggravatingFactors.includes("OTHER") ? (aggravatingOther || undefined) : undefined,
        alleviatingFactors:  alleviatingFactors.length ? alleviatingFactors : undefined,
        alleviatingOther:    alleviatingFactors.includes("OTHER") ? (alleviatingOther || undefined) : undefined,
      },
    });
    if (["COMPLAINT", "INTAKE"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "PAIN_MAP" });
    }
  };

  const handleSaveHistory = async () => {
    // Only POST surgeries that don't already exist in the backend (prevent duplicates)
    const existingSurgeryNames = new Set(
      ((c.medicalHistory as any)?.surgeries ?? []).map((s: any) => s.name?.trim().toLowerCase())
    );
    const surgeriesFiltered = surgeries
      .filter((s) => s.name.trim() && !existingSurgeryNames.has(s.name.trim().toLowerCase()))
      .map((s, i) => ({ name: s.name, type: s.type || undefined, date: s.date || undefined, order: i + 1 }));

    await submitHistory.mutateAsync({
      id,
      dto: {
        lifeType:                    history.lifeType || undefined,
        smokes:                      history.smokes,
        hasSmokedBefore:             history.hasSmokedBefore,
        smokingFrequency:            history.smokingFrequency || undefined,
        hasPacemaker:                history.hasPacemaker,
        pacemakerDetail:             history.hasPacemaker ? (history.pacemakerDetail || undefined) : undefined,
        allergies:                   history.allergies || undefined,
        adhesiveAllergy:             history.adhesiveAllergy,
        isPregnant:                  history.isPregnant,
        currentMedications:          history.currentMedications || undefined,
        prescriptionDrugs:           history.prescriptionDrugs,
        herbalSupplements:           history.herbalSupplements,
        supplementsList:             history.herbalSupplements ? (history.supplementsList || undefined) : undefined,
        previousDiagnoses:           history.previousDiagnoses || undefined,
        previousComplaintsSurgeries: history.previousComplaintsSurgeries || undefined,
        hasOtherHealthProblems:      history.hasOtherHealthProblems,
        otherConditions:             history.hasOtherHealthProblems ? (history.otherConditions || undefined) : undefined,
        doctorRestrictions:          history.doctorRestrictions || undefined,
        hadPTSameProblem:            history.hadPTSameProblem,
        ptSameProblemDetail:         history.hadPTSameProblem ? (history.ptSameProblemDetail || undefined) : undefined,
        receivingOtherTreatment:     history.receivingOtherTreatment,
        otherTreatmentDetail:        history.receivingOtherTreatment ? (history.otherTreatmentDetail || undefined) : undefined,
        chronicConditions:           chronicConditions.length ? chronicConditions : undefined,
        testsHad:                    testsHad.length ? testsHad : undefined,
        testsOther:                  history.testsOther || undefined,
        testResults:                 history.testResults || undefined,
        newAnalysis:                 history.newAnalysis || undefined,
        newAnalysisDate:             history.newAnalysisDate || undefined,
        newAnalysisAttachment:       history.newAnalysisAttachment || undefined,
        oldAnalysis:                 history.oldAnalysis || undefined,
        oldAnalysisDate:             history.oldAnalysisDate || undefined,
        oldAnalysisAttachment:       history.oldAnalysisAttachment || undefined,
        boneDensityTest:             history.boneDensityTest,
        boneDensityDetail:           history.boneDensityTest ? (history.boneDensityDetail || undefined) : undefined,
        hospitalizedLastYear:        history.hospitalizedLastYear,
        hospitalizedDetail:          history.hospitalizedLastYear ? (history.hospitalizedDetail || undefined) : undefined,
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
        goals:               goals.length ? goals : undefined,
        customGoal:          goalsExtra.customGoal || undefined,
        decreasePain:        goalsExtra.decreasePain,
        improveStrength:     goalsExtra.improveStrength,
        lessDifficultyWork:  goalsExtra.lessDifficultyWork,
        improveMovement:     goalsExtra.improveMovement,
        standLongerMinutes:  goalsExtra.standLongerMinutes ? Number(goalsExtra.standLongerMinutes) : undefined,
        sleepLongerMinutes:  goalsExtra.sleepLongerMinutes ? Number(goalsExtra.sleepLongerMinutes) : undefined,
        sitLongerMinutes:    goalsExtra.sitLongerMinutes   ? Number(goalsExtra.sitLongerMinutes)   : undefined,
        otherGoals:          goalsExtra.otherGoals || undefined,
      },
    });
    if (["MEDICAL_HISTORY", "PAIN_MAP"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "GOALS" });
    }
  };

  const handleSavePostural = async () => {
    await submitPostural.mutateAsync({
      id,
      dto: {
        head:      { position: postural.headPosition || undefined },
        shoulders: { right: postural.shoulderRight || undefined, left: postural.shoulderLeft || undefined },
        elbows:    { right: postural.elbowRight || undefined,    left: postural.elbowLeft || undefined },
        thorax:    { position: postural.thoraxPosition || undefined },
        spine: {
          lumbar:             postural.spineLumbar || undefined,
          scoliosis:          postural.spineScoliosis,
          scoliosisApex:      postural.scoliosisApex || undefined,
          scoliosisDirection: postural.scoliosisDirection || undefined,
        },
        pelvis: {
          tilt:        postural.pelvisTilt || undefined,
          lateralTilt: postural.pelvisLateral || undefined,
        },
        hips:  { right: postural.hipRight || undefined,  left: postural.hipLeft || undefined },
        knees: { right: postural.kneeRight || undefined, left: postural.kneeLeft || undefined },
        feet:  { right: postural.footRight || undefined, left: postural.footLeft || undefined },
        spasticityNotes: postural.spasticityNotes || undefined,
        generalNotes:    postural.generalNotes || undefined,
        diagnosis:       postural.diagnosis || undefined,
        seatedPosition:  postural.seatedPosition || undefined,
        trunkControl:    postural.trunkControl || undefined,
      },
    });
    if (["GOALS", "MEDICAL_HISTORY"].includes(c.status)) {
      await updateStatus.mutateAsync({ id, status: "POSTURAL_ASSESSMENT" });
    }
  };

  const handleSavePlan = async () => {
    // Save treatment plan header fields via case update
    await updateCase.mutateAsync({
      id,
      dto: {
        treatmentFrom:     planHeader.treatmentFrom || undefined,
        treatmentTo:       planHeader.treatmentTo || undefined,
        anticipatedVisits: planHeader.anticipatedVisits ? Number(planHeader.anticipatedVisits) : undefined,
        physiotherapistId: planHeader.physiotherapistId || undefined,
        caseManagerId:     planHeader.caseManagerId || undefined,
      },
    });
    await submitPlan.mutateAsync({
      id,
      dto: {
        modalities:  planModalities,
        remarks:     planRemarks || undefined,
        observation: planObservation || undefined,
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
    if (!c.physiotherapistId) { toast.error("لم يتم تعيين معالج فيزيائي للحالة"); return; }
    await addSession.mutateAsync({
      id,
      dto: {
        sessionDate:       sessionForm.date,
        physiotherapistId: c.physiotherapistId,
        time:              sessionForm.time || undefined,
        modalitiesApplied: sessionForm.modalities,
        notes:             sessionForm.notes || undefined,
        painLevel:         sessionForm.painLevel ? parseInt(sessionForm.painLevel) : undefined,
      },
    });
    setSessionForm({ date: new Date().toISOString().slice(0, 10), time: "", notes: "", painLevel: "", modalities: [] });
  };

  const toggleArr = <T extends string>(arr: T[], val: T, set: (a: T[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const statusOrder: PhysioStatus[] = [
    "INTAKE", "COMPLAINT", "PAIN_MAP", "MEDICAL_HISTORY", "GOALS",
    "POSTURAL_ASSESSMENT", "TREATMENT_PLAN", "SUPERVISOR_REVIEW",
    "DOCTOR_SIGN", "ACTIVE_TREATMENT",
  ];
  const defaultTab = (() => {
    if (["COMPLETED", "DISCHARGED", "CANCELLED"].includes(c.status)) return "timeline";
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
                <Select value={history.lifeType} onValueChange={(v) => setHistory((h) => ({ ...h, lifeType: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEDENTARY">الحياة الخاملة / Sedentary Life</SelectItem>
                    <SelectItem value="NORMAL">الحياة الطبيعية / Normal Life</SelectItem>
                    <SelectItem value="ABNORMAL">غير اعتيادي / غير صحي / Abnormal</SelectItem>
                    <SelectItem value="PROFESSIONAL">رياضي / Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* هل تدخن */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل تدخن؟ / Do you smoke؟</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.smokes} onCheckedChange={(v) => setHistory((h) => ({ ...h, smokes: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.smokes && (
                  <div className="mr-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">هل سبق أن دخنت؟ / Have you ever smoked?</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">لا</span>
                        <Switch checked={history.hasSmokedBefore} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasSmokedBefore: v }))} disabled={!canEdit} />
                        <span className="text-xs text-muted-foreground">نعم</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">عدد المرات / How often?</Label>
                      <Input value={history.smokingFrequency} onChange={(e) => setHistory((h) => ({ ...h, smokingFrequency: e.target.value }))} placeholder="مثال: 10 سجائر يومياً" disabled={!canEdit} />
                    </div>
                  </div>
                )}
              </div>

              {/* جهاز تنظيم ضربات القلب */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل لديك جهاز تنظيم ضربات القلب؟ / Do you have a pacemaker?</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.hasPacemaker} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasPacemaker: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hasPacemaker && (
                  <Input className="mr-4" value={history.pacemakerDetail} onChange={(e) => setHistory((h) => ({ ...h, pacemakerDetail: e.target.value }))} placeholder="حدد نوع الجهاز..." disabled={!canEdit} />
                )}
              </div>

              {/* الحساسية */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>الحساسية / Allergies</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">حساسية لاصق</span>
                    <Switch checked={history.adhesiveAllergy} onCheckedChange={(v) => setHistory((h) => ({ ...h, adhesiveAllergy: v }))} disabled={!canEdit} />
                  </div>
                </div>
                <Input value={history.allergies} onChange={(e) => setHistory((h) => ({ ...h, allergies: e.target.value }))} placeholder="اذكر نوع الحساسية..." disabled={!canEdit} />
              </div>

              {/* ما هي الأدوية الحالية */}
              <div className="space-y-1.5">
                <Label>ما هي الأدوية التي تستخدمها حالياً؟ / What medications are you currently using?</Label>
                <Input value={history.currentMedications} onChange={(e) => setHistory((h) => ({ ...h, currentMedications: e.target.value }))} placeholder="اذكر الأدوية..." disabled={!canEdit} />
              </div>

              {/* هل أنت حامل */}
              <div className="flex items-center justify-between">
                <Label>هل أنت حامل؟ / Are you pregnant?</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">لا</span>
                  <Switch checked={history.isPregnant} onCheckedChange={(v) => setHistory((h) => ({ ...h, isPregnant: v }))} disabled={!canEdit} />
                  <span className="text-xs text-muted-foreground">نعم</span>
                </div>
              </div>

              {/* التشخيصات السابقة / الأدوية السابقة */}
              <div className="space-y-1.5">
                <Label>التشخيصات السابقة / الأدوية السابقة / Previous diagnoses / medications</Label>
                <Textarea rows={2} value={history.previousDiagnoses} onChange={(e) => setHistory((h) => ({ ...h, previousDiagnoses: e.target.value }))} disabled={!canEdit} />
              </div>

              {/* الشكاوى والعمليات السابقة */}
              <div className="space-y-1.5">
                <Label>الشكاوى والعمليات السابقة / Previous complaints & surgeries</Label>
                <Textarea rows={2} value={history.previousComplaintsSurgeries} onChange={(e) => setHistory((h) => ({ ...h, previousComplaintsSurgeries: e.target.value }))} disabled={!canEdit} />
              </div>

              {/* مشاكل صحية أخرى */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل تعاني من مشاكل صحية أخرى؟ / Do you have other health problems?</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.hasOtherHealthProblems} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasOtherHealthProblems: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hasOtherHealthProblems && (
                  <Input className="mr-4" value={history.otherConditions} onChange={(e) => setHistory((h) => ({ ...h, otherConditions: e.target.value }))} placeholder="حدد المشاكل الصحية..." disabled={!canEdit} />
                )}
              </div>

              {/* تعليمات طبيب */}
              <div className="space-y-1.5">
                <Label>هل هناك أي شيء نصحك طبيبك بعدم القيام به؟ / Is there anything your doctor told you not to do?</Label>
                <Input value={history.doctorRestrictions} onChange={(e) => setHistory((h) => ({ ...h, doctorRestrictions: e.target.value }))} placeholder="اذكر التعليمات..." disabled={!canEdit} />
              </div>

              {/* أدوية بوصفة */}
              <div className="flex items-center justify-between">
                <Label>هل تتناول حالياً أي أدوية بوصفة طبية أو بدون وصفة؟ / Are you currently taking any prescription / over-counter drugs?</Label>
                <div className="flex items-center gap-2 shrink-0 mr-2">
                  <span className="text-xs text-muted-foreground">لا</span>
                  <Switch checked={history.prescriptionDrugs} onCheckedChange={(v) => setHistory((h) => ({ ...h, prescriptionDrugs: v }))} disabled={!canEdit} />
                  <span className="text-xs text-muted-foreground">نعم</span>
                </div>
              </div>

              {/* مستحضرات عشبية */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل تتناول حالياً أي مستحضرات عشبية أو فيتامينات؟ / Are you currently taking any herbal preparations / vitamins?</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.herbalSupplements} onCheckedChange={(v) => setHistory((h) => ({ ...h, herbalSupplements: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.herbalSupplements && (
                  <Input className="mr-4" value={history.supplementsList} onChange={(e) => setHistory((h) => ({ ...h, supplementsList: e.target.value }))} placeholder="حدد المستحضرات والفيتامينات..." disabled={!canEdit} />
                )}
              </div>

            </div>
          </Section>

          <Section title="العلاج الطبيعي والعلاجات الأخرى / PT & Other Treatments">
            <div className="space-y-4">

              {/* علاج طبيعي لنفس المشكلة */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل خضعت للعلاج الطبيعي لنفس المشكلة؟ / Have you had physical therapy for the same problem?</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.hadPTSameProblem} onCheckedChange={(v) => setHistory((h) => ({ ...h, hadPTSameProblem: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hadPTSameProblem && (
                  <Input className="mr-4" value={history.ptSameProblemDetail} onChange={(e) => setHistory((h) => ({ ...h, ptSameProblemDetail: e.target.value }))} placeholder="اذكر التفاصيل..." disabled={!canEdit} />
                )}
              </div>

              {/* علاجات أخرى حالياً */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل تتلقى علاجات أخرى لهذه المشكلة في هذا الوقت؟ / Are you receiving other treatments for this problem at this time?</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.receivingOtherTreatment} onCheckedChange={(v) => setHistory((h) => ({ ...h, receivingOtherTreatment: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.receivingOtherTreatment && (
                  <Input className="mr-4" value={history.otherTreatmentDetail} onChange={(e) => setHistory((h) => ({ ...h, otherTreatmentDetail: e.target.value }))} placeholder="اذكر العلاجات الأخرى..." disabled={!canEdit} />
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
                <Label className="block">ما هو نوع التصوير الشعاعي الذي قمت به لتشخيص حالتك؟ / What type of radiography did you undergo?</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TEST_LABELS) as TestType[]).map((t) => (
                    <ToggleChip key={t} label={TEST_LABELS[t]} active={testsHad.includes(t)} onClick={() => toggleArr(testsHad, t, setTestsHad)} />
                  ))}
                </div>
                {testsHad.includes("OTHER") && (
                  <Input value={history.testsOther} onChange={(e) => setHistory((h) => ({ ...h, testsOther: e.target.value }))} placeholder="حدد نوع الفحص الآخر..." disabled={!canEdit} />
                )}
              </div>

              {/* نتائج */}
              <div className="space-y-1.5">
                <Label>نتائج / Results</Label>
                <Textarea rows={2} value={history.testResults} onChange={(e) => setHistory((h) => ({ ...h, testResults: e.target.value }))} disabled={!canEdit} />
              </div>

              {/* ماهي التحاليلات */}
              <Label className="block font-medium">ماهي التحاليلات التي تم اجراؤها لمشكلتك الحالية؟ / What analysis have been done for your current problem?</Label>

              {/* تحليل جديد */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">تحليل جديد / New analysis</Label>
                  <Input value={history.newAnalysis} onChange={(e) => setHistory((h) => ({ ...h, newAnalysis: e.target.value }))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">تاريخ التحليل الجديد / New analysis date</Label>
                  <Input type="date" value={history.newAnalysisDate} onChange={(e) => setHistory((h) => ({ ...h, newAnalysisDate: e.target.value }))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">تحليل قديم / Old analysis</Label>
                  <Input value={history.oldAnalysis} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysis: e.target.value }))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">تاريخ التحليل القديم / Old analysis date</Label>
                  <Input type="date" value={history.oldAnalysisDate} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysisDate: e.target.value }))} disabled={!canEdit} />
                </div>
              </div>

              {/* مرفقات التحاليل */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">رابط مرفق التحليل الجديد</Label>
                  <Input value={history.newAnalysisAttachment} onChange={(e) => setHistory((h) => ({ ...h, newAnalysisAttachment: e.target.value }))} placeholder="URL أو معرّف الملف..." disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">رابط مرفق التحليل القديم</Label>
                  <Input value={history.oldAnalysisAttachment} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysisAttachment: e.target.value }))} placeholder="URL أو معرّف الملف..." disabled={!canEdit} />
                </div>
              </div>

              {/* قياس كثافة العظام */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>قياس كثافة العظام / Bone density scan / test</Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.boneDensityTest} onCheckedChange={(v) => setHistory((h) => ({ ...h, boneDensityTest: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.boneDensityTest && (
                  <Input className="mr-4" value={history.boneDensityDetail} onChange={(e) => setHistory((h) => ({ ...h, boneDensityDetail: e.target.value }))} placeholder="حدد التفاصيل..." disabled={!canEdit} />
                )}
              </div>

              {/* هل سبق دخول المستشفى */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>هل سبق لك أن دخلت المستشفى خلال العام الماضي بسبب هذه الحالة؟ / Have you been hospitalized in the past year for this condition?</Label>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">لا</span>
                    <Switch checked={history.hospitalizedLastYear} onCheckedChange={(v) => setHistory((h) => ({ ...h, hospitalizedLastYear: v }))} disabled={!canEdit} />
                    <span className="text-xs text-muted-foreground">نعم</span>
                  </div>
                </div>
                {history.hospitalizedLastYear && (
                  <Input className="mr-4" value={history.hospitalizedDetail} onChange={(e) => setHistory((h) => ({ ...h, hospitalizedDetail: e.target.value }))} placeholder="اذكر التفاصيل..." disabled={!canEdit} />
                )}
              </div>

            </div>
          </Section>
          <Section title="العمليات الجراحية (حتى 5)">
            <div className="space-y-3">
              {surgeries.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">اسم العملية {i + 1}</Label>
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
                    <Label className="text-xs">النوع</Label>
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
                    <Label className="text-xs">التاريخ</Label>
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
          <Section title="أهداف العلاج">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">الأهداف الرئيسية</Label>
                <div className="flex flex-wrap gap-2">
                  {PHYSIO_GOALS.map((g) => (
                    <ToggleChip
                      key={g}
                      label={PHYSIO_GOAL_LABELS[g]}
                      active={goals.includes(g)}
                      onClick={() => toggleArr(goals, g, setGoals)}
                    />
                  ))}
                </div>
              </div>
              {goals.includes("OTHER") && (
                <div className="space-y-1.5">
                  <Label>هدف مخصص</Label>
                  <Input
                    value={goalsExtra.customGoal}
                    onChange={(e) =>
                      setGoalsExtra((f) => ({
                        ...f,
                        customGoal: e.target.value,
                      }))
                    }
                    placeholder="اذكر الهدف..."
                  />
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["decreasePain", "تخفيف الألم"],
                    ["improveStrength", "تحسين القوة"],
                    ["lessDifficultyWork", "تسهيل العمل"],
                    ["improveMovement", "تحسين الحركة"],
                  ] as [string, string][]
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={(goalsExtra as any)[key]}
                      onCheckedChange={(v) =>
                        setGoalsExtra((f) => ({ ...f, [key]: v }))
                      }
                    />
                    <Label className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["standLongerMinutes", "وقوف (دقائق)"],
                    ["sleepLongerMinutes", "نوم (دقائق)"],
                    ["sitLongerMinutes", "جلوس (دقائق)"],
                  ] as [string, string][]
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={(goalsExtra as any)[key]}
                      onChange={(e) =>
                        setGoalsExtra((f) => ({ ...f, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>أهداف أخرى</Label>
                <Textarea
                  rows={2}
                  value={goalsExtra.otherGoals}
                  onChange={(e) =>
                    setGoalsExtra((f) => ({ ...f, otherGoals: e.target.value }))
                  }
                />
              </div>
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
          {/* Head */}
          <Section title="1. الرأس">
            <RLToggle
              label="الوضعية"
              value={postural.headPosition}
              onChange={(v) => setPostural((p) => ({ ...p, headPosition: v }))}
              options={[
                { value: "NORMAL", label: "طبيعي" },
                { value: "FORWARD", label: "للأمام" },
                { value: "BACKWARD", label: "للخلف" },
                { value: "TILTED_LEFT", label: "مائل يسار" },
                { value: "TILTED_RIGHT", label: "مائل يمين" },
              ]}
            />
          </Section>
          {/* Shoulders */}
          <Section title="2. الأكتاف">
            <div className="grid grid-cols-2 gap-4">
              <RLToggle
                label="الكتف الأيمن"
                value={postural.shoulderRight}
                onChange={(v) =>
                  setPostural((p) => ({ ...p, shoulderRight: v }))
                }
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "ELEVATED", label: "مرفوع" },
                  { value: "DEPRESSED", label: "منخفض" },
                  { value: "PROTRACTED", label: "للأمام" },
                  { value: "RETRACTED", label: "للخلف" },
                ]}
              />
              <RLToggle
                label="الكتف الأيسر"
                value={postural.shoulderLeft}
                onChange={(v) =>
                  setPostural((p) => ({ ...p, shoulderLeft: v }))
                }
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "ELEVATED", label: "مرفوع" },
                  { value: "DEPRESSED", label: "منخفض" },
                  { value: "PROTRACTED", label: "للأمام" },
                  { value: "RETRACTED", label: "للخلف" },
                ]}
              />
            </div>
          </Section>
          {/* Elbows */}
          <Section title="3. المرفق">
            <div className="grid grid-cols-2 gap-4">
              <RLToggle
                label="مرفق أيمن"
                value={postural.elbowRight}
                onChange={(v) => setPostural((p) => ({ ...p, elbowRight: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "FLEXED", label: "مثني" },
                  { value: "EXTENDED", label: "ممدود" },
                  { value: "VALGUS", label: "Valgus" },
                  { value: "VARUS", label: "Varus" },
                ]}
              />
              <RLToggle
                label="مرفق أيسر"
                value={postural.elbowLeft}
                onChange={(v) => setPostural((p) => ({ ...p, elbowLeft: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "FLEXED", label: "مثني" },
                  { value: "EXTENDED", label: "ممدود" },
                  { value: "VALGUS", label: "Valgus" },
                  { value: "VARUS", label: "Varus" },
                ]}
              />
            </div>
          </Section>
          {/* Thorax */}
          <Section title="4. القفص الصدري">
            <RLToggle
              label="الوضعية"
              value={postural.thoraxPosition}
              onChange={(v) =>
                setPostural((p) => ({ ...p, thoraxPosition: v }))
              }
              options={[
                { value: "NORMAL", label: "طبيعي" },
                { value: "KYPHOTIC", label: "حدابي" },
                { value: "FLAT", label: "مسطح" },
                { value: "PIGEON", label: "صدر حمامة" },
              ]}
            />
          </Section>
          {/* Spine */}
          <Section title="5. العمود الفقري">
            <div className="space-y-3">
              <RLToggle
                label="القطني"
                value={postural.spineLumbar}
                onChange={(v) => setPostural((p) => ({ ...p, spineLumbar: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "LORDOSIS", label: "تقعر" },
                  { value: "KYPHOSIS", label: "تحدب" },
                  { value: "FLAT", label: "مسطح" },
                ]}
              />
              <div className="flex items-center gap-3">
                <Switch
                  checked={postural.spineScoliosis}
                  onCheckedChange={(v) =>
                    setPostural((p) => ({ ...p, spineScoliosis: v }))
                  }
                />
                <Label>جنف (Scoliosis)</Label>
              </div>
              {postural.spineScoliosis && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">الذروة</Label>
                    <Input
                      value={postural.scoliosisApex}
                      onChange={(e) =>
                        setPostural((p) => ({
                          ...p,
                          scoliosisApex: e.target.value,
                        }))
                      }
                      placeholder="L1, T6..."
                    />
                  </div>
                  <RLToggle
                    label="الاتجاه"
                    value={postural.scoliosisDirection}
                    onChange={(v) =>
                      setPostural((p) => ({ ...p, scoliosisDirection: v }))
                    }
                    options={[
                      { value: "LEFT", label: "يسار" },
                      { value: "RIGHT", label: "يمين" },
                    ]}
                  />
                </div>
              )}
            </div>
          </Section>
          {/* Pelvis */}
          <Section title="6. الحوض">
            <div className="grid grid-cols-2 gap-4">
              <RLToggle
                label="الإمالة الأمامية/الخلفية"
                value={postural.pelvisTilt}
                onChange={(v) => setPostural((p) => ({ ...p, pelvisTilt: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "ANTERIOR", label: "للأمام" },
                  { value: "POSTERIOR", label: "للخلف" },
                ]}
              />
              <RLToggle
                label="الإمالة الجانبية"
                value={postural.pelvisLateral}
                onChange={(v) =>
                  setPostural((p) => ({ ...p, pelvisLateral: v }))
                }
                options={[
                  { value: "NONE", label: "لا" },
                  { value: "LEFT", label: "يسار" },
                  { value: "RIGHT", label: "يمين" },
                ]}
              />
            </div>
          </Section>
          {/* Hips */}
          <Section title="7. الورك">
            <div className="grid grid-cols-2 gap-4">
              <RLToggle
                label="ورك أيمن"
                value={postural.hipRight}
                onChange={(v) => setPostural((p) => ({ ...p, hipRight: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "FLEXED", label: "مثني" },
                  { value: "EXTENDED", label: "ممدود" },
                  { value: "ABDUCTED", label: "بعيد" },
                  { value: "ADDUCTED", label: "قريب" },
                ]}
              />
              <RLToggle
                label="ورك أيسر"
                value={postural.hipLeft}
                onChange={(v) => setPostural((p) => ({ ...p, hipLeft: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "FLEXED", label: "مثني" },
                  { value: "EXTENDED", label: "ممدود" },
                  { value: "ABDUCTED", label: "بعيد" },
                  { value: "ADDUCTED", label: "قريب" },
                ]}
              />
            </div>
          </Section>
          {/* Knees */}
          <Section title="8. الركبتان">
            <div className="grid grid-cols-2 gap-4">
              <RLToggle
                label="ركبة يمنى"
                value={postural.kneeRight}
                onChange={(v) => setPostural((p) => ({ ...p, kneeRight: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "VALGUS", label: "Valgus" },
                  { value: "VARUS", label: "Varus" },
                  { value: "HYPEREXTENDED", label: "مفرط التمديد" },
                  { value: "FLEXED", label: "مثنية" },
                ]}
              />
              <RLToggle
                label="ركبة يسرى"
                value={postural.kneeLeft}
                onChange={(v) => setPostural((p) => ({ ...p, kneeLeft: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "VALGUS", label: "Valgus" },
                  { value: "VARUS", label: "Varus" },
                  { value: "HYPEREXTENDED", label: "مفرط التمديد" },
                  { value: "FLEXED", label: "مثنية" },
                ]}
              />
            </div>
          </Section>
          {/* Feet */}
          <Section title="9. القدم">
            <div className="grid grid-cols-2 gap-4">
              <RLToggle
                label="قدم يمنى"
                value={postural.footRight}
                onChange={(v) => setPostural((p) => ({ ...p, footRight: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "PRONATED", label: "مُكَفَّأة" },
                  { value: "SUPINATED", label: "مُصَعَّدة" },
                  { value: "FLAT", label: "مسطحة" },
                  { value: "HIGH_ARCH", label: "قوس عالي" },
                ]}
              />
              <RLToggle
                label="قدم يسرى"
                value={postural.footLeft}
                onChange={(v) => setPostural((p) => ({ ...p, footLeft: v }))}
                options={[
                  { value: "NORMAL", label: "طبيعي" },
                  { value: "PRONATED", label: "مُكَفَّأة" },
                  { value: "SUPINATED", label: "مُصَعَّدة" },
                  { value: "FLAT", label: "مسطحة" },
                  { value: "HIGH_ARCH", label: "قوس عالي" },
                ]}
              />
            </div>
          </Section>
          {/* Notes */}
          <Section title="الملاحظات والتشخيص">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>التشخيص</Label>
                <Input
                  value={postural.diagnosis}
                  onChange={(e) =>
                    setPostural((p) => ({ ...p, diagnosis: e.target.value }))
                  }
                  placeholder="التشخيص الفيزيائي..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات التشنج</Label>
                <Textarea
                  rows={2}
                  value={postural.spasticityNotes}
                  onChange={(e) =>
                    setPostural((p) => ({
                      ...p,
                      spasticityNotes: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات عامة</Label>
                <Textarea
                  rows={2}
                  value={postural.generalNotes}
                  onChange={(e) =>
                    setPostural((p) => ({ ...p, generalNotes: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الوضعية الجلوسية</Label>
                  <Input
                    value={postural.seatedPosition}
                    onChange={(e) =>
                      setPostural((p) => ({
                        ...p,
                        seatedPosition: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>التحكم بالجذع</Label>
                  <Input
                    value={postural.trunkControl}
                    onChange={(e) =>
                      setPostural((p) => ({
                        ...p,
                        trunkControl: e.target.value,
                      }))
                    }
                  />
                </div>
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
          <Section title="رأس خطة العلاج">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={planHeader.treatmentFrom}
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      treatmentFrom: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={planHeader.treatmentTo}
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      treatmentTo: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>عدد الزيارات المتوقع</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label>معرّف المعالج</Label>
                <Input
                  value={planHeader.physiotherapistId}
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      physiotherapistId: e.target.value,
                    }))
                  }
                  placeholder="ID المعالج..."
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>معرّف مدير الحالة</Label>
                <Input
                  value={planHeader.caseManagerId}
                  onChange={(e) =>
                    setPlanHeader((h) => ({
                      ...h,
                      caseManagerId: e.target.value,
                    }))
                  }
                  placeholder="ID مدير الحالة..."
                />
              </div>
            </div>
          </Section>
          <Section title="الوسائل العلاجية (19 وسيلة)">
            <div className="flex flex-wrap gap-2">
              {THERAPY_MODALITIES.map((m) => (
                <ToggleChip
                  key={m}
                  label={THERAPY_MODALITY_LABELS[m]}
                  active={planModalities.includes(m)}
                  onClick={() =>
                    toggleArr(planModalities, m, setPlanModalities)
                  }
                />
              ))}
            </div>
          </Section>
          <Section title="الملاحظة (Observation) والتعليقات">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الملاحظة / Observation</Label>
                <Textarea
                  rows={3}
                  value={planObservation}
                  onChange={(e) => setPlanObservation(e.target.value)}
                  placeholder="ملاحظات الحالة..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>تعليقات الخطة</Label>
                <Textarea
                  rows={2}
                  value={planRemarks}
                  onChange={(e) => setPlanRemarks(e.target.value)}
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
                disabled={
                  planModalities.length === 0 ||
                  submitPlan.isPending ||
                  updateCase.isPending ||
                  updateStatus.isPending
                }
                className="w-full gap-2"
              >
                {submitPlan.isPending || updateCase.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ خطة العلاج
              </Button>
            )}
        </TabsContent>

        {/* ── SUPERVISOR REVIEW ───────────────────────────────────────────── */}
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
