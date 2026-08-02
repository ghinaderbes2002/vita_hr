"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, ArrowRight, Download, Loader2, Pencil, Plus, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  usePodiatryReception, usePodiatrySessions, useArchivePodiatrySession,
  useSubmitPodiatryComplaint, useSubmitPodiatryMedicalHistory,
} from "@/lib/hooks/use-clinic-podiatry";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { PatientPhoto } from "@/components/clinic/patient-photo";
import { PodiatrySession, PodiatryPainType, PodiatryPainLevel, PodiatryPainTrend } from "@/lib/api/clinic-podiatry";
import {
  AFFECTED_SIDE_LABEL, AFFECTED_SIDE_VALUES, CLINICAL_PLAN_LABEL,
  CLINICAL_PLAN_VALUES, FOOT_FLAGS, FOOT_SYMPTOM_LABEL, FOOT_SYMPTOM_VALUES,
  MEDICAL_HISTORY_LABEL, MEDICAL_HISTORY_VALUES, VISIT_TYPE_LABEL, VISIT_TYPE_VALUES,
} from "@/components/clinic/podiatry-labels";
import { MedicalHistoryForm } from "@/components/clinic/medical-history-form";
import { PodiatryReceptionDialog } from "@/components/clinic/podiatry-reception-dialog";
import { PodiatrySessionDialog } from "@/components/clinic/podiatry-session-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const PAIN_TYPE_VALUES: PodiatryPainType[] = ["INTERMITTENT", "CONSTANT", "WITH_CERTAIN_MOTIONS"];
const PAIN_LEVEL_VALUES: PodiatryPainLevel[] = ["MILD", "MODERATE", "SEVERE", "EXCRUCIATING"];
const PAIN_TREND_VALUES: PodiatryPainTrend[] = ["BETTER", "WORSE", "SAME"];

// ── Podiatry medical-history adapters ──────────────────────────────────────
// The shared <MedicalHistoryForm> speaks the physiotherapy field vocabulary.
// These translate to/from the podiatry backend contract so the UI stays
// untouched while the payload matches the backend field names/enums exactly.
const MH_COND_TO_BACKEND: Record<string, string> = { STDS: "STD", HYPERTENSION: "HIGH_LOW_BP" };
const MH_COND_FROM_BACKEND: Record<string, string> = { STD: "STDS", HIGH_LOW_BP: "HYPERTENSION" };
const MH_RADIO_TO_BACKEND: Record<string, string> = { XRAY: "X_RAY" };
const MH_RADIO_FROM_BACKEND: Record<string, string> = { X_RAY: "XRAY" };

const nz = (v: unknown) => (v === "" || v == null ? undefined : v);

