"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight, CheckCircle2, XCircle, Send, FileCheck,
  Gavel, UserCheck, History,
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
import {
  ProbationStatus, ProbationScore, ProbationRecommendation, WorkflowActionData,
} from "@/lib/api/probation-evaluations";
import { usePermissions } from "@/lib/hooks/use-permissions";

const STATUS_CLASSES: Record<ProbationStatus, string> = {
  DRAFT:                           "bg-gray-100 text-gray-600",
  PENDING_SENIOR_MANAGER:          "bg-blue-100 text-blue-700",
  PENDING_HR:                      "bg-purple-100 text-purple-700",
  PENDING_CEO:                     "bg-amber-100 text-amber-700",
  PENDING_EMPLOYEE_ACKNOWLEDGMENT: "bg-cyan-100 text-cyan-700",
  COMPLETED:                       "bg-green-100 text-green-700",
  REJECTED_BY_SENIOR:              "bg-red-100 text-red-700",
  REJECTED_BY_HR:                  "bg-red-100 text-red-700",
  REJECTED_BY_CEO:                 "bg-red-100 text-red-700",
};

const SCORE_VALUES: ProbationScore[] = ["UNACCEPTABLE", "ACCEPTABLE", "GOOD", "VERY_GOOD", "EXCELLENT"];
const RECOMMENDATION_VALUES: ProbationRecommendation[] = ["CONFIRM_POSITION", "EXTEND_PROBATION", "TRANSFER_POSITION", "TERMINATE"];

const WORKFLOW_STATUSES: ProbationStatus[] = [
  "DRAFT", "PENDING_SENIOR_MANAGER", "PENDING_HR", "PENDING_CEO", "PENDING_EMPLOYEE_ACKNOWLEDGMENT", "COMPLETED",
];

