"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowRight, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { BodyPainMap } from "@/components/clinic/body-pain-map";
import { SignaturePadDialog } from "@/components/clinic/signature-pad-dialog";
import { PdfExportButton } from "@/components/clinic/pdf-export-button";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ActionGuard } from "@/components/permissions/action-guard";
import {
  usePhysioCase, useUpdatePhysioStatus,
  useSubmitPainMap, useUpdatePainMap,
  useSubmitMedicalHistory, useSubmitPhysioGoals,
  useSubmitPosturalAssessment, useSubmitTreatmentPlan, useSignPhysioTreatmentPlan,
  usePhysioSessions, useAddPhysioSession, useDeletePhysioSession,
  usePhysioTimeline,
} from "@/lib/hooks/use-clinic-physio";
import { PhysioStatus, PainPoint } from "@/lib/api/clinic-physio";

// ─── Modalities available ─────────────────────────────────────────────────────

const MODALITIES = [
  "Ultrasound", "TENS", "IFT", "Hot Pack", "Cold Pack", "Exercise",
  "Manual Therapy", "Traction", "LASER", "Paraffin Bath", "Electrotherapy",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PhysioCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const { data: caseData, isLoading } = usePhysioCase(id);
  const { data: sessions = [] } = usePhysioSessions(id);
  const { data: timeline = [] } = usePhysioTimeline(id);

  const updateStatus = useUpdatePhysioStatus();
  const submitPainMap = useSubmitPainMap();
  const updatePainMap = useUpdatePainMap();
  const submitHistory = useSubmitMedicalHistory();
  const submitGoals = useSubmitPhysioGoals();
  const submitPostural = useSubmitPosturalAssessment();
  const submitPlan = useSubmitTreatmentPlan();
  const signPlan = useSignPhysioTreatmentPlan();
  const addSession = useAddPhysioSession();
  const deleteSession = useDeletePhysioSession();

  // ── Local state ──
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [historyForm, setHistoryForm] = useState({
    isSmoker: false, hasAllergies: false, allergyDetails: "",
    isPregnant: false, hasPacemaker: false, currentMedications: "",
    chronicDiseases: "",
  });
  const [goalsText, setGoalsText] = useState("");
  const [posturalDiagnosis, setPosturalDiagnosis] = useState("");
  const [posturalNotes, setPosturalNotes] = useState("");
  const [planModalities, setPlanModalities] = useState<string[]>([]);
  const [planRemarks, setPlanRemarks] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "",
    notes: "",
    painLevel: "",
    modalities: [] as string[],
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  if (!caseData) {
    return <div className="text-center py-20 text-muted-foreground">الحالة غير موجودة</div>;
  }

  const c = caseData;
  const patientName = c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—";

  const handleSubmitPainMap = async () => {
    if (c.status === "COMPLAINT") {
      await submitPainMap.mutateAsync({ id, dto: { points: painPoints } });
      await updateStatus.mutateAsync({ id, status: "PAIN_MAP" });
    } else {
      await updatePainMap.mutateAsync({ id, dto: { points: painPoints } });
    }
  };

  const handleSubmitHistory = async () => {
    await submitHistory.mutateAsync({
      id,
      dto: {
        isSmoker: historyForm.isSmoker,
        hasAllergies: historyForm.hasAllergies,
        allergyDetails: historyForm.allergyDetails || undefined,
        isPregnant: historyForm.isPregnant,
        hasPacemaker: historyForm.hasPacemaker,
        currentMedications: historyForm.currentMedications || undefined,
        chronicDiseases: historyForm.chronicDiseases ? historyForm.chronicDiseases.split(",").map((s) => s.trim()) : undefined,
      },
    });
    await updateStatus.mutateAsync({ id, status: "MEDICAL_HISTORY" });
  };

  const handleSubmitGoals = async () => {
    const goals = goalsText.split("\n").map((g) => g.trim()).filter(Boolean);
    await submitGoals.mutateAsync({ id, dto: { goals } });
    await updateStatus.mutateAsync({ id, status: "GOALS" });
  };

  const handleSubmitPostural = async () => {
    await submitPostural.mutateAsync({
      id,
      dto: { diagnosis: posturalDiagnosis || undefined, spasticityNotes: posturalNotes || undefined },
    });
    await updateStatus.mutateAsync({ id, status: "POSTURAL_ASSESSMENT" });
  };

  const handleSubmitPlan = async () => {
    await submitPlan.mutateAsync({ id, dto: { modalities: planModalities, remarks: planRemarks || undefined } });
    await updateStatus.mutateAsync({ id, status: "TREATMENT_PLAN" });
  };

  const handleSign = async (base64: string) => {
    await signPlan.mutateAsync({ id, signatureBase64: base64 });
    await updateStatus.mutateAsync({ id, status: "ACTIVE_SESSIONS" });
  };

  const handleAddSession = async () => {
    if (!sessionForm.date) return;
    await addSession.mutateAsync({
      id,
      dto: {
        date: sessionForm.date,
        time: sessionForm.time || undefined,
        modalitiesApplied: sessionForm.modalities,
        notes: sessionForm.notes || undefined,
        painLevel: sessionForm.painLevel ? parseInt(sessionForm.painLevel) : undefined,
      },
    });
    setSessionForm({ date: new Date().toISOString().slice(0, 10), time: "", notes: "", painLevel: "", modalities: [] });
  };

  const toggleModality = (m: string) => {
    setPlanModalities((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const toggleSessionModality = (m: string) => {
    setSessionForm((f) => ({
      ...f,
      modalities: f.modalities.includes(m) ? f.modalities.filter((x) => x !== m) : [...f.modalities, m],
    }));
  };

  const defaultTab = ["CANCELLED", "COMPLETED"].includes(c.status) ? "timeline" : c.status.toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
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
            <h1 className="text-xl font-bold">حالة علاج فيزيائي</h1>
            <CaseStatusBadge status={c.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <PdfExportButton type="physio-case" id={id} size="sm" />
          <Button
            variant="outline" size="sm"
            onClick={() => updateStatus.mutate({ id, status: "CANCELLED" })}
            className="text-destructive"
          >
            إلغاء الحالة
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="complaint">الشكوى</TabsTrigger>
          <TabsTrigger value="pain_map">خريطة الألم</TabsTrigger>
          <TabsTrigger value="medical_history">التاريخ الطبي</TabsTrigger>
          <TabsTrigger value="goals">الأهداف</TabsTrigger>
          <TabsTrigger value="postural_assessment">التقييم الوضعي</TabsTrigger>
          <TabsTrigger value="treatment_plan">خطة العلاج</TabsTrigger>
          <TabsTrigger value="active_sessions">الجلسات ({sessions.length})</TabsTrigger>
          <TabsTrigger value="timeline">السجل الزمني</TabsTrigger>
        </TabsList>

        {/* ── COMPLAINT ───────────────────────────────────────────────────── */}
        <TabsContent value="complaint" className="mt-4">
          <Section title="الشكوى الرئيسية">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                سجّل الشكوى الرئيسية للمريض وانتقل لخريطة الألم.
              </p>
              <div className="space-y-1.5">
                <Label>ملاحظات الشكوى</Label>
                <Textarea rows={3} placeholder="وصف الشكوى..." />
              </div>
              {c.status === "COMPLAINT" && (
                <Button onClick={() => updateStatus.mutate({ id, status: "PAIN_MAP" })} disabled={updateStatus.isPending} className="w-full">
                  الانتقال لخريطة الألم
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── PAIN MAP ────────────────────────────────────────────────────── */}
        <TabsContent value="pain_map" className="mt-4">
          <Section title="خريطة الألم">
            <div className="space-y-4">
              <BodyPainMap
                points={painPoints}
                onChange={setPainPoints}
                readonly={!["COMPLAINT", "PAIN_MAP"].includes(c.status)}
              />
              {["COMPLAINT", "PAIN_MAP"].includes(c.status) && (
                <Button
                  onClick={handleSubmitPainMap}
                  disabled={submitPainMap.isPending || updatePainMap.isPending || updateStatus.isPending}
                  className="w-full"
                >
                  {(submitPainMap.isPending || updatePainMap.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                  حفظ وانتقل للتاريخ الطبي
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── MEDICAL HISTORY ─────────────────────────────────────────────── */}
        <TabsContent value="medical_history" className="mt-4">
          <Section title="التاريخ الطبي">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "isSmoker", label: "مدخن" },
                  { key: "hasAllergies", label: "لديه حساسية" },
                  { key: "isPregnant", label: "حامل" },
                  { key: "hasPacemaker", label: "ناظم قلب" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={(historyForm as any)[key]}
                      onCheckedChange={(v) => setHistoryForm((f) => ({ ...f, [key]: v }))}
                    />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
              {historyForm.hasAllergies && (
                <div className="space-y-1.5">
                  <Label>تفاصيل الحساسية</Label>
                  <Input value={historyForm.allergyDetails} onChange={(e) => setHistoryForm((f) => ({ ...f, allergyDetails: e.target.value }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>الأدوية الحالية</Label>
                <Input value={historyForm.currentMedications} onChange={(e) => setHistoryForm((f) => ({ ...f, currentMedications: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>الأمراض المزمنة (مفصولة بفاصلة)</Label>
                <Input value={historyForm.chronicDiseases} onChange={(e) => setHistoryForm((f) => ({ ...f, chronicDiseases: e.target.value }))} placeholder="سكري، ضغط..." />
              </div>
              {c.status === "PAIN_MAP" && (
                <Button onClick={handleSubmitHistory} disabled={submitHistory.isPending || updateStatus.isPending} className="w-full">
                  حفظ والانتقال للأهداف
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── GOALS ───────────────────────────────────────────────────────── */}
        <TabsContent value="goals" className="mt-4">
          <Section title="أهداف العلاج">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>الأهداف (سطر لكل هدف)</Label>
                <Textarea
                  rows={4}
                  value={goalsText}
                  onChange={(e) => setGoalsText(e.target.value)}
                  placeholder={"تقليل الألم\nتحسين نطاق الحركة\nالعودة للعمل"}
                />
              </div>
              {c.status === "MEDICAL_HISTORY" && (
                <Button onClick={handleSubmitGoals} disabled={!goalsText.trim() || submitGoals.isPending || updateStatus.isPending} className="w-full">
                  حفظ والانتقال للتقييم الوضعي
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── POSTURAL ASSESSMENT ─────────────────────────────────────────── */}
        <TabsContent value="postural_assessment" className="mt-4">
          <Section title="التقييم الوضعي">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>التشخيص</Label>
                <Input value={posturalDiagnosis} onChange={(e) => setPosturalDiagnosis(e.target.value)} placeholder="التشخيص الفيزيائي..." />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات التقلص العضلي</Label>
                <Textarea rows={2} value={posturalNotes} onChange={(e) => setPosturalNotes(e.target.value)} />
              </div>
              {c.status === "GOALS" && (
                <Button onClick={handleSubmitPostural} disabled={submitPostural.isPending || updateStatus.isPending} className="w-full">
                  حفظ والانتقال لخطة العلاج
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── TREATMENT PLAN ──────────────────────────────────────────────── */}
        <TabsContent value="treatment_plan" className="mt-4 space-y-4">
          <Section title="خطة العلاج">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الوسائل العلاجية</Label>
                <div className="flex flex-wrap gap-2">
                  {MODALITIES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleModality(m)}
                      className={`px-3 py-1 rounded-full border text-sm transition-colors ${
                        planModalities.includes(m)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات الخطة</Label>
                <Textarea rows={2} value={planRemarks} onChange={(e) => setPlanRemarks(e.target.value)} />
              </div>
              {c.status === "POSTURAL_ASSESSMENT" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSubmitPlan} disabled={planModalities.length === 0 || submitPlan.isPending} className="flex-1">
                    حفظ الخطة
                  </Button>
                  <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.PLAN_SIGN}>
                    <Button onClick={() => setSignOpen(true)} className="flex-1">
                      توقيع وبدء الجلسات
                    </Button>
                  </ActionGuard>
                </div>
              )}
              {c.status === "TREATMENT_PLAN" && (
                <ActionGuard permission={PERMISSIONS.CLINIC_PHYSIO.PLAN_SIGN}>
                  <Button onClick={() => setSignOpen(true)} className="w-full">
                    توقيع خطة العلاج وبدء الجلسات
                  </Button>
                </ActionGuard>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── SESSIONS ────────────────────────────────────────────────────── */}
        <TabsContent value="active_sessions" className="mt-4 space-y-4">
          {["ACTIVE_SESSIONS", "TREATMENT_PLAN"].includes(c.status) && (
            <Section title="إضافة جلسة">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>التاريخ</Label>
                    <Input type="date" value={sessionForm.date} onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الوقت</Label>
                    <Input type="time" value={sessionForm.time} onChange={(e) => setSessionForm((f) => ({ ...f, time: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الوسائل المطبقة</Label>
                  <div className="flex flex-wrap gap-2">
                    {MODALITIES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleSessionModality(m)}
                        className={`px-2.5 py-0.5 rounded-full border text-xs transition-colors ${
                          sessionForm.modalities.includes(m)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>شدة الألم (0-10)</Label>
                    <Input type="number" min={0} max={10} value={sessionForm.painLevel} onChange={(e) => setSessionForm((f) => ({ ...f, painLevel: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ملاحظات</Label>
                    <Input value={sessionForm.notes} onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddSession} disabled={addSession.isPending} className="flex-1 gap-2">
                    <Plus className="h-4 w-4" /> إضافة جلسة
                  </Button>
                  <Button variant="outline" onClick={() => updateStatus.mutate({ id, status: "COMPLETED" })} disabled={sessions.length === 0}>
                    إنهاء الجلسات
                  </Button>
                </div>
              </div>
            </Section>
          )}

          {sessions.length > 0 && (
            <Section title={`الجلسات السابقة (${sessions.length})`}>
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center">
                        <span className="font-medium text-sm">{new Date(s.date).toLocaleDateString("ar")}</span>
                        {s.time && <span className="text-xs text-muted-foreground">{s.time}</span>}
                        {s.painLevel != null && <Badge variant="outline" className="text-xs">ألم: {s.painLevel}/10</Badge>}
                      </div>
                      <button onClick={() => deleteSession.mutate({ id, sessionId: s.id })} className="text-destructive hover:opacity-70">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {s.modalitiesApplied.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.modalitiesApplied.map((m) => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                      </div>
                    )}
                    {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
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