function mhFormToBackend(d: Record<string, any>): Record<string, any> {
  const radio = Array.isArray(d.tests)
    ? d.tests.filter((x: string) => x !== "BONE_DENSITY").map((x: string) => MH_RADIO_TO_BACKEND[x] ?? x)
    : undefined;
  const conds = Array.isArray(d.chronicConditions)
    ? d.chronicConditions.map((x: string) => MH_COND_TO_BACKEND[x] ?? x)
    : undefined;
  const surgeries = Array.isArray(d.surgeries)
    ? d.surgeries
        .filter((s: any) => s.name || s.type || s.date)
        .map((s: any) => ({ surgeryName: nz(s.name), type: nz(s.type), date: nz(s.date) }))
    : undefined;
  return {
    currentMedications: nz(d.currentMedications),
    previousDiagnoses: nz(d.previousDiagnoses),
    herbalPreparations: d.herbalSupplements,
    herbalPreparationsDetails: nz(d.supplementsList),
    otherHealthProblems: nz(d.otherConditions),
    doctorRestrictions: nz(d.doctorRestrictions),
    smoker: d.smokes,
    everSmoked: d.hasSmokedBefore,
    smokingFrequency: nz(d.smokingFrequency),
    hasPacemaker: d.hasPacemaker,
    isPregnant: d.isPregnant,
    allergyToAdhesives: d.adhesiveAllergy,
    surgeries: surgeries && surgeries.length ? surgeries : undefined,
    hadPhysicalTherapy: d.hadPTSameProblem,
    hasOtherTreatments: d.receivingOtherTreatment,
    radiographyTypes: radio && radio.length ? radio : undefined,
    radiographyOther: nz(d.testsOther),
    radiographyResults: nz(d.testResults),
    hasNewAnalysis: !!(nz(d.newAnalysis) || nz(d.newAnalysisDate)) || undefined,
    newAnalysisDate: nz(d.newAnalysisDate),
    newAnalysisNotes: nz(d.newAnalysis),
    hasOldAnalysis: !!(nz(d.oldAnalysis) || nz(d.oldAnalysisDate)) || undefined,
    oldAnalysisDate: nz(d.oldAnalysisDate),
    oldAnalysisNotes: nz(d.oldAnalysis),
    boneDensityScan: d.boneDensityTest,
    hospitalizedPastYear: d.hospitalizedLastYear,
    imagingProcedures: Array.isArray(d.imagingProcedures) && d.imagingProcedures.length ? d.imagingProcedures : undefined,
    diagnosis: nz(d.diagnosis),
    medicalHistory: conds && conds.length ? conds : undefined,
    medicalHistoryOther: nz(d.chronicConditionsOther),
  };
}

function mhBackendToForm(r: Record<string, any>): Record<string, any> {
  const tests = Array.isArray(r.radiographyTypes) ? r.radiographyTypes.map((x: string) => MH_RADIO_FROM_BACKEND[x] ?? x) : [];
  const chronic = Array.isArray(r.medicalHistory) ? r.medicalHistory.map((x: string) => MH_COND_FROM_BACKEND[x] ?? x) : [];
  const surgeries = Array.isArray(r.surgeries)
    ? r.surgeries.map((s: any) => ({ name: s.surgeryName ?? "", type: s.type ?? "", date: s.date ?? "" }))
    : [];
  return {
    currentMedications: r.currentMedications ?? "",
    prescriptionDrugs: !!r.currentMedications,
    previousDiagnoses: r.previousDiagnoses ?? "",
    herbalSupplements: !!r.herbalPreparations,
    supplementsList: r.herbalPreparationsDetails ?? "",
    hasOtherHealthProblems: !!r.otherHealthProblems,
    otherConditions: r.otherHealthProblems ?? "",
    hasDoctorRestrictions: !!r.doctorRestrictions,
    doctorRestrictions: r.doctorRestrictions ?? "",
    smokes: !!r.smoker,
    hasSmokedBefore: !!r.everSmoked,
    smokingFrequency: r.smokingFrequency ?? "",
    hasPacemaker: !!r.hasPacemaker,
    isPregnant: !!r.isPregnant,
    adhesiveAllergy: !!r.allergyToAdhesives,
    hadSurgeries: surgeries.length > 0,
    surgeries,
    hadPTSameProblem: !!r.hadPhysicalTherapy,
    receivingOtherTreatment: !!r.hasOtherTreatments,
    tests,
    testsOther: r.radiographyOther ?? "",
    testResults: r.radiographyResults ?? "",
    newAnalysis: r.newAnalysisNotes ?? "",
    newAnalysisDate: r.newAnalysisDate ?? "",
    oldAnalysis: r.oldAnalysisNotes ?? "",
    oldAnalysisDate: r.oldAnalysisDate ?? "",
    boneDensityTest: !!r.boneDensityScan,
    hospitalizedLastYear: !!r.hospitalizedPastYear,
    imagingProcedures: Array.isArray(r.imagingProcedures) ? r.imagingProcedures : [],
    diagnosis: r.diagnosis ?? "",
    chronicConditions: chronic,
    chronicConditionsOther: r.medicalHistoryOther ?? "",
  };
}

// Age in completed years, derived from the stored date of birth.
function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{value || "—"}</p>
    </div>
  );
}

