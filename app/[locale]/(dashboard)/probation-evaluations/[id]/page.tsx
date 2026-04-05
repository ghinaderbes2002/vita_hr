"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight, CheckCircle2, XCircle, Send, FileCheck,
  Gavel, UserCheck, Clock, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useProbationEvaluation,
  useProbationHistory,
  useSubmitProbation,
  useSeniorApproveProbation,
  useSeniorRejectProbation,
  useHrDocumentProbation,
  useHrRejectProbation,
  useCeoDecideProbation,
  useEmployeeAcknowledgeProbation,
} from "@/lib/hooks/use-probation-evaluations";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  ProbationStatus, ProbationScore, ProbationRecommendation, WorkflowActionData,
} from "@/lib/api/probation-evaluations";

const STATUS_CONFIG: Record<ProbationStatus, { label: string; className: string }> = {
  DRAFT:                           { label: "مسودة",                    className: "bg-gray-100 text-gray-600" },
  PENDING_SENIOR_MANAGER:          { label: "بانتظار المدير الأعلى",     className: "bg-blue-100 text-blue-700" },
  PENDING_HR:                      { label: "بانتظار HR",               className: "bg-purple-100 text-purple-700" },
  PENDING_CEO:                     { label: "بانتظار المدير التنفيذي",   className: "bg-amber-100 text-amber-700" },
  PENDING_EMPLOYEE_ACKNOWLEDGMENT: { label: "بانتظار إقرار الموظف",      className: "bg-cyan-100 text-cyan-700" },
  COMPLETED:                       { label: "مكتمل",                    className: "bg-green-100 text-green-700" },
  REJECTED_BY_SENIOR:              { label: "مرفوض من المدير الأعلى",   className: "bg-red-100 text-red-700" },
  REJECTED_BY_HR:                  { label: "مرفوض من HR",              className: "bg-red-100 text-red-700" },
  REJECTED_BY_CEO:                 { label: "مرفوض من المدير التنفيذي", className: "bg-red-100 text-red-700" },
};

const SCORE_LABELS: Record<ProbationScore, string> = {
  UNACCEPTABLE: "غير مقبول",
  ACCEPTABLE:   "مقبول",
  GOOD:         "جيد",
  VERY_GOOD:    "جيد جداً",
  EXCELLENT:    "ممتاز",
};

const SCORE_OPTIONS = Object.entries(SCORE_LABELS).map(([value, label]) => ({ value, label }));

const RECOMMENDATION_LABELS: Record<ProbationRecommendation, string> = {
  CONFIRM_POSITION:  "تثبيت في المنصب الحالي",
  EXTEND_PROBATION:  "تمديد فترة التجربة",
  TRANSFER_POSITION: "نقل لمنصب آخر",
  TERMINATE:         "إنهاء التعاقد",
};

const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATE:           "إنشاء التقييم",
  SUBMIT:           "إرسال للمدير الأعلى",
  SENIOR_APPROVE:   "موافقة المدير الأعلى",
  SENIOR_REJECT:    "رفض المدير الأعلى",
  HR_DOCUMENT:      "توثيق HR",
  HR_REJECT:        "رفض HR",
  CEO_DECIDE:       "قرار المدير التنفيذي",
  EMPLOYEE_ACKNOWLEDGE: "إقرار الموظف",
};

const WORKFLOW_STEPS = [
  { status: "DRAFT",                            label: "مسودة" },
  { status: "PENDING_SENIOR_MANAGER",           label: "المدير الأعلى" },
  { status: "PENDING_HR",                       label: "HR" },
  { status: "PENDING_CEO",                      label: "المدير التنفيذي" },
  { status: "PENDING_EMPLOYEE_ACKNOWLEDGMENT",  label: "إقرار الموظف" },
  { status: "COMPLETED",                        label: "مكتمل" },
];

