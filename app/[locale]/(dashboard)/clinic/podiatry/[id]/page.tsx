"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Archive, ArrowRight, Download, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  usePodiatryReception, usePodiatrySessions, useArchivePodiatrySession,
} from "@/lib/hooks/use-clinic-podiatry";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { PatientPhoto } from "@/components/clinic/patient-photo";
import { PodiatrySession } from "@/lib/api/clinic-podiatry";
import {
  AFFECTED_SIDE_LABEL, AFFECTED_SIDE_VALUES, CLINICAL_PLAN_LABEL,
  CLINICAL_PLAN_VALUES, FOOT_FLAGS, FOOT_SYMPTOM_LABEL, FOOT_SYMPTOM_VALUES,
  MEDICAL_HISTORY_LABEL, MEDICAL_HISTORY_VALUES, VISIT_TYPE_LABEL, VISIT_TYPE_VALUES,
} from "@/components/clinic/podiatry-labels";
import { PodiatryReceptionDialog } from "@/components/clinic/podiatry-reception-dialog";
import { PodiatrySessionDialog } from "@/components/clinic/podiatry-session-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

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
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">{side === "right" ? "القدم اليمنى" : "القدم اليسرى"}</p>
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
      <Field label="ملاحظات الضغط">
        <TextBox value={side === "right" ? s.rightPressureNotes : s.leftPressureNotes} minHeight="min-h-14" />
      </Field>
      <Field label="عدم التماثل">
        <TextBox value={side === "right" ? s.rightAsymmetry : s.leftAsymmetry} />
      </Field>
    </div>
  );
}

export default function PodiatryReceptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

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

  // One sheet per session: reception data is shared, the analysis is the session's.
  const handleExportPdf = async (session: PodiatrySession) => {
    if (pdfSessionId) return;
    setPdfSessionId(session.id);
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
        medicalHistory: reception?.medicalHistory,
        medicalHistoryOther: reception?.medicalHistoryOther,
        vasScore: reception?.vasScore,
        session,
      });
    } catch {
      toast.error("فشل تصدير الـ PDF");
    } finally {
      setPdfSessionId(null);
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (!reception) {
    return <p className="text-center py-12 text-muted-foreground">لم يُعثر على الاستقبال</p>;
  }

  const patientName =
    `${patient?.firstName ?? reception.patient?.firstName ?? ""} ${patient?.lastName ?? reception.patient?.lastName ?? ""}`.trim()
    || "—";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/${locale}/clinic/podiatry`)}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            طب الأقدام
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

      <Tabs defaultValue="reception" dir="rtl">
        <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir="rtl">
          <TabsTrigger value="reception" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">الاستقبال</TabsTrigger>
          <TabsTrigger value="patient_info" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">معلومات المريض</TabsTrigger>
          {/* The assessment form is a session activity — hidden from a supervisor
              who can only receive patients (no session permission). */}
          {showSessionsTab && (
            <TabsTrigger value="sessions" className="text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">نموذج تقييم القدم الاحترافي</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reception" className="mt-4" dir="rtl">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">بيانات الاستقبال</CardTitle>
                <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.RECEPTION_EDIT}>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                </ActionGuard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Field label="النشاطات"><TextBox value={reception.activities} /></Field>
                <Field label="وصف المشكلة"><TextBox value={reception.problemDescription} minHeight="min-h-16" /></Field>
                <Field label="تاريخ الأعراض"><TextBox value={reception.historyOfSymptoms} /></Field>

                <Field label="القدم المصابة">
                  <ReadOnlyChips
                    values={AFFECTED_SIDE_VALUES}
                    selected={reception.affectedSide ?? []}
                    label={(v) => AFFECTED_SIDE_LABEL[v]}
                  />
                </Field>

                <Field label="أعراض القدم">
                  <ReadOnlyChips
                    values={FOOT_SYMPTOM_VALUES}
                    selected={reception.footSymptoms ?? []}
                    label={(v) => FOOT_SYMPTOM_LABEL[v]}
                  />
                </Field>

                <Field label="نوع الزيارة">
                  <ReadOnlyChips
                    values={VISIT_TYPE_VALUES}
                    selected={reception.visitTypes ?? []}
                    label={(v) => VISIT_TYPE_LABEL[v]}
                  />
                </Field>

                <Field label="التاريخ الطبي">
                  <ReadOnlyChips
                    values={MEDICAL_HISTORY_VALUES}
                    selected={reception.medicalHistory ?? []}
                    label={(v) => MEDICAL_HISTORY_LABEL[v]}
                  />
                  {reception.medicalHistoryOther && (
                    <div className="mt-1.5"><TextBox value={reception.medicalHistoryOther} /></div>
                  )}
                </Field>

                <Field label={`شدة الألم (VAS)${reception.vasScore != null ? ` — ${reception.vasScore}/10` : ""}`}>
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

        <TabsContent value="patient_info" className="mt-4" dir="rtl">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">معلومات المريض</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-6 items-start">
                <div className="grid flex-1 grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
                <Row label="رقم المريض" value={patient?.patientNumber ?? reception.patient?.patientNumber} />
                <Row label="اسم المريض" value={patientName} />
                <Row
                  label="العمر"
                  value={ageFromDob(patient?.dateOfBirth) != null ? `${ageFromDob(patient?.dateOfBirth)} سنة` : null}
                />
                <Row label="الطول" value={patient?.heightCm ? `${patient.heightCm} cm` : null} />
                <Row label="الوزن" value={patient?.weightKg ? `${patient.weightKg} kg` : null} />
                <Row label="مؤشر كتلة الجسم" value={patient?.bmi ? patient.bmi.toFixed(1) : null} />
                </div>
                <PatientPhoto patientId={reception.patientId} className="h-32 w-32 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4" dir="rtl">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  الجلسات{sessions.length > 0 ? ` (${sessions.length})` : ""}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={showArchived ? "secondary" : "outline"}
                    className="gap-1.5"
                    onClick={() => setShowArchived((v) => !v)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {showArchived ? "إخفاء المؤرشفة" : "عرض المؤرشفة"}
                  </Button>
                  <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.SESSION_CREATE}>
                    <Button size="sm" className="gap-1.5" onClick={() => setSessionDialog({ open: true })}>
                      <Plus className="h-3.5 w-3.5" />
                      إضافة جلسة
                    </Button>
                  </ActionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد جلسات مسجّلة</p>
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
                            {pdfSessionId === s.id ? "جاري..." : "تصدير PDF"}
                          </Button>
                          {s.archivedAt ? (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
                              <Archive className="h-3 w-3" />
                              مؤرشفة{` — ${fmt(s.archivedAt)}`}
                            </Badge>
                          ) : (
                            <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.SESSION_ARCHIVE}>
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setArchiveTarget(s)}>
                                <Archive className="h-3.5 w-3.5" />
                                أرشفة
                              </Button>
                            </ActionGuard>
                          )}
                        </div>
                      </div>

                      <Field label="الخطة العلاجية">
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
                        <Field label="اسم الأخصائي"><TextBox value={s.clinicianName} /></Field>
                        <Field label="التوقيع">
                          {s.clinicianSignature ? (
                            s.clinicianSignature.startsWith("data:") || s.clinicianSignature.startsWith("http") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.clinicianSignature} alt="التوقيع" className="h-16 w-full object-contain border rounded bg-white" />
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
        title="أرشفة الجلسة؟"
        description="ستُخفى الجلسة من القائمة مع الاحتفاظ ببياناتها، ويمكن عرضها لاحقاً من زر «عرض المؤرشفة»."
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
