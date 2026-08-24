"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Download, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInstallPodiatrySession, usePodiatryDoctorDecision, usePodiatryReception,
  usePodiatryReviews, usePodiatrySessions,
} from "@/lib/hooks/use-clinic-podiatry";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { PatientPhoto } from "@/components/clinic/patient-photo";
import { PodiatrySession } from "@/lib/api/clinic-podiatry";
import {
  AFFECTED_SIDE_LABEL, AFFECTED_SIDE_VALUES, FOOT_SYMPTOM_LABEL, FOOT_SYMPTOM_VALUES,
  MEDICAL_HISTORY_LABEL, MEDICAL_HISTORY_VALUES, VISIT_TYPE_LABEL, VISIT_TYPE_VALUES,
} from "@/components/clinic/podiatry-labels";
import { PodiatryAssessmentPanel } from "@/components/clinic/podiatry-assessment-panel";
import {
  PodiatryDoctorDecisionCard, PodiatryReviewCard,
} from "@/components/clinic/podiatry-review-decision";
import { PodiatryReceptionDialog } from "@/components/clinic/podiatry-reception-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

/** Right foot first, matching the RTL sheet. */
const SIDES = [
  { key: "Right", label: "القدم اليمنى" },
  { key: "Left", label: "القدم اليسرى" },
] as const;

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
    ]);

  const { data: reception, isLoading } = usePodiatryReception(id);
  // The API returns at most one assessment per reception.
  const { data: sessions = [] } = usePodiatrySessions(id);
  const session: PodiatrySession | null = sessions[0] ?? null;
  const { data: patient } = useClinicPatient(reception?.patientId ?? "");
  // Both hang off the reception, and both print on the sheet.
  const { data: reviews = [] } = usePodiatryReviews(id);
  const { data: doctorDecision } = usePodiatryDoctorDecision(id);
  // The review and the decision are clinical writing, like the assessment.
  const canEditAssessment =
    isAdmin() ||
    hasAnyPermission([
      PERMISSIONS.CLINIC_PODIATRY.SESSION_CREATE,
      PERMISSIONS.CLINIC_PODIATRY.SESSION_EDIT,
    ]);

  const install = useInstallPodiatrySession();

  const [editOpen, setEditOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // The sheet pairs the reception data with the reception's assessment.
  const handleExportPdf = async () => {
    if (pdfBusy || !session) return;
    setPdfBusy(true);
    try {
      const { downloadPodiatryFormPdf } = await import("@/components/clinic/podiatry-form-pdf");
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
        footSymptomsRight: reception?.footSymptomsRight,
        footSymptomsLeft: reception?.footSymptomsLeft,
        visitTypesRight: reception?.visitTypesRight,
        visitTypesLeft: reception?.visitTypesLeft,
        medicalHistory: reception?.medicalHistory,
        medicalHistoryOther: reception?.medicalHistoryOther,
        vasScore: reception?.vasScore,
        session,
        reviews: reviews.map((r) => r.notes).filter((n): n is string => !!n),
        doctorDecision: doctorDecision?.decision,
      });
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setPdfBusy(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (!reception) {
    return <p className="text-center py-12 text-muted-foreground">{t("notFound")}</p>;
  }

  const isBilateral = (reception.affectedSide ?? []).includes("BILATERAL");

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

        {/* Recorded once, any time after the assessment exists. */}
        {session && (
          session.installedAt ? (
            <Badge variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {t("installed")} — {fmt(session.installedAt)}
              {session.installedByName ? ` — ${session.installedByName}` : ""}
            </Badge>
          ) : (
            <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.SESSION_EDIT}>
              <Button
                className="gap-1.5"
                disabled={install.isPending}
                onClick={() => install.mutate({ receptionId: id, sessionId: session.id })}
              >
                {install.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />}
                {t("markInstalled")}
              </Button>
            </ActionGuard>
          )
        )}
      </div>

      <Tabs defaultValue="reception" dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir={isRtl ? "rtl" : "ltr"}>
          <TabsTrigger value="reception" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabReception")}</TabsTrigger>
          <TabsTrigger value="patient_info" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabPatientInfo")}</TabsTrigger>
          {/* The assessment form is a session activity — hidden from a supervisor
              who can only receive patients (no session permission). */}
          {showSessionsTab && (
            <TabsTrigger value="sessions" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabSessions")}</TabsTrigger>
          )}
          {showSessionsTab && (
            <TabsTrigger value="review" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabReview")}</TabsTrigger>
          )}
          {showSessionsTab && (
            <TabsTrigger value="doctor_decision" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">{t("tabDoctorDecision")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reception" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
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

                {/* Both feet affected → each one carries its own answers. */}
                {isBilateral ? (
                  <>
                    <Field label={t("footSymptoms")}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SIDES.map(({ key, label }) => (
                          <div key={key} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                            <p className="text-[11px] text-muted-foreground">{label}</p>
                            <ReadOnlyChips
                              values={FOOT_SYMPTOM_VALUES}
                              selected={(key === "Right" ? reception.footSymptomsRight : reception.footSymptomsLeft) ?? []}
                              label={(v) => FOOT_SYMPTOM_LABEL[v]}
                            />
                          </div>
                        ))}
                      </div>
                    </Field>

                    <Field label={t("visitType")}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SIDES.map(({ key, label }) => (
                          <div key={key} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                            <p className="text-[11px] text-muted-foreground">{label}</p>
                            <ReadOnlyChips
                              values={VISIT_TYPE_VALUES}
                              selected={(key === "Right" ? reception.visitTypesRight : reception.visitTypesLeft) ?? []}
                              label={(v) => VISIT_TYPE_LABEL[v]}
                            />
                          </div>
                        ))}
                      </div>
                    </Field>
                  </>
                ) : (
                  <>
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
                  </>
                )}

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

        <TabsContent value="sessions" className="mt-4">
          <PodiatryAssessmentPanel
            receptionId={id}
            session={session}
            title={t("tabSessions")}
            actions={session && (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={pdfBusy} onClick={handleExportPdf}>
                {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {pdfBusy ? t("loading") : t("exportPdf")}
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <PodiatryReviewCard receptionId={id} canEdit={canEditAssessment} />
        </TabsContent>

        <TabsContent value="doctor_decision" className="mt-4">
          <PodiatryDoctorDecisionCard receptionId={id} canEdit={canEditAssessment} />
        </TabsContent>
      </Tabs>

      <PodiatryReceptionDialog open={editOpen} onOpenChange={setEditOpen} reception={reception} />
    </div>
  );
}
