"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight, CheckCircle2, XCircle, FileCheck,
  Gavel, History, CalendarClock, CalendarCheck, ClipboardEdit, AlertCircle,
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
  useSelfEvaluateProbation,
  useSeniorApproveProbation,
  useSeniorRejectProbation,
  useHrDocumentProbation,
  useHrRejectProbation,
  useCeoDecideProbation,
  useProposeMeeting,
  useConfirmMeeting,
  useSuggestMeetingChange,
  usePendingMyAction,
  useCompleteProbation,
} from "@/lib/hooks/use-probation-evaluations";
import {
  ProbationStatus,
  ProbationRecommendation,
  PROBATION_SCORE_LABELS,
  PROBATION_RECOMMENDATION_OPTIONS,
} from "@/lib/api/probation-evaluations";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEmployeeBasic } from "@/lib/hooks/use-employees";
import { FinalScoreCard } from "@/components/features/probation-evaluations/final-score-card";

const STATUS_CLASSES: Record<ProbationStatus, string> = {
  DRAFT:                    "bg-gray-100 text-gray-600",
  PENDING_SELF_EVALUATION:  "bg-indigo-100 text-indigo-700",
  PENDING_SENIOR_MANAGER:   "bg-blue-100 text-blue-700",
  PENDING_HR:               "bg-purple-100 text-purple-700",
  PENDING_CEO:              "bg-amber-100 text-amber-700",
  PENDING_MEETING_SCHEDULE: "bg-orange-100 text-orange-700",
  COMPLETED:                "bg-green-100 text-green-700",
  REJECTED_BY_SENIOR:       "bg-red-100 text-red-700",
  REJECTED_BY_HR:           "bg-red-100 text-red-700",
  REJECTED_BY_CEO:          "bg-red-100 text-red-700",
};

const WORKFLOW_STATUSES: ProbationStatus[] = [
  "DRAFT",
  "PENDING_SELF_EVALUATION",
  "PENDING_SENIOR_MANAGER",
  "PENDING_HR",
  "PENDING_CEO",
  "PENDING_MEETING_SCHEDULE",
  "COMPLETED",
];

type ActionType =
  | "self-evaluate"
  | "approve"
  | "reject"
  | "document"
  | "hr-reject"
  | "ceo"
  | "propose-meeting"
  | "confirm-employee"
  | "confirm-direct-manager"
  | "suggest-meeting-change"
  | "complete";

function ScoreLabel({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      {score} — {PROBATION_SCORE_LABELS[score] ?? score}
    </Badge>
  );
}

function ScoreInput({
  value,
  onChange,
}: {
  value: number | "";
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={1}
      max={5}
      step={1}
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value);
        if (v >= 1 && v <= 5) onChange(v);
        else if (e.target.value === "") onChange(0 as any);
      }}
      placeholder="1–5"
      className="w-16 h-8 rounded-md border border-input bg-background px-2 text-sm text-center"
    />
  );
}

