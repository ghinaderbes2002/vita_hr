"use client";

import { useState } from "react";
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
import {
  useProstheticsCase, useUpdateProstheticsCase, useUpdateProstheticsStatus,
  useSubmitAssessmentUpper, useSubmitAssessmentLower,
  useSubmitCommitteeOpinion, useSubmitCommitteeDecision, useSignCommitteeDecision,
  useCaseComponents, useAddCaseComponent, useDeleteCaseComponent,
  useSubmitGaitAnalysis,
  useProstheticsFollowUps, useAddProstheticsFollowUp,
  useProstheticsTimeline, useDownloadProstheticsPdf,
} from "@/lib/hooks/use-clinic-prosthetics";
import {
  ProstheticsStatus, ProstheticsCase,
  AmputationType, AmputationSide, KLevel, CommitteeDecision, ProstheticType,
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProstheticsCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const { data: caseData, isLoading } = useProstheticsCase(id);
  const { data: components = [] } = useCaseComponents(id);
  const { data: followUps = [] } = useProstheticsFollowUps(id);
  const { data: timeline = [] } = useProstheticsTimeline(id);

  const updateCase = useUpdateProstheticsCase();
  const updateStatus = useUpdateProstheticsStatus();
  const submitAssessmentUpper = useSubmitAssessmentUpper();
  const submitAssessmentLower = useSubmitAssessmentLower();
  const submitOpinion = useSubmitCommitteeOpinion();
  const submitDecision = useSubmitCommitteeDecision();
  const signDecision = useSignCommitteeDecision();
  const addComponent = useAddCaseComponent();
  const deleteComponent = useDeleteCaseComponent();
  const submitGait = useSubmitGaitAnalysis();
  const addFollowUp = useAddProstheticsFollowUp();
  const downloadPdf = useDownloadProstheticsPdf();

  // ── Local form state ──
  const [intakeForm, setIntakeForm] = useState({ amputationType: "", amputationSide: "", amputationLevel: "", amputationDate: "", amputationCause: "", amputationCount: "1", notes: "" });
  const [assessmentForm, setAssessmentForm] = useState({
    residualLimbLength: "MEDIUM" as "LONG" | "MEDIUM" | "SHORT" | "VERY_SHORT",
    hasPain: false, painArea: "", painIntensity: 0, hasPhantomPain: false,
    kLevel: null as KLevel | null, notes: "",
    weightBearing: "", canClimbStairs: false, singleLegBalance: false,
  });
  const [opinionForm, setOpinionForm] = useState({ opinion: "", recommendation: "" });
  const [decisionForm, setDecisionForm] = useState({
    decision: "APPROVED" as CommitteeDecision,
    summary: "",
    proposedProstheticType: "" as ProstheticType | "",
  });
  const [signOpen, setSignOpen] = useState(false);
  const [compForm, setCompForm] = useState({ name: "", code: "", supplier: "", quantity: "1", source: "WAREHOUSE" as "WAREHOUSE" | "SUPPLIER" });
  const [gaitForm, setGaitForm] = useState({ clinicalConclusion: "", recommendations: "", treatmentPlan: "" });
  const [followUpForm, setFollowUpForm] = useState({ date: new Date().toISOString().slice(0, 10), notes: "", kLevel: null as KLevel | null, painLevel: "" });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  if (!caseData) {
    return <div className="text-center py-20 text-muted-foreground">الحالة غير موجودة</div>;
  }

  const c = caseData;
  const patientName = c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—";

  const handleSaveIntake = async () => {
    await updateCase.mutateAsync({
      id,
      dto: {
        amputationType: (intakeForm.amputationType as AmputationType) || undefined,
        amputationSide: (intakeForm.amputationSide as AmputationSide) || undefined,
        amputationLevel: intakeForm.amputationLevel || undefined,
        amputationDate: intakeForm.amputationDate || undefined,
        amputationCause: intakeForm.amputationCause || undefined,
        amputationCount: intakeForm.amputationCount ? parseInt(intakeForm.amputationCount) : undefined,
        notes: intakeForm.notes || undefined,
      },
    });
    await updateStatus.mutateAsync({ id, status: "ASSESSMENT" });
  };

  const handleSubmitAssessment = async () => {
    const dto = {
      amputationSide: (assessmentForm as any).amputationSide || c.amputationSide || "RIGHT",
      residualLimbLength: assessmentForm.residualLimbLength,
      hasPain: assessmentForm.hasPain,
      painArea: assessmentForm.painArea || undefined,
      painIntensity: assessmentForm.painIntensity || undefined,
      hasPhantomPain: assessmentForm.hasPhantomPain,
      kLevel: assessmentForm.kLevel || undefined,
      notes: assessmentForm.notes || undefined,
    };
    if (c.amputationType === "UPPER") {
      await submitAssessmentUpper.mutateAsync({ id, dto });
    } else {
      await submitAssessmentLower.mutateAsync({
        id, dto: {
          ...dto,
          weightBearing: (assessmentForm.weightBearing as any) || undefined,
          canClimbStairs: assessmentForm.canClimbStairs,
          singleLegBalance: assessmentForm.singleLegBalance,
        },
      });
    }
    await updateStatus.mutateAsync({ id, status: "COMMITTEE_REVIEW" });
  };

  const handleSubmitOpinion = async () => {
    await submitOpinion.mutateAsync({ id, dto: { opinion: opinionForm.opinion, recommendation: opinionForm.recommendation || undefined } });
  };

  const handleSubmitDecision = async () => {
    await submitDecision.mutateAsync({
      id,
      dto: {
        decision: decisionForm.decision,
        summary: decisionForm.summary,
        proposedProstheticType: (decisionForm.proposedProstheticType as ProstheticType) || undefined,
      },
    });
  };

  const handleSign = async (base64: string) => {
    await signDecision.mutateAsync({ id, signatureBase64: base64 });
  };

  const handleAddComponent = async () => {
    if (!compForm.name.trim()) return;
    await addComponent.mutateAsync({
      id,
      dto: {
        name: compForm.name,
        code: compForm.code || undefined,
        supplier: compForm.supplier || undefined,
        quantity: parseInt(compForm.quantity) || 1,
        source: compForm.source,
      },
    });
    setCompForm({ name: "", code: "", supplier: "", quantity: "1", source: "WAREHOUSE" });
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
      <Tabs defaultValue={c.status === "CANCELLED" || c.status === "CLOSED" ? "timeline" : c.status.toLowerCase()}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="intake">الاستقبال</TabsTrigger>
          <TabsTrigger value="assessment">التقييم</TabsTrigger>
          <TabsTrigger value="committee_review">اللجنة</TabsTrigger>
          <TabsTrigger value="fitting">التركيب</TabsTrigger>
          <TabsTrigger value="gait_analysis">تحليل المشي</TabsTrigger>
          <TabsTrigger value="final_evaluation">التقييم النهائي</TabsTrigger>
          <TabsTrigger value="delivered">التسليم</TabsTrigger>
          <TabsTrigger value="follow_up">المتابعة</TabsTrigger>
          <TabsTrigger value="timeline">السجل الزمني</TabsTrigger>
        </TabsList>

        {/* ── INTAKE ──────────────────────────────────────────────────────── */}
        <TabsContent value="intake" className="mt-4">
          <Section title="بيانات الاستقبال">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نوع البتر</Label>
                  <Select
                    value={intakeForm.amputationType || c.amputationType || ""}
                    onValueChange={(v) => setIntakeForm((f) => ({ ...f, amputationType: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPPER">طرف علوي</SelectItem>
                      <SelectItem value="LOWER">طرف سفلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الجانب</Label>
                  <Select
                    value={intakeForm.amputationSide || c.amputationSide || ""}
                    onValueChange={(v) => setIntakeForm((f) => ({ ...f, amputationSide: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RIGHT">أيمن</SelectItem>
                      <SelectItem value="LEFT">أيسر</SelectItem>
                      <SelectItem value="BILATERAL">ثنائي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>مستوى البتر</Label>
                <AmputationLevelSelector
                  type={(intakeForm.amputationType || c.amputationType || "lower").toLowerCase() as "upper" | "lower"}
                  value={intakeForm.amputationLevel || c.amputationLevel || ""}
                  onChange={(v) => setIntakeForm((f) => ({ ...f, amputationLevel: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ البتر</Label>
                  <Input
                    type="date"
                    value={intakeForm.amputationDate || (c.dateOfAmputation ? c.dateOfAmputation.slice(0, 10) : "")}
                    onChange={(e) => setIntakeForm((f) => ({ ...f, amputationDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>عدد البترات (1-4)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={intakeForm.amputationCount || c.numberOfAmputations?.toString() || "1"}
                    onChange={(e) => setIntakeForm((f) => ({ ...f, amputationCount: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>سبب البتر</Label>
                <Input
                  value={intakeForm.amputationCause || c.causeOfAmputation || ""}
                  onChange={(e) => setIntakeForm((f) => ({ ...f, amputationCause: e.target.value }))}
                  placeholder="حادث، مرض، خلقي..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea
                  rows={2}
                  value={intakeForm.notes || c.notes || ""}
                  onChange={(e) => setIntakeForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {c.status === "INTAKE" && (
                <Button onClick={handleSaveIntake} disabled={updateCase.isPending || updateStatus.isPending} className="w-full">
                  {(updateCase.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                  حفظ والانتقال للتقييم
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── ASSESSMENT ──────────────────────────────────────────────────── */}
        <TabsContent value="assessment" className="mt-4">
          <Section title="التقييم السريري">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>طول الجذع المتبقي</Label>
                <Select
                  value={assessmentForm.residualLimbLength}
                  onValueChange={(v) => setAssessmentForm((f) => ({ ...f, residualLimbLength: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">طويل</SelectItem>
                    <SelectItem value="MEDIUM">متوسط</SelectItem>
                    <SelectItem value="SHORT">قصير</SelectItem>
                    <SelectItem value="VERY_SHORT">قصير جداً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={assessmentForm.hasPain} onCheckedChange={(v) => setAssessmentForm((f) => ({ ...f, hasPain: v }))} />
                <Label>يعاني من ألم</Label>
              </div>
              {assessmentForm.hasPain && (
                <div className="grid grid-cols-2 gap-4 pr-4 border-r-2 border-primary/20">
                  <div className="space-y-1.5">
                    <Label>منطقة الألم</Label>
                    <Input value={assessmentForm.painArea} onChange={(e) => setAssessmentForm((f) => ({ ...f, painArea: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>شدة الألم (0-10)</Label>
                    <Input type="number" min={0} max={10} value={assessmentForm.painIntensity} onChange={(e) => setAssessmentForm((f) => ({ ...f, painIntensity: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch checked={assessmentForm.hasPhantomPain} onCheckedChange={(v) => setAssessmentForm((f) => ({ ...f, hasPhantomPain: v }))} />
                <Label>ألم وهمي</Label>
              </div>
              {c.amputationType === "LOWER" && (
                <>
                  <div className="space-y-1.5">
                    <Label>تحمل الوزن</Label>
                    <Select value={assessmentForm.weightBearing} onValueChange={(v) => setAssessmentForm((f) => ({ ...f, weightBearing: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">لا يتحمل</SelectItem>
                        <SelectItem value="LOW">منخفض</SelectItem>
                        <SelectItem value="MEDIUM">متوسط</SelectItem>
                        <SelectItem value="HIGH">عالي</SelectItem>
                        <SelectItem value="FULL">كامل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={assessmentForm.canClimbStairs} onCheckedChange={(v) => setAssessmentForm((f) => ({ ...f, canClimbStairs: v }))} />
                      <Label>يستطيع صعود الدرج</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={assessmentForm.singleLegBalance} onCheckedChange={(v) => setAssessmentForm((f) => ({ ...f, singleLegBalance: v }))} />
                      <Label>توازن على ساق واحدة</Label>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>مستوى K المقترح</Label>
                <KLevelSelector value={assessmentForm.kLevel} onChange={(v) => setAssessmentForm((f) => ({ ...f, kLevel: v }))} />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات التقييم</Label>
                <Textarea rows={2} value={assessmentForm.notes} onChange={(e) => setAssessmentForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              {c.status === "ASSESSMENT" && (
                <Button
                  onClick={handleSubmitAssessment}
                  disabled={submitAssessmentUpper.isPending || submitAssessmentLower.isPending || updateStatus.isPending}
                  className="w-full"
                >
                  {(submitAssessmentUpper.isPending || submitAssessmentLower.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                  إرسال التقييم للجنة
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── COMMITTEE ───────────────────────────────────────────────────── */}
        <TabsContent value="committee_review" className="mt-4 space-y-4">
          <Section title="رأي اللجنة">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الرأي <span className="text-destructive">*</span></Label>
                <Textarea rows={3} value={opinionForm.opinion} onChange={(e) => setOpinionForm((f) => ({ ...f, opinion: e.target.value }))} placeholder="رأي اللجنة الطبية..." />
              </div>
              <div className="space-y-1.5">
                <Label>التوصية</Label>
                <Input value={opinionForm.recommendation} onChange={(e) => setOpinionForm((f) => ({ ...f, recommendation: e.target.value }))} />
              </div>
              {c.status === "COMMITTEE_REVIEW" && (
                <Button onClick={handleSubmitOpinion} disabled={!opinionForm.opinion || submitOpinion.isPending} className="w-full">
                  إرسال رأي اللجنة
                </Button>
              )}
            </div>
          </Section>
          <Section title="قرار اللجنة">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>القرار</Label>
                  <Select value={decisionForm.decision} onValueChange={(v) => setDecisionForm((f) => ({ ...f, decision: v as CommitteeDecision }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DECISION_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>نوع الطرف المقترح</Label>
                  <Select value={decisionForm.proposedProstheticType} onValueChange={(v) => setDecisionForm((f) => ({ ...f, proposedProstheticType: v as ProstheticType }))}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROSTHETIC_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ملخص القرار <span className="text-destructive">*</span></Label>
                <Textarea rows={2} value={decisionForm.summary} onChange={(e) => setDecisionForm((f) => ({ ...f, summary: e.target.value }))} />
              </div>
              {(c.status === "COMMITTEE_REVIEW" || c.status === "COMMITTEE_APPROVED") && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSubmitDecision} disabled={!decisionForm.summary || submitDecision.isPending} className="flex-1">
                    حفظ القرار
                  </Button>
                  <ActionGuard permission={PERMISSIONS.CLINIC_PROSTHETICS.COMMITTEE_SIGN}>
                    <Button onClick={() => setSignOpen(true)} className="flex-1">
                      توقيع القرار والانتقال للتركيب
                    </Button>
                  </ActionGuard>
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── FITTING ─────────────────────────────────────────────────────── */}
        <TabsContent value="fitting" className="mt-4 space-y-4">
          <Section title="قطع الطرف الصناعي">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>اسم القطعة <span className="text-destructive">*</span></Label>
                  <Input value={compForm.name} onChange={(e) => setCompForm((f) => ({ ...f, name: e.target.value }))} placeholder="Socket, Pylon..." />
                </div>
                <div className="space-y-1.5">
                  <Label>الكود</Label>
                  <Input value={compForm.code} onChange={(e) => setCompForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>المصدر</Label>
                  <Select value={compForm.source} onValueChange={(v) => setCompForm((f) => ({ ...f, source: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAREHOUSE">المستودع</SelectItem>
                      <SelectItem value="SUPPLIER">مورد خارجي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الكمية</Label>
                  <Input type="number" min={1} value={compForm.quantity} onChange={(e) => setCompForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleAddComponent} disabled={!compForm.name.trim() || addComponent.isPending} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" /> إضافة قطعة
              </Button>
              {components.length > 0 && (
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-right p-2 font-medium">القطعة</th>
                        <th className="text-right p-2 font-medium">الكود</th>
                        <th className="text-right p-2 font-medium">المصدر</th>
                        <th className="text-right p-2 font-medium">الكمية</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((comp) => (
                        <tr key={comp.id} className="border-t">
                          <td className="p-2 font-medium">{comp.name}</td>
                          <td className="p-2 text-muted-foreground font-mono">{comp.code ?? "—"}</td>
                          <td className="p-2">{comp.source === "WAREHOUSE" ? "مستودع" : "مورد"}</td>
                          <td className="p-2">{comp.quantity}</td>
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
                <Button onClick={handleAdvanceToGait} disabled={updateStatus.isPending} className="w-full">
                  الانتقال لتحليل المشي
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── GAIT ANALYSIS ───────────────────────────────────────────────── */}
        <TabsContent value="gait_analysis" className="mt-4">
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

        {/* ── FINAL EVALUATION ────────────────────────────────────────────── */}
        <TabsContent value="final_evaluation" className="mt-4">
          <Section title="التقييم النهائي">
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-yellow-500 mx-auto" />
              <p className="text-muted-foreground">يتم هنا توثيق التقييم النهائي وتوقيع المدير قبل التسليم.</p>
              {c.status === "FINAL_EVALUATION" && (
                <Button onClick={handleMarkDelivered} disabled={updateStatus.isPending} className="gap-2">
                  الانتقال للتسليم
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── DELIVERED ───────────────────────────────────────────────────── */}
        <TabsContent value="delivered" className="mt-4">
          <Section title="التسليم">
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-green-700">تم تسليم الطرف الصناعي</p>
              {c.deliveryDate && (
                <p className="text-sm text-muted-foreground">تاريخ التسليم: {new Date(c.deliveryDate).toLocaleDateString("ar")}</p>
              )}
              {c.status === "DELIVERED" && (
                <Button onClick={() => updateStatus.mutate({ id, status: "FOLLOW_UP" })} variant="outline">
                  بدء المتابعة
                </Button>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── FOLLOW UP ───────────────────────────────────────────────────── */}
        <TabsContent value="follow_up" className="mt-4 space-y-4">
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

      {/* Signature dialog for committee sign */}
      <SignaturePadDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title="توقيع قرار اللجنة"
        legalNotice="بتوقيعك هذا تؤكد اعتماد قرار اللجنة الطبية ونقل الحالة لمرحلة التركيب."
        onSign={handleSign}
        isLoading={signDecision.isPending}
      />
    </div>
  );
}