// The reception tab mirrors the edit dialog's layout, so the saved values read
// back in the same shape they were entered in — labelled field over its control.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      {children}
    </div>
  );
}

// Read-only stand-in for the dialog's Input/Textarea.
function TextBox({ value, minHeight = "" }: { value?: string | null; minHeight?: string }) {
  return (
    <div className={`rounded-md border bg-muted/40 px-3 py-2 text-sm ${minHeight} ${value ? "" : "text-muted-foreground"}`}>
      {value || "—"}
    </div>
  );
}

// Read-only ChipGroup: every option is shown, the selected ones highlighted.
function ReadOnlyChips<T extends string>({
  values, selected, label,
}: {
  values: T[];
  selected: T[];
  label: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <span
            key={v}
            className={`rounded-full border px-3 py-1 text-xs ${
              on ? "border-orange-500 bg-orange-500 text-white" : "border-border text-muted-foreground"
            }`}
          >
            {label(v)}
          </span>
        );
      })}
    </div>
  );
}

// A foot's findings, laid out like the session form's foot block: the four
// flags as (read-only) checkboxes, then the pressure notes and asymmetry.
function FootFindings({ side, s }: { side: "right" | "left"; s: PodiatrySession }) {
  const t = useTranslations("clinic.podiatry.detail");
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">{side === "right" ? t("rightFoot") : t("leftFoot")}</p>
      <div className="space-y-1.5">
        {FOOT_FLAGS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={!!s[`${side}${key}` as keyof PodiatrySession]}
              readOnly
              tabIndex={-1}
              className="w-4 h-4 checkbox-orange rounded-sm pointer-events-none"
            />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
      <Field label={t("pressureNotes")}>
        <TextBox value={side === "right" ? s.rightPressureNotes : s.leftPressureNotes} minHeight="min-h-14" />
      </Field>
      <Field label={t("asymmetry")}>
        <TextBox value={side === "right" ? s.rightAsymmetry : s.leftAsymmetry} />
      </Field>
    </div>
  );
}