function WorkflowStepper({ status, t }: { status: ProbationStatus; t: any }) {
  const isRejected = status.startsWith("REJECTED");
  const currentIdx = WORKFLOW_STATUSES.findIndex((s) => s === status);
  const activeIdx = isRejected ? -1 : currentIdx;

  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {WORKFLOW_STATUSES.map((step, i) => {
        const done = activeIdx > i;
        const active = activeIdx === i;
        return (
          <div key={step} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${i < WORKFLOW_STATUSES.length - 1 ? "w-20 sm:w-28" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isRejected ? "bg-red-100 text-red-500" :
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary border-2 border-primary animate-pulse" :
                "bg-muted text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : active ? "●" : "○"}
              </div>
              <span className="text-[10px] text-center text-muted-foreground leading-tight hidden sm:block w-20">
                {t(`workflow.${step}`)}
              </span>
            </div>
            {i < WORKFLOW_STATUSES.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 min-w-3 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBanner({
  status,
  canSeniorApprove,
  canHrDocument,
  canCeoDecide,
  onAction,
  t,
}: {
  status: ProbationStatus;
  canSeniorApprove: boolean;
  canHrDocument: boolean;
  canCeoDecide: boolean;
  onAction: (type: ActionType) => void;
  t: any;
}) {
  if (status === "COMPLETED") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <span className="text-sm font-medium text-green-800">مكتمل — تم إغلاق هذا التقييم</span>
      </div>
    );
  }

  if (status.startsWith("REJECTED")) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <XCircle className="h-5 w-5 text-red-600 shrink-0" />
        <span className="text-sm font-medium text-red-800">
          {status === "REJECTED_BY_SENIOR" && "مرفوض من المدير المباشر"}
          {status === "REJECTED_BY_HR" && "مرفوض من HR"}
          {status === "REJECTED_BY_CEO" && "مرفوض من الرئيس التنفيذي"}
        </span>
      </div>
    );
  }

  const bannerConfig: Partial<Record<ProbationStatus, { msg: string; btnLabel?: string; action?: ActionType; color: string }>> = {
    PENDING_SELF_EVALUATION: {
      msg: "بانتظار إكمال التقييم الذاتي من الموظف",
      btnLabel: "ابدأ التقييم",
      action: "self-evaluate",
      color: "border-indigo-200 bg-indigo-50 text-indigo-800",
    },
    PENDING_SENIOR_MANAGER: {
      msg: "بانتظار مراجعة المدير المباشر",
      btnLabel: canSeniorApprove ? "راجع التقييم" : undefined,
      action: "approve",
      color: "border-blue-200 bg-blue-50 text-blue-800",
    },
    PENDING_HR: {
      msg: "بانتظار اعتماد HR",
      btnLabel: canHrDocument ? "اعتماد HR" : undefined,
      action: "document",
      color: "border-purple-200 bg-purple-50 text-purple-800",
    },
    PENDING_CEO: {
      msg: "بانتظار الاعتماد النهائي من الرئيس التنفيذي",
      btnLabel: canCeoDecide ? "اتخاذ القرار" : undefined,
      action: "ceo",
      color: "border-amber-200 bg-amber-50 text-amber-800",
    },
    PENDING_MEETING_SCHEDULE: {
      msg: "بانتظار جدولة الاجتماع الختامي",
      color: "border-orange-200 bg-orange-50 text-orange-800",
    },
  };

  const cfg = bannerConfig[status];
  if (!cfg) return null;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${cfg.color}`}>
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{cfg.msg}</span>
      </div>
      {cfg.btnLabel && cfg.action && (
        <button
          type="button"
          onClick={() => onAction(cfg.action!)}
          className="shrink-0 rounded-md bg-white/70 px-3 py-1.5 text-xs font-semibold hover:bg-white transition-colors border border-current/20"
        >
          {cfg.btnLabel}
        </button>
      )}
    </div>
  );
}

export default function ProbationEvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReadonly = searchParams.get("readonly") === "1";
  const t = useTranslations("probationEvaluations");
  const tCommon = useTranslations("common");

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [overallRating, setOverallRating] = useState<number | "">("");
  const [recommendation, setRecommendation] = useState<ProbationRecommendation | "">("");
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});

  const { data: evaluation, isLoading } = useProbationEvaluation(id);
  const { data: history } = useProbationHistory(id);

  const selfEvaluate    = useSelfEvaluateProbation();
  const seniorApprove   = useSeniorApproveProbation();
  const seniorReject    = useSeniorRejectProbation();
  const hrDocument      = useHrDocumentProbation();
  const hrReject        = useHrRejectProbation();
  const ceoDecide       = useCeoDecideProbation();
  const proposeMeeting  = useProposeMeeting();
  const confirmMeeting  = useConfirmMeeting();
  const suggestChange   = useSuggestMeetingChange();
  // The backend already decides who still owes an action on this evaluation —
  // the same list that drives the dashboard banner. Trust it rather than
  // re-deriving the viewer's role from employee ids, which don't always match.
  const { data: pendingMine = [] } = usePendingMyAction();
  const isPendingForMe = pendingMine.some((p) => p.id === id);
  const completeProbation = useCompleteProbation();

  const ev = evaluation as any;
  const hist = (history as any) || [];
  const { hasPermission, isAdmin } = usePermissions();
  const { user } = useAuthStore();

  const { data: employeeRecord } = useEmployeeBasic(ev?.employeeId || "");

  const canSeniorApprove = isAdmin() || hasPermission("probation:senior-review");
  const canHrDocument    = isAdmin() || hasPermission("probation:hr-review");
  const canCeoDecide     = isAdmin() || hasPermission("probation:ceo-review");

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

  const evScores: any[] = ev.scores || [];

  function openAction(type: ActionType) {
    setActionType(type);
    setActionNotes("");
    setMeetingDate("");
    setDocumentUrl("");
    setOverallRating("");
    setRecommendation("");
    // Pre-fill scoreMap from existing scores
    const initial: Record<string, number> = {};
    evScores.forEach((s: any) => {
      if (s.score) initial[s.criteriaId] = s.score;
    });
    setScoreMap(initial);
    setActionDialogOpen(true);
  }

  async function handleActionSubmit() {
    try {
      switch (actionType) {
        case "self-evaluate":
          await selfEvaluate.mutateAsync({
            id,
            data: {
              notes: actionNotes || undefined,
              scores: evScores
                .filter((s) => scoreMap[s.criteriaId] >= 1)
                .map((s) => ({ criteriaId: s.criteriaId, score: scoreMap[s.criteriaId] })),
            },
          });
          break;
        case "approve":
          await seniorApprove.mutateAsync({
            id,
            data: {
              overallRating: overallRating as number,
              recommendation: recommendation as ProbationRecommendation,
              notes: actionNotes || undefined,
              scores: evScores
                .filter((s) => scoreMap[s.criteriaId] >= 1)
                .map((s) => ({ criteriaId: s.criteriaId, score: scoreMap[s.criteriaId] })),
            },
          });
          break;
        case "reject":
          await seniorReject.mutateAsync({ id, data: { notes: actionNotes || undefined } });
          break;
        case "document":
          await hrDocument.mutateAsync({ id, data: { notes: actionNotes || undefined } });
          break;
        case "hr-reject":
          await hrReject.mutateAsync({ id, data: { notes: actionNotes || undefined } });
          break;
        case "ceo":
          await ceoDecide.mutateAsync({
            id,
            data: { recommendation: recommendation as ProbationRecommendation, notes: actionNotes || undefined },
          });
          break;
        case "propose-meeting":
          await proposeMeeting.mutateAsync({ id, data: { meetingProposedAt: meetingDate } });
          break;
        case "confirm-employee":
          await confirmMeeting.mutateAsync({ id, data: { role: "employee" } });
          break;
        case "confirm-direct-manager":
          await confirmMeeting.mutateAsync({ id, data: { role: "manager" } });
          break;
        case "suggest-meeting-change":
          await suggestChange.mutateAsync({ id, data: { note: actionNotes.trim() } });
          break;
        case "complete":
          await completeProbation.mutateAsync({ id, employeeId: ev.employeeId, data: {} });
          break;
      }
      setActionDialogOpen(false);
    } catch {
      // toast handled inside each hook
    }
  }

  const isActionLoading =
    selfEvaluate.isPending || seniorApprove.isPending || seniorReject.isPending ||
    hrDocument.isPending || hrReject.isPending || ceoDecide.isPending ||
    proposeMeeting.isPending || confirmMeeting.isPending || suggestChange.isPending ||
    completeProbation.isPending;

  const dialogTitles: Partial<Record<ActionType, string>> = {
    "self-evaluate":    t("actionDialog.selfEvaluate"),
    approve:            t("actionDialog.approve"),
    reject:             t("actionDialog.reject"),
    document:           t("actionDialog.document"),
    "hr-reject":        t("actionDialog.hrReject"),
    ceo:                t("actionDialog.ceo"),
    "propose-meeting":  t("actionDialog.proposeMeeting"),
    "confirm-employee":       "تأكيد الموعد كموظف",
    "confirm-direct-manager": "تأكيد الموعد كمدير مباشر",
    "suggest-meeting-change": "اقتراح تغيير موعد الاجتماع",
    complete:           "إغلاق التقييم ورفع وثيقة القرار",
  };

  const isConfirmDisabled =
    isActionLoading ||
    (actionType === "reject" && !actionNotes.trim()) ||
    (actionType === "hr-reject" && !actionNotes.trim()) ||
    (actionType === "approve" && (!overallRating || !recommendation)) ||
    (actionType === "ceo" && !recommendation) ||
    (actionType === "propose-meeting" && !meetingDate) ||
    (actionType === "suggest-meeting-change" && !actionNotes.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {ev.employee ? `${ev.employee.firstNameAr} ${ev.employee.lastNameAr}` : t("detail.defaultTitle")}
          </h1>
          {ev.employee && <p className="text-sm text-muted-foreground">{ev.employee.employeeNumber}</p>}
        </div>
        <Badge className={`text-xs ${STATUS_CLASSES[ev.status as ProbationStatus]}`}>
          {t(`status.${ev.status}`)}
        </Badge>
      </div>

      {/* Status Banner */}
      <StatusBanner
        status={ev.status as ProbationStatus}
        canSeniorApprove={canSeniorApprove}
        canHrDocument={canHrDocument}
        canCeoDecide={canCeoDecide}
        onAction={openAction}
        t={t}
      />

      {/* Workflow Stepper */}
      <Card>
        <CardContent className="py-4 overflow-x-auto">
          <WorkflowStepper status={ev.status} t={t} />
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("detail.hireDate")}</p>
          <p className="font-medium mt-0.5">{ev.hireDate ? new Date(ev.hireDate).toLocaleDateString() : "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("detail.probationEnd")}</p>
          <p className="font-medium mt-0.5">{ev.probationEndDate ? new Date(ev.probationEndDate).toLocaleDateString() : "—"}</p>
        </div>
        {ev.workAreasNote && (
          <div className="rounded-lg border p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">{t("detail.workAreas")}</p>
            <p className="font-medium mt-0.5 text-sm">{ev.workAreasNote}</p>
          </div>
        )}
      </div>

      {/* Meeting info */}
      {(ev.meetingProposedAt || ev.confirmedMeetingDate || ev.status === "PENDING_MEETING_SCHEDULE") && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <CalendarClock className="h-4 w-4" />
              {t("detail.meetingSchedule")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ev.meetingProposedAt && (
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.proposedDate")}</p>
                <p className="font-medium">{new Date(ev.meetingProposedAt).toLocaleString()}</p>
              </div>
            )}
            {ev.confirmedMeetingDate && (
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.confirmedDate")}</p>
                <p className="font-medium text-green-700">{new Date(ev.confirmedMeetingDate).toLocaleString()}</p>
              </div>
            )}
            {/* Scheduling needs the employee and the direct manager only. */}
            <div className="flex gap-4 text-xs text-muted-foreground sm:col-span-2">
              <span>موظف: {ev.meetingConfirmedByEmployee ? "✓ مؤكد" : "⏳ بانتظار"}</span>
              <span>مدير مباشر: {ev.meetingConfirmedByManager ? "✓ مؤكد" : "⏳ بانتظار"}</span>
            </div>
            {ev.meetingRescheduleNote && (
              <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-medium">طلب المدير المباشر تغيير الموعد: </span>
                {ev.meetingRescheduleNote}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scores table */}
      {evScores.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("detail.criteriaResults")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {evScores
                .slice()
                .sort((a: any, b: any) => (a.criteria?.displayOrder ?? 99) - (b.criteria?.displayOrder ?? 99))
                .map((s: any) => (
                  <div key={s.criteriaId} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-3">
                    <span className="text-sm flex-1">{s.criteria?.nameAr || s.criteriaId}</span>
                    <div className="flex gap-4 text-xs shrink-0">
                      {s.selfScore != null && (
                        <span className="text-indigo-600">ذاتي: <strong>{s.selfScore}</strong> — {PROBATION_SCORE_LABELS[s.selfScore]}</span>
                      )}
                      {s.score != null && (
                        <span className="text-blue-700">مدير: <strong>{s.score}</strong> — {PROBATION_SCORE_LABELS[s.score]}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(ev.employeeNotes || ev.evaluatorNotes) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("detail.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ev.employeeNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("detail.selfEvaluationNotes")}</p>
                <p className="rounded-lg bg-muted/50 p-2">{ev.employeeNotes}</p>
              </div>
            )}
            {ev.evaluatorNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("detail.evaluatorNotes")}</p>
                <p className="rounded-lg bg-muted/50 p-2">{ev.evaluatorNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final score percentages */}
      <FinalScoreCard
        finalScorePercent={ev.finalScorePercent}
        managerScorePercent={ev.managerScorePercent}
        selfScorePercent={ev.selfScorePercent}
        managerWeight={ev.managerWeight}
        selfWeight={ev.selfWeight}
        scores={evScores}
      />

      {/* Final result */}
      {(ev.overallRating || ev.finalRecommendation) && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">{t("detail.finalResult")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ev.overallRating && (
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.overallRating")}</p>
                <p className="font-bold text-lg">{ev.overallRating} — {PROBATION_SCORE_LABELS[ev.overallRating]}</p>
              </div>
            )}
            {ev.finalRecommendation && (
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.finalRecommendation")}</p>
                <p className="font-bold text-lg">
                  {PROBATION_RECOMMENDATION_OPTIONS.find(o => o.value === ev.finalRecommendation)?.labelAr || ev.finalRecommendation}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Employee record snapshot — shown after evaluation is closed */}
      {ev.status === "COMPLETED" && employeeRecord && (
        <Card className="border-green-200 bg-green-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              سجل الموظف بعد الإغلاق
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">نتيجة التقييم</p>
              <p className="font-medium mt-0.5">
                {ev.finalRecommendation
                  ? (PROBATION_RECOMMENDATION_OPTIONS.find((o: any) => o.value === ev.finalRecommendation)?.labelAr || ev.finalRecommendation)
                  : "—"}
              </p>
            </div>
            {ev.finalScorePercent != null && (
              <div>
                <p className="text-xs text-muted-foreground">النسبة النهائية</p>
                <p className={`font-bold text-xl mt-0.5 ${
                  ev.finalScorePercent >= 70 ? "text-green-700" :
                  ev.finalScorePercent >= 50 ? "text-amber-600" : "text-red-600"
                }`}>
                  {ev.finalScorePercent.toFixed(1)}%
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">تاريخ الإغلاق</p>
              <p className="font-medium mt-0.5">
                {ev.updatedAt
                  ? new Date(ev.updatedAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">حالة التوظيف</p>
              <p className="font-medium mt-0.5">
                {employeeRecord?.employmentStatus === "ACTIVE"     && "نشط ✓"}
                {employeeRecord?.employmentStatus === "TERMINATED"  && "منتهية الخدمة"}
                {employeeRecord?.employmentStatus !== "ACTIVE" && employeeRecord?.employmentStatus !== "TERMINATED" && (employeeRecord?.employmentStatus || "—")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Actions — مخفي عند الاطلاع من تاب "جميع التقييمات" إلا للـ super admin */}
      {(!isReadonly || isAdmin()) && <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("detail.availableActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {ev.status === "COMPLETED" ? (
            <p className="text-sm text-muted-foreground text-center py-2">{t("detail.completed")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ev.status === "DRAFT" && (
                <p className="text-sm text-muted-foreground">{t("detail.draftNote")}</p>
              )}
              {ev.status === "PENDING_SELF_EVALUATION" && (
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => openAction("self-evaluate")}>
                  <ClipboardEdit className="h-4 w-4" />{t("actions.selfEvaluate")}
                </Button>
              )}
              {ev.status === "PENDING_SENIOR_MANAGER" && canSeniorApprove && (
                <>
                  <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => openAction("approve")}>
                    <CheckCircle2 className="h-4 w-4" />{t("actions.approve")}
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => openAction("reject")}>
                    <XCircle className="h-4 w-4" />{t("actions.reject")}
                  </Button>
                </>
              )}
              {ev.status === "PENDING_HR" && canHrDocument && (
                <>
                  <Button className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => openAction("document")}>
                    <FileCheck className="h-4 w-4" />{t("actions.document")}
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => openAction("hr-reject")}>
                    <XCircle className="h-4 w-4" />{t("actions.hrReject")}
                  </Button>
                </>
              )}
              {ev.status === "PENDING_CEO" && canCeoDecide && (
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={() => openAction("ceo")}>
                  <Gavel className="h-4 w-4" />{t("actions.ceoDecide")}
                </Button>
              )}
              {ev.status === "PENDING_MEETING_SCHEDULE" && (
                <>
                  {/* HR owns the date for the whole scheduling stage: sets it,
                      re-sets it after a reschedule request, and can still change
                      it while the confirmations are outstanding. */}
                  {!ev.meetingConfirmedAt && canHrDocument && (!canCeoDecide || isAdmin()) && (
                    <Button className="gap-2 bg-orange-600 hover:bg-orange-700" onClick={() => openAction("propose-meeting")}>
                      <CalendarClock className="h-4 w-4" />
                      {ev.meetingRescheduleNote
                        ? "تحديد موعد جديد"
                        : ev.meetingProposedAt
                          ? "تعديل الموعد"
                          : t("actions.proposeMeeting")}
                    </Button>
                  )}
                  {/* Confirmation is for the employee and the direct manager only;
                      it is hidden while a reschedule request is waiting on HR. */}
                  {ev.meetingProposedAt && !ev.meetingRescheduleNote && isPendingForMe && (() => {
                    const isEmployee = user?.employeeId === ev.employeeId
                      || (!canSeniorApprove && !ev.meetingConfirmedByEmployee);
                    const isManager = !isEmployee && !ev.meetingConfirmedByManager;
                    const myRole =
                      isEmployee && !ev.meetingConfirmedByEmployee ? "confirm-employee" :
                      isManager ? "confirm-direct-manager" :
                      null;
                    if (!myRole) return null;
                    return (
                      <>
                        <Button className="gap-2 bg-teal-600 hover:bg-teal-700" onClick={() => openAction(myRole)}>
                          <CalendarCheck className="h-4 w-4" />
                          {isManager ? "موافقة على الموعد" : "تأكيد الموعد"}
                        </Button>
                        {isManager && (
                          <Button variant="outline" className="gap-2" onClick={() => openAction("suggest-meeting-change")}>
                            <CalendarClock className="h-4 w-4" />اقتراح تغيير الموعد
                          </Button>
                        )}
                      </>
                    );
                  })()}
                  {/* إغلاق التقييم: بعد تأكيد الموظف + المدير المباشر (يكفي) */}
                  {(ev.confirmedMeetingDate || ev.meetingConfirmedAt || (ev.meetingConfirmedByEmployee && ev.meetingConfirmedByManager)) && canHrDocument && (!canCeoDecide || isAdmin()) && (
                    <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => openAction("complete")}>
                      <FileCheck className="h-4 w-4" />إغلاق التقييم
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>}

      {/* History */}
      {hist.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              {t("detail.historyLog")}
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
                        {t(`historyActions.${h.action}`, { defaultValue: h.action })}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString()}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{actionType ? dialogTitles[actionType] : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Self-evaluate: selfScore per criterion */}
            {actionType === "self-evaluate" && (
              evScores.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{t("form.criteriaScoring")}</p>
                  <div className="space-y-2">
                    {evScores
                      .slice()
                      .sort((a: any, b: any) => (a.criteria?.displayOrder ?? 99) - (b.criteria?.displayOrder ?? 99))
                      .map((s: any) => (
                        <div key={s.criteriaId} className="flex items-center justify-between gap-2">
                          <Label className="text-xs flex-1">{s.criteria?.nameAr || s.criteriaId}</Label>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ScoreInput
                              value={scoreMap[s.criteriaId] || ""}
                              onChange={(v) => setScoreMap((p) => ({ ...p, [s.criteriaId]: v }))}
                            />
                            {scoreMap[s.criteriaId] >= 1 && (
                              <span className="text-xs text-muted-foreground w-16">
                                {PROBATION_SCORE_LABELS[scoreMap[s.criteriaId]]}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  لم يتم تحميل معايير التقييم. يرجى إعادة تحميل الصفحة، أو التواصل مع المسؤول للتأكد من إعداد المعايير.
                </div>
              )
            )}

            {/* Senior approve: overallRating + recommendation + score per criterion */}
            {actionType === "approve" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("actionDialog.overallRating")} * (1–5)</Label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={overallRating}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setOverallRating((v >= 1 && v <= 5) ? v : "");
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                    {overallRating && (
                      <p className="text-xs text-muted-foreground">{PROBATION_SCORE_LABELS[overallRating as number]}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("actionDialog.recommendation")} *</Label>
                    <Select value={recommendation} onValueChange={(v) => setRecommendation(v as ProbationRecommendation)}>
                      <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                      <SelectContent>
                        {PROBATION_RECOMMENDATION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.labelAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {evScores.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-medium">{t("form.criteriaScoring")}</p>
                    <div className="space-y-2">
                      {evScores
                        .slice()
                        .sort((a: any, b: any) => (a.criteria?.displayOrder ?? 99) - (b.criteria?.displayOrder ?? 99))
                        .map((s: any) => (
                          <div key={s.criteriaId} className="flex items-center justify-between gap-2">
                            <Label className="text-xs flex-1">{s.criteria?.nameAr || s.criteriaId}</Label>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <ScoreInput
                                value={scoreMap[s.criteriaId] || ""}
                                onChange={(v) => setScoreMap((p) => ({ ...p, [s.criteriaId]: v }))}
                              />
                              {scoreMap[s.criteriaId] >= 1 && (
                                <span className="text-xs text-muted-foreground w-16">
                                  {PROBATION_SCORE_LABELS[scoreMap[s.criteriaId]]}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CEO: recommendation only */}
            {actionType === "ceo" && (
              <div className="space-y-1.5">
                <Label>{t("actionDialog.recommendation")} *</Label>
                <Select value={recommendation} onValueChange={(v) => setRecommendation(v as ProbationRecommendation)}>
                  <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                  <SelectContent>
                    {PROBATION_RECOMMENDATION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.labelAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Propose meeting */}
            {actionType === "propose-meeting" && (
              <div className="space-y-1.5">
                <Label>{t("actionDialog.proposedDate")} *</Label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* Complete */}
            {actionType === "complete" && (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
                سيتم إغلاق التقييم وتحديث سجل الموظف تلقائياً بناءً على نتيجة التقييم.
              </p>
            )}

            {/* Notes */}
            {!["propose-meeting", "confirm-employee", "confirm-direct-manager", "complete"].includes(actionType ?? "") && (
              <div className="space-y-1.5">
                <Label>
                  {actionType === "reject" || actionType === "hr-reject"
                    ? t("actionDialog.notesRequired")
                    : t("actionDialog.notesOptional")}
                </Label>
                <Textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionType === "reject" || actionType === "hr-reject"
                      ? t("actionDialog.rejectionReason")
                      : t("actionDialog.notesPlaceholder")
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button
              onClick={handleActionSubmit}
              disabled={isConfirmDisabled}
              className={actionType === "reject" || actionType === "hr-reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {t("actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