function WorkflowStepper({ status }: { status: ProbationStatus }) {
  const isRejected = status.startsWith("REJECTED");
  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.status === status);
  const activeIdx = isRejected ? -1 : currentIdx;

  return (
    <div className="flex items-center gap-0">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = activeIdx > i;
        const active = activeIdx === i;
        return (
          <div key={step.status} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${i < WORKFLOW_STEPS.length - 1 ? "w-24 sm:w-32" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isRejected ? "bg-red-100 text-red-500" :
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary border-2 border-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs text-center text-muted-foreground leading-tight hidden sm:block">{step.label}</span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProbationEvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "document" | "hr-reject" | "ceo" | "acknowledge" | "submit" | null>(null);
  const [actionForm, setActionForm] = useState<WorkflowActionData>({});

  const { data: evaluation, isLoading } = useProbationEvaluation(id);
  const { data: history } = useProbationHistory(id);

  const submit = useSubmitProbation();
  const seniorApprove = useSeniorApproveProbation();
  const seniorReject = useSeniorRejectProbation();
  const hrDocument = useHrDocumentProbation();
  const hrReject = useHrRejectProbation();
  const ceoDecide = useCeoDecideProbation();
  const employeeAcknowledge = useEmployeeAcknowledgeProbation();

  const ev = evaluation as any;
  const hist = (history as any) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ev) return null;

  const scfg = STATUS_CONFIG[ev.status as ProbationStatus];

  function openAction(type: typeof actionType) {
    setActionType(type);
    setActionForm({});
    setActionDialogOpen(true);
  }

  async function handleActionSubmit() {
    const payload: WorkflowActionData = actionForm;
    const opts = { id, data: payload };

    switch (actionType) {
      case "submit":    await submit.mutateAsync(opts); break;
      case "approve":   await seniorApprove.mutateAsync(opts); break;
      case "reject":    await seniorReject.mutateAsync(opts); break;
      case "document":  await hrDocument.mutateAsync(opts); break;
      case "hr-reject": await hrReject.mutateAsync(opts); break;
      case "ceo":       await ceoDecide.mutateAsync(opts); break;
      case "acknowledge": await employeeAcknowledge.mutateAsync(opts); break;
    }
    setActionDialogOpen(false);
  }

  const isLoading2 = submit.isPending || seniorApprove.isPending || seniorReject.isPending ||
    hrDocument.isPending || hrReject.isPending || ceoDecide.isPending || employeeAcknowledge.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {ev.employee ? `${ev.employee.firstNameAr} ${ev.employee.lastNameAr}` : "تقييم فترة التجربة"}
          </h1>
          {ev.employee && <p className="text-sm text-muted-foreground">{ev.employee.employeeNumber}</p>}
        </div>
        <Badge className={`text-xs ${scfg.className}`}>{scfg.label}</Badge>
      </div>

      {/* Workflow Stepper */}
      <Card>
        <CardContent className="py-4 overflow-x-auto">
          <WorkflowStepper status={ev.status} />
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">تاريخ التعيين</p>
          <p className="font-medium mt-0.5">{ev.hireDate ? new Date(ev.hireDate).toLocaleDateString("ar-EG") : "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">نهاية فترة التجربة</p>
          <p className="font-medium mt-0.5">{ev.probationEndDate ? new Date(ev.probationEndDate).toLocaleDateString("ar-EG") : "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">تاريخ التقييم</p>
          <p className="font-medium mt-0.5">{ev.evaluationDate ? new Date(ev.evaluationDate).toLocaleDateString("ar-EG") : "—"}</p>
        </div>
        {ev.workAreasNote && (
          <div className="rounded-lg border p-3 sm:col-span-3">
            <p className="text-xs text-muted-foreground">مجالات العمل</p>
            <p className="font-medium mt-0.5 text-sm">{ev.workAreasNote}</p>
          </div>
        )}
      </div>

      {/* Scores */}
      {ev.scores?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">نتائج المعايير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ev.scores.map((s: any) => (
                <div key={s.criteriaId} className="flex items-center justify-between rounded-lg border p-2.5">
                  <span className="text-sm">{s.criteria?.nameAr || s.criteriaId}</span>
                  <Badge variant="secondary" className="text-xs">
                    {SCORE_LABELS[s.score as ProbationScore] || s.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final result */}
      {(ev.overallRating || ev.finalRecommendation) && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">النتيجة النهائية</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ev.overallRating && (
              <div>
                <p className="text-xs text-muted-foreground">التقييم العام</p>
                <p className="font-bold text-lg">{SCORE_LABELS[ev.overallRating as ProbationScore]}</p>
              </div>
            )}
            {ev.finalRecommendation && (
              <div>
                <p className="text-xs text-muted-foreground">التوصية</p>
                <p className="font-bold text-lg">{RECOMMENDATION_LABELS[ev.finalRecommendation as ProbationRecommendation]}</p>
              </div>
            )}
            {ev.employeeAcknowledged && (
              <div className="sm:col-span-2 flex items-center gap-2 text-green-600">
                <UserCheck className="h-4 w-4" />
                <span className="text-sm font-medium">وافق الموظف على التقييم</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workflow Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">الإجراءات المتاحة</CardTitle>
        </CardHeader>
        <CardContent>
          {ev.status === "COMPLETED" ? (
            <p className="text-sm text-muted-foreground text-center py-2">التقييم مكتمل — لا توجد إجراءات إضافية</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ev.status === "DRAFT" && (
                <Button className="gap-2" onClick={() => openAction("submit")}>
                  <Send className="h-4 w-4" />
                  إرسال للمدير الأعلى
                </Button>
              )}
              {ev.status === "PENDING_SENIOR_MANAGER" && (
                <>
                  <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => openAction("approve")}>
                    <CheckCircle2 className="h-4 w-4" />
                    موافقة وإرسال لـ HR
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => openAction("reject")}>
                    <XCircle className="h-4 w-4" />
                    رفض
                  </Button>
                </>
              )}
              {ev.status === "PENDING_HR" && (
                <>
                  <Button className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => openAction("document")}>
                    <FileCheck className="h-4 w-4" />
                    توثيق وإرسال للمدير التنفيذي
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => openAction("hr-reject")}>
                    <XCircle className="h-4 w-4" />
                    رفض
                  </Button>
                </>
              )}
              {ev.status === "PENDING_CEO" && (
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={() => openAction("ceo")}>
                  <Gavel className="h-4 w-4" />
                  اتخاذ القرار النهائي
                </Button>
              )}
              {ev.status === "PENDING_EMPLOYEE_ACKNOWLEDGMENT" && (
                <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => openAction("acknowledge")}>
                  <UserCheck className="h-4 w-4" />
                  إقرار الموظف
                </Button>
              )}
              {ev.status.startsWith("REJECTED") && (
                <Button className="gap-2" onClick={() => openAction("submit")}>
                  <Send className="h-4 w-4" />
                  إعادة الإرسال بعد التعديل
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {hist.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              سجل الإجراءات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hist.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {HISTORY_ACTION_LABELS[h.action] || h.action}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                    {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "submit"    && "إرسال التقييم"}
              {actionType === "approve"   && "موافقة المدير الأعلى"}
              {actionType === "reject"    && "رفض التقييم"}
              {actionType === "document"  && "توثيق HR"}
              {actionType === "hr-reject" && "رفض من HR"}
              {actionType === "ceo"       && "قرار المدير التنفيذي"}
              {actionType === "acknowledge" && "إقرار الموظف"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Overall rating — for approve/ceo */}
            {(actionType === "approve" || actionType === "ceo") && (
              <div className="space-y-1.5">
                <Label>التقييم العام</Label>
                <Select
                  value={actionForm.overallRating || "none"}
                  onValueChange={(v) => setActionForm({ ...actionForm, overallRating: v === "none" ? undefined : v as ProbationScore })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {SCORE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Recommendation — for ceo */}
            {actionType === "ceo" && (
              <div className="space-y-1.5">
                <Label>التوصية *</Label>
                <Select
                  value={actionForm.recommendation || "none"}
                  onValueChange={(v) => setActionForm({ ...actionForm, recommendation: v === "none" ? undefined : v as ProbationRecommendation })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {Object.entries(RECOMMENDATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Notes */}
            <div className="space-y-1.5">
              <Label>ملاحظات {(actionType === "reject" || actionType === "hr-reject") ? "*" : "(اختياري)"}</Label>
              <Textarea
                rows={3}
                value={actionForm.notes || ""}
                onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                placeholder={actionType?.includes("reject") ? "سبب الرفض..." : "ملاحظات..."}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleActionSubmit}
              disabled={
                isLoading2 ||
                (actionType?.includes("reject") && !actionForm.notes?.trim()) ||
                (actionType === "ceo" && !actionForm.recommendation)
              }
              className={actionType?.includes("reject") ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