export default function PodiatryReceptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.podiatry.detail");

  // The assessment (sessions) tab is a clinical activity: a supervisor who can
  // only receive patients sees the reception + patient info only.
  const { hasAnyPermission, isAdmin } = usePermissions();
  const showSessionsTab =
    isAdmin() ||
    hasAnyPermission([
      PERMISSIONS.CLINIC_PODIATRY.SESSION_CREATE,
      PERMISSIONS.CLINIC_PODIATRY.SESSION_EDIT,
      PERMISSIONS.CLINIC_PODIATRY.SESSION_ARCHIVE,
    ]);

  const { data: reception, isLoading } = usePodiatryReception(id);
  const [showArchived, setShowArchived] = useState(false);
  const { data: sessions = [] } = usePodiatrySessions(id, showArchived);
  const { data: patient } = useClinicPatient(reception?.patientId ?? "");
  const archiveSession = useArchivePodiatrySession();

  const [editOpen, setEditOpen] = useState(false);
  const [sessionDialog, setSessionDialog] = useState<{ open: boolean; session?: PodiatrySession }>({ open: false });
  const [archiveTarget, setArchiveTarget] = useState<PodiatrySession | null>(null);
  // Id of the session currently being rendered to PDF, so only its button spins.
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);

  // ── نموذج الطبيب: الشكوى + التاريخ الطبي (dedicated upsert endpoints) ──
  const submitComplaint = useSubmitPodiatryComplaint();
  const submitMH = useSubmitPodiatryMedicalHistory();
  const canEditReception = isAdmin() || hasAnyPermission([PERMISSIONS.CLINIC_PODIATRY.RECEPTION_EDIT]);

  const [complaintForm, setComplaintForm] = useState({
    mainComplaint: "", startDate: "", possibleCause: "",
    previousDoctor: "", previousTreatment: "",
    symptomsBetterTime: "", symptomsWorseTime: "",
    painType: "" as "" | PodiatryPainType, painLevel: "" as "" | PodiatryPainLevel,
    painTrend: "" as "" | PodiatryPainTrend, hadInjuryBefore: null as boolean | null,
  });
  const [formHydrated, setFormHydrated] = useState(false);

  useEffect(() => {
    if (!reception || formHydrated) return;
    setComplaintForm({
      mainComplaint: reception.mainComplaint ?? "",
      startDate: reception.startDate ?? "",
      possibleCause: reception.possibleCause ?? "",
      previousDoctor: reception.previousDoctor ?? "",
      previousTreatment: reception.previousTreatment ?? "",
      symptomsBetterTime: reception.symptomsBetterTime ?? "",
      symptomsWorseTime: reception.symptomsWorseTime ?? "",
      painType: (reception.painType as PodiatryPainType) ?? "",
      painLevel: (reception.painLevel as PodiatryPainLevel) ?? "",
      painTrend: (reception.painTrend as PodiatryPainTrend) ?? "",
      hadInjuryBefore: typeof reception.hadInjuryBefore === "boolean" ? reception.hadInjuryBefore : null,
    });
    setFormHydrated(true);
  }, [reception, formHydrated]);

  const handleSaveComplaint = () => submitComplaint.mutate({ id, dto: {
    mainComplaint: complaintForm.mainComplaint || undefined,
    startDate: complaintForm.startDate || undefined,
    possibleCause: complaintForm.possibleCause || undefined,
    previousDoctor: complaintForm.previousDoctor || undefined,
    previousTreatment: complaintForm.previousTreatment || undefined,
    symptomsBetterTime: complaintForm.symptomsBetterTime || undefined,
    symptomsWorseTime: complaintForm.symptomsWorseTime || undefined,
    painType: complaintForm.painType || undefined,
    painLevel: complaintForm.painLevel || undefined,
    painTrend: complaintForm.painTrend || undefined,
    hadInjuryBefore: complaintForm.hadInjuryBefore ?? undefined,
  } });


  // One sheet per session: reception data is shared, the analysis is the session's.
  const handleExportPdf = async (session: PodiatrySession) => {
    if (pdfSessionId) return;
    setPdfSessionId(session.id);
    try {
      const { downloadPodiatryFormPdf } = await import("@/components/clinic/podiatry-form-pdf");
      // Resolve imaging-procedure images (stored as document ids) to data URIs so
      // they embed in the PDF; on failure the row still prints its description.
      const pid = reception?.patientId;
      const rawImaging: any[] = Array.isArray((reception as any)?.imagingProcedures)
        ? (reception as any).imagingProcedures : [];
      const blobToDataUri = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      const imagingProcedures = await Promise.all(
        rawImaging.map(async (proc) => {
          if (!proc?.imageUrl || !pid) return { ...proc };
          try {
            const blob = await clinicPatientsApi.downloadDocument(pid, proc.imageUrl);
            return { ...proc, imageData: await blobToDataUri(blob) };
          } catch {
            return { ...proc };
          }
        }),
      );
      const physician = { ...(reception as any), imagingProcedures };
      await downloadPodiatryFormPdf({
        date: session.createdAt,
        patientName:
          `${patient?.firstName ?? reception?.patient?.firstName ?? ""} ${patient?.lastName ?? reception?.patient?.lastName ?? ""}`.trim(),
        dateOfBirth: patient?.dateOfBirth,
        gender: patient?.gender,
        phone: patient?.phone,
        heightCm: reception?.height ?? patient?.heightCm,
        weightKg: reception?.weight ?? patient?.weightKg,
        occupation: reception?.occupation,
        activities: reception?.activities,
        problemDescription: reception?.problemDescription,
        historyOfSymptoms: reception?.historyOfSymptoms,
        affectedSide: reception?.affectedSide,
        footSymptoms: reception?.footSymptoms,
        visitTypes: reception?.visitTypes,
        medicalHistory: reception?.medicalHistory,
        medicalHistoryOther: reception?.medicalHistoryOther,
        vasScore: reception?.vasScore,
        session,
        // Full reception → renders the physician-form sheet (complaint + history),
        // with imaging images resolved to embeddable data URIs.
        physician,
      });
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setPdfSessionId(null);
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (!reception) {
    return <p className="text-center py-12 text-muted-foreground">{t("notFound")}</p>;
  }

  const patientName =
    `${patient?.firstName ?? reception.patient?.firstName ?? ""} ${patient?.lastName ?? reception.patient?.lastName ?? ""}`.trim()
    || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/${locale}/clinic/podiatry`)}
          >
            <ArrowRight className="h-3.5 w-3.5 ltr:rotate-180" />
            {t("back")}
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{patientName}</h1>
            {(patient?.patientNumber ?? reception.patient?.patientNumber) && (
              <Badge variant="outline" className="font-mono text-xs">
                {patient?.patientNumber ?? reception.patient?.patientNumber}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{fmt(reception.createdAt)}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="reception" dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir={isRtl ? "rtl" : "ltr"}>
          <TabsTrigger value="reception" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabReception")}</TabsTrigger>
          <TabsTrigger value="patient_info" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabPatientInfo")}</TabsTrigger>
          <TabsTrigger value="physician_form" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabPhysicianForm")}</TabsTrigger>
          {/* The assessment form is a session activity — hidden from a supervisor
              who can only receive patients (no session permission). */}
          {showSessionsTab && (
            <TabsTrigger value="sessions" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabSessions")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reception" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t("receptionData")}</CardTitle>
                <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.RECEPTION_EDIT}>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("edit")}
                  </Button>
                </ActionGuard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Field label={t("activities")}><TextBox value={reception.activities} /></Field>
                <Field label={t("problemDescription")}><TextBox value={reception.problemDescription} minHeight="min-h-16" /></Field>
                <Field label={t("symptomHistory")}><TextBox value={reception.historyOfSymptoms} /></Field>

                <Field label={t("affectedFoot")}>
                  <ReadOnlyChips
                    values={AFFECTED_SIDE_VALUES}
                    selected={reception.affectedSide ?? []}
                    label={(v) => AFFECTED_SIDE_LABEL[v]}
                  />
                </Field>

                <Field label={t("footSymptoms")}>
                  <ReadOnlyChips
                    values={FOOT_SYMPTOM_VALUES}
                    selected={reception.footSymptoms ?? []}
                    label={(v) => FOOT_SYMPTOM_LABEL[v]}
                  />
                </Field>

                <Field label={t("visitType")}>
                  <ReadOnlyChips
                    values={VISIT_TYPE_VALUES}
                    selected={reception.visitTypes ?? []}
                    label={(v) => VISIT_TYPE_LABEL[v]}
                  />
                </Field>

                <Field label={t("medicalHistory")}>
                  <ReadOnlyChips
                    values={MEDICAL_HISTORY_VALUES}
                    selected={reception.medicalHistory ?? []}
                    label={(v) => MEDICAL_HISTORY_LABEL[v]}
                  />
                  {reception.medicalHistoryOther && (
                    <div className="mt-1.5"><TextBox value={reception.medicalHistoryOther} /></div>
                  )}
                </Field>

                <Field label={`${t("painIntensity")}${reception.vasScore != null ? ` — ${reception.vasScore}/10` : ""}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <div
                        key={n}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm ${
                          reception.vasScore === n
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patient_info" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("patientInfo")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-6 items-start">
                <div className="grid flex-1 grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
                <Row label={t("patientNumber")} value={patient?.patientNumber ?? reception.patient?.patientNumber} />
                <Row label={t("patientName")} value={patientName} />
                <Row
                  label={t("age")}
                  value={ageFromDob(patient?.dateOfBirth) != null ? `${ageFromDob(patient?.dateOfBirth)} ${t("years")}` : null}
                />
                <Row label={t("height")} value={patient?.heightCm ? `${patient.heightCm} cm` : null} />
                <Row label={t("weight")} value={patient?.weightKg ? `${patient.weightKg} kg` : null} />
                <Row label={t("bmi")} value={patient?.bmi ? patient.bmi.toFixed(1) : null} />
                </div>
                <PatientPhoto patientId={reception.patientId} className="h-32 w-32 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── نموذج الطبيب: تابين فرعيين (الشكوى + التاريخ الطبي) ── */}
        <TabsContent value="physician_form" className="mt-4">
          <Tabs defaultValue="complaint" dir={isRtl ? "rtl" : "ltr"}>
            <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir={isRtl ? "rtl" : "ltr"}>
              <TabsTrigger value="complaint" className="text-sm py-1.5">{t("tabComplaint")}</TabsTrigger>
              <TabsTrigger value="medical_history" className="text-sm py-1.5">{t("tabMedicalHistory")}</TabsTrigger>
            </TabsList>

            {/* ── الشكوى ── */}
            <TabsContent value="complaint" className="mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t("tabComplaint")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Field label={t("majorComplaint")}>
                      <Textarea rows={3} value={complaintForm.mainComplaint} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, mainComplaint: e.target.value }))} />
                    </Field>
                    <Field label={t("startDate")}>
                      <Input value={complaintForm.startDate} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, startDate: e.target.value }))} />
                    </Field>
                    <Field label={t("possibleCause")}>
                      <Input value={complaintForm.possibleCause} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, possibleCause: e.target.value }))} />
                    </Field>
                    <Field label={t("previousDoctorSeen")}>
                      <Input value={complaintForm.previousDoctor} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, previousDoctor: e.target.value }))} />
                    </Field>
                    <Field label={t("previousTreatment")}>
                      <Input value={complaintForm.previousTreatment} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, previousTreatment: e.target.value }))} />
                    </Field>
                    <Field label={t("lessBothersome")}>
                      <Input value={complaintForm.symptomsBetterTime} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, symptomsBetterTime: e.target.value }))} />
                    </Field>
                    <Field label={t("moreBothersome")}>
                      <Input value={complaintForm.symptomsWorseTime} disabled={!canEditReception}
                        onChange={(e) => setComplaintForm((f) => ({ ...f, symptomsWorseTime: e.target.value }))} />
                    </Field>
                    <Field label={t("painTypeLabel")}>
                      <div className="flex flex-wrap gap-4">
                        {PAIN_TYPE_VALUES.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 accent-primary rounded-sm" disabled={!canEditReception}
                              checked={complaintForm.painType === v}
                              onChange={() => setComplaintForm((f) => ({ ...f, painType: f.painType === v ? "" : v }))} />
                            <span className="text-sm">{t(`painType.${v}`)}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label={t("painLevelLabel")}>
                      <div className="flex flex-wrap gap-4">
                        {PAIN_LEVEL_VALUES.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 accent-primary rounded-sm" disabled={!canEditReception}
                              checked={complaintForm.painLevel === v}
                              onChange={() => setComplaintForm((f) => ({ ...f, painLevel: f.painLevel === v ? "" : v }))} />
                            <span className="text-sm">{t(`painLevel.${v}`)}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label={t("painProgression")}>
                      <div className="flex flex-wrap gap-4">
                        {PAIN_TREND_VALUES.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 accent-primary rounded-sm" disabled={!canEditReception}
                              checked={complaintForm.painTrend === v}
                              onChange={() => setComplaintForm((f) => ({ ...f, painTrend: f.painTrend === v ? "" : v }))} />
                            <span className="text-sm">{t(`painTrend.${v}`)}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label={t("hadInjuryBefore")}>
                      <div className="flex flex-wrap gap-4">
                        {([["yes", true], ["no", false]] as const).map(([labelKey, val]) => (
                          <label key={labelKey} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 accent-primary rounded-sm" disabled={!canEditReception}
                              checked={complaintForm.hadInjuryBefore === val}
                              onChange={() => setComplaintForm((f) => ({ ...f, hadInjuryBefore: f.hadInjuryBefore === val ? null : val }))} />
                            <span className="text-sm">{t(labelKey)}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    {canEditReception && (
                      <Button onClick={handleSaveComplaint} disabled={submitComplaint.isPending} className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                        {submitComplaint.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t("saveComplaint")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── التاريخ الطبي ── (نفس فورم العلاج الفيزيائي بالضبط) */}
            <TabsContent value="medical_history" className="mt-4">
              <MedicalHistoryForm
                initial={mhBackendToForm(reception as any)}
                patientId={reception.patientId}
                gender={patient?.gender}
                canEdit={canEditReception}
                saving={submitMH.isPending}
                onSave={(dto) => submitMH.mutate({ id, dto: mhFormToBackend(dto) })}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {t("sessions")}{sessions.length > 0 ? ` (${sessions.length})` : ""}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={showArchived ? "secondary" : "outline"}
                    className="gap-1.5"
                    onClick={() => setShowArchived((v) => !v)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {showArchived ? t("hideArchived") : t("showArchived")}
                  </Button>
                  <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.SESSION_CREATE}>
                    <Button size="sm" className="gap-1.5" onClick={() => setSessionDialog({ open: true })}>
                      <Plus className="h-3.5 w-3.5" />
                      {t("addSession")}
                    </Button>
                  </ActionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("noSessions")}</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, idx) => (
                    <div key={s.id} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-base font-bold px-3 py-1">#{idx + 1}</Badge>
                          <span className="text-xs text-muted-foreground">{fmt(s.createdAt)}</span>
                          {s.clinicianName && <span className="text-sm font-medium">{s.clinicianName}</span>}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={pdfSessionId === s.id}
                            onClick={() => handleExportPdf(s)}
                          >
                            {pdfSessionId === s.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Download className="h-3.5 w-3.5" />}
                            {pdfSessionId === s.id ? t("loading") : t("exportPdf")}
                          </Button>
                          {s.archivedAt ? (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
                              <Archive className="h-3 w-3" />
                              {t("archived")}{` — ${fmt(s.archivedAt)}`}
                            </Badge>
                          ) : (
                            <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.SESSION_ARCHIVE}>
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setArchiveTarget(s)}>
                                <Archive className="h-3.5 w-3.5" />
                                {t("archive")}
                              </Button>
                            </ActionGuard>
                          )}
                        </div>
                      </div>

                      <Field label={t("treatmentPlan")}>
                        <ReadOnlyChips
                          values={CLINICAL_PLAN_VALUES}
                          selected={s.clinicalPlan ?? []}
                          label={(v) => CLINICAL_PLAN_LABEL[v]}
                        />
                      </Field>

                      <div className="grid md:grid-cols-2 gap-3">
                        <FootFindings side="right" s={s} />
                        <FootFindings side="left" s={s} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label={t("clinicianName")}><TextBox value={s.clinicianName} /></Field>
                        <Field label={t("signature")}>
                          {s.clinicianSignature ? (
                            s.clinicianSignature.startsWith("data:") || s.clinicianSignature.startsWith("http") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.clinicianSignature} alt={t("signature")} className="h-16 w-full object-contain border rounded bg-white" />
                            ) : (
                              <TextBox value={s.clinicianSignature} />
                            )
                          ) : (
                            <TextBox value={null} />
                          )}
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PodiatryReceptionDialog open={editOpen} onOpenChange={setEditOpen} reception={reception} />

      <PodiatrySessionDialog
        open={sessionDialog.open}
        onOpenChange={(o) => setSessionDialog((s) => ({ ...s, open: o }))}
        receptionId={id}
        session={sessionDialog.session}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}
        title={t("archiveSessionTitle")}
        description={t("archiveSessionDesc")}
        onConfirm={() => {
          if (archiveTarget) archiveSession.mutate({ receptionId: id, sessionId: archiveTarget.id });
          setArchiveTarget(null);
        }}
      />

      {archiveSession.isPending && (
        <div className="fixed bottom-4 left-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      )}
    </div>
  );
}
