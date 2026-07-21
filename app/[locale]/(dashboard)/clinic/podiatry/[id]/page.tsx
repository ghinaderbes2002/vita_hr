"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Archive, ArrowRight, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  usePodiatryReception, usePodiatrySessions, useArchivePodiatrySession,
} from "@/lib/hooks/use-clinic-podiatry";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { PatientPhoto } from "@/components/clinic/patient-photo";
import { PodiatrySession } from "@/lib/api/clinic-podiatry";
import {
  AFFECTED_SIDE_LABEL, CLINICAL_PLAN_LABEL, FOOT_SYMPTOM_LABEL,
  MEDICAL_HISTORY_LABEL, VISIT_TYPE_LABEL,
} from "@/components/clinic/podiatry-labels";
import { PodiatryReceptionDialog } from "@/components/clinic/podiatry-reception-dialog";
import { PodiatrySessionDialog } from "@/components/clinic/podiatry-session-dialog";

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

function Chips({ items }: { items?: string[] }) {
  if (!items?.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((x) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}
    </div>
  );
}

// A foot's findings — the four boolean flags plus its free-text notes.
function FootFindings({ side, s }: { side: "right" | "left"; s: PodiatrySession }) {
  const flags = side === "right"
    ? { flat: s.rightFlatFoot, high: s.rightHighArch, pron: s.rightPronation, sup: s.rightSupination }
    : { flat: s.leftFlatFoot, high: s.leftHighArch, pron: s.leftPronation, sup: s.leftSupination };
  const notes = side === "right" ? s.rightPressureNotes : s.leftPressureNotes;
  const asym = side === "right" ? s.rightAsymmetry : s.leftAsymmetry;
  const on = [
    flags.flat && "قدم مسطحة",
    flags.high && "قوس مرتفع",
    flags.pron && "انكباب",
    flags.sup && "انقلاب",
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">{side === "right" ? "القدم اليمنى" : "القدم اليسرى"}</p>
      <Chips items={on} />
      <Row label="ملاحظات الضغط" value={notes} />
      <Row label="عدم التناظر" value={asym} />
    </div>
  );
}

export default function PodiatryReceptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const { data: reception, isLoading } = usePodiatryReception(id);
  const [showArchived, setShowArchived] = useState(false);
  const { data: sessions = [] } = usePodiatrySessions(id, showArchived);
  const { data: patient } = useClinicPatient(reception?.patientId ?? "");
  const archiveSession = useArchivePodiatrySession();

  const [editOpen, setEditOpen] = useState(false);
  const [sessionDialog, setSessionDialog] = useState<{ open: boolean; session?: PodiatrySession }>({ open: false });
  const [archiveTarget, setArchiveTarget] = useState<PodiatrySession | null>(null);

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
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          تعديل الاستقبال
        </Button>
      </div>

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

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">بيانات الاستقبال</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
            <Row label="النشاطات" value={reception.activities} />
            <Row label="تاريخ الأعراض" value={reception.historyOfSymptoms} />
            <Row label="مقياس الألم (VAS)" value={reception.vasScore != null ? `${reception.vasScore}/10` : null} />
            <div className="col-span-2 md:col-span-3">
              <Row label="وصف المشكلة" value={reception.problemDescription} />
            </div>
            <Row label="الجهة المصابة" value={<Chips items={reception.affectedSide?.map((v) => AFFECTED_SIDE_LABEL[v] ?? v)} />} />
            <Row label="أعراض القدم" value={<Chips items={reception.footSymptoms?.map((v) => FOOT_SYMPTOM_LABEL[v] ?? v)} />} />
            <Row label="سبب الزيارة" value={<Chips items={reception.visitTypes?.map((v) => VISIT_TYPE_LABEL[v] ?? v)} />} />
            <div className="col-span-2 md:col-span-3">
              <Row
                label="التاريخ الطبي"
                value={
                  <div className="space-y-1">
                    <Chips items={reception.medicalHistory?.map((v) => MEDICAL_HISTORY_LABEL[v] ?? v)} />
                    {reception.medicalHistoryOther && (
                      <p className="text-sm text-muted-foreground">{reception.medicalHistoryOther}</p>
                    )}
                  </div>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Button size="sm" className="gap-1.5" onClick={() => setSessionDialog({ open: true })}>
                <Plus className="h-3.5 w-3.5" />
                إضافة جلسة
              </Button>
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
                      {s.archivedAt ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
                          <Archive className="h-3 w-3" />
                          مؤرشفة{` — ${fmt(s.archivedAt)}`}
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setArchiveTarget(s)}>
                          <Archive className="h-3.5 w-3.5" />
                          أرشفة
                        </Button>
                      )}
                    </div>
                  </div>

                  <Row
                    label="الخطة العلاجية"
                    value={<Chips items={s.clinicalPlan?.map((v) => CLINICAL_PLAN_LABEL[v] ?? v)} />}
                  />

                  <div className="grid md:grid-cols-2 gap-3">
                    <FootFindings side="right" s={s} />
                    <FootFindings side="left" s={s} />
                  </div>

                  {s.clinicianSignature && (
                    <div>
                      <p className="text-xs font-medium mb-1">توقيع الأخصائي</p>
                      {s.clinicianSignature.startsWith("data:") || s.clinicianSignature.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.clinicianSignature} alt="توقيع الأخصائي" className="h-16 max-w-55 object-contain border rounded bg-white" />
                      ) : (
                        <p className="text-sm text-muted-foreground">{s.clinicianSignature}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