function WorkflowStepper({ status, t }: { status: ProbationStatus; t: any }) {
  const isRejected = status.startsWith("REJECTED");
  const currentIdx = WORKFLOW_STATUSES.findIndex((s) => s === status);
  const activeIdx = isRejected ? -1 : currentIdx;

  return (
    <div className="flex items-center gap-0">
      {WORKFLOW_STATUSES.map((step, i) => {
        const done = activeIdx > i;
        const active = activeIdx === i;
        return (
          <div key={step} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${i < WORKFLOW_STATUSES.length - 1 ? "w-24 sm:w-32" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isRejected ? "bg-red-100 text-red-500" :
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary border-2 border-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs text-center text-muted-foreground leading-tight hidden sm:block">
                {t(`workflow.${step}`)}
              </span>
            </div>
            {i < WORKFLOW_STATUSES.length - 1 && (
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
  const t = useTranslations("probationEvaluations");
  const tCommon = useTranslations("common");

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
  const { hasRole, hasAnyPermission, isAdmin } = usePermissions();

  // Frontend-only role guard (backend doesn't enforce permissions on these endpoints yet)
  const canSeniorApprove = isAdmin() || hasRole("senior_manager") || hasRole("manager") || hasAnyPermission(["probation:approve", "probation:*"]);
  const canHrDocument = isAdmin() || hasRole("hr") || hasRole("hr_manager") || hasAnyPermission(["probation:hr-document", "probation:*", "hr:*"]);
  const canCeoDecide = isAdmin() || hasRole("ceo") || hasRole("general_manager") || hasAnyPermission(["probation:ceo-decide", "probation:*"]);

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

  function openAction(type: typeof actionType) {
    setActionType(type);
    setActionForm({});
    setActionDialogOpen(true);
  }

  async function handleActionSubmit() {
    const payload: WorkflowActionData = actionForm;
    const opts = { id, data: payload };
    switch (actionType) {
      case "submit":      await submit.mutateAsync(opts); break;
      case "approve":     await seniorApprove.mutateAsync(opts); break;
      case "reject":      await seniorReject.mutateAsync(opts); break;
      case "document":    await hrDocument.mutateAsync(opts); break;
      case "hr-reject":   await hrReject.mutateAsync(opts); break;
      case "ceo":         await ceoDecide.mutateAsync(opts); break;
      case "acknowledge": await employeeAcknowledge.mutateAsync(opts); break;
    }
    setActionDialogOpen(false);
  }

  const isActionLoading = submit.isPending || seniorApprove.isPending || seniorReject.isPending ||
    hrDocument.isPending || hrReject.isPending || ceoDecide.isPending || employeeAcknowledge.isPending;

  const getActionDialogTitle = () => {
    const map: Record<string, string> = {
      submit: t("actionDialog.submit"),
      approve: t("actionDialog.approve"),
      reject: t("actionDialog.reject"),
      document: t("actionDialog.document"),
      "hr-reject": t("actionDialog.hrReject"),
      ceo: t("actionDialog.ceo"),
      acknowledge: t("actionDialog.acknowledge"),
    };
    return actionType ? map[actionType] : "";
  };

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

      {/* Workflow Stepper */}
      <Card>
        <CardContent className="py-4 overflow-x-auto">
          <WorkflowStepper status={ev.status} t={t} />
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("detail.hireDate")}</p>
          <p className="font-medium mt-0.5">{ev.hireDate ? new Date(ev.hireDate).toLocaleDateString() : "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("detail.probationEnd")}</p>
          <p className="font-medium mt-0.5">{ev.probationEndDate ? new Date(ev.probationEndDate).toLocaleDateString() : "—"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("detail.evaluationDate")}</p>
          <p className="font-medium mt-0.5">{ev.evaluationDate ? new Date(ev.evaluationDate).toLocaleDateString() : "—"}</p>
        </div>
        {ev.workAreasNote && (
          <div className="rounded-lg border p-3 sm:col-span-3">
            <p className="text-xs text-muted-foreground">{t("detail.workAreas")}</p>
            <p className="font-medium mt-0.5 text-sm">{ev.workAreasNote}</p>
          </div>
        )}
      </div>

      {/* Scores */}
      {ev.scores?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("detail.criteriaResults")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ev.scores.map((s: any) => (
                <div key={s.criteriaId} className="flex items-center justify-between rounded-lg border p-2.5">
                  <span className="text-sm">{s.criteria?.nameAr || s.criteriaId}</span>
                  <Badge variant="secondary" className="text-xs">
                    {t(`scores.${s.score}`)}
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
            <CardTitle className="text-base text-primary">{t("detail.finalResult")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ev.overallRating && (
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.overallRating")}</p>
                <p className="font-bold text-lg">{t(`scores.${ev.overallRating}`)}</p>
              </div>
            )}
            {ev.finalRecommendation && (
              <div>
                <p className="text-xs text-muted-foreground">{t("detail.finalRecommendation")}</p>
                <p className="font-bold text-lg">{t(`recommendations.${ev.finalRecommendation}`)}</p>
              </div>
            )}
            {ev.employeeAcknowledged && (
              <div className="sm:col-span-2 flex items-center gap-2 text-green-600">
                <UserCheck className="h-4 w-4" />
                <span className="text-sm font-medium">{t("detail.employeeAcknowledged")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workflow Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("detail.availableActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {ev.status === "COMPLETED" ? (
            <p className="text-sm text-muted-foreground text-center py-2">{t("detail.completed")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ev.status === "DRAFT" && (
                <Button className="gap-2" onClick={() => openAction("submit")}>
                  <Send className="h-4 w-4" />{t("actions.submit")}
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
              {ev.status === "PENDING_EMPLOYEE_ACKNOWLEDGMENT" && (
                <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => openAction("acknowledge")}>
                  <UserCheck className="h-4 w-4" />{t("actions.acknowledge")}
                </Button>
              )}
              {ev.status.startsWith("REJECTED") && (
                <Button className="gap-2" onClick={() => openAction("submit")}>
                  <Send className="h-4 w-4" />{t("actions.resubmit")}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getActionDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(actionType === "approve" || actionType === "ceo") && (
              <div className="space-y-1.5">
                <Label>{t("actionDialog.overallRating")}</Label>
                <Select
                  value={actionForm.overallRating || "none"}
                  onValueChange={(v) => setActionForm({ ...actionForm, overallRating: v === "none" ? undefined : v as ProbationScore })}
                >
                  <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {SCORE_VALUES.map((sv) => (
                      <SelectItem key={sv} value={sv}>{t(`scores.${sv}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionType === "ceo" && (
              <div className="space-y-1.5">
                <Label>{t("actionDialog.recommendation")} *</Label>
                <Select
                  value={actionForm.recommendation || "none"}
                  onValueChange={(v) => setActionForm({ ...actionForm, recommendation: v === "none" ? undefined : v as ProbationRecommendation })}
                >
                  <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {RECOMMENDATION_VALUES.map((rv) => (
                      <SelectItem key={rv} value={rv}>{t(`recommendations.${rv}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                {actionType?.includes("reject") ? t("actionDialog.notesRequired") : t("actionDialog.notesOptional")}
              </Label>
              <Textarea
                rows={3}
                value={actionForm.notes || ""}
                onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                placeholder={actionType?.includes("reject") ? t("actionDialog.rejectionReason") : t("actionDialog.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button
              onClick={handleActionSubmit}
              disabled={
                isActionLoading ||
                (actionType?.includes("reject") && !actionForm.notes?.trim()) ||
                (actionType === "ceo" && !actionForm.recommendation)
              }
              className={actionType?.includes("reject") ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {t("actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
