"use client";

// One attendance justification in full: the alert it answers, what the employee
// wrote, the attachment, and every review step — plus the review actions, so a
// reviewer never has to go back to the list to act.
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  useJustification,
  useManagerReviewJustification,
  useHrReviewJustification,
} from "@/lib/hooks/use-attendance-justifications";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatDate } from "@/lib/utils/date";

const STATUS_CLASSES: Record<string, string> = {
  PENDING_MANAGER: "bg-yellow-100 text-yellow-800",
  PENDING_HR:      "bg-orange-100 text-orange-800",
  HR_APPROVED:     "bg-green-100 text-green-800",
  HR_REJECTED:     "bg-red-100 text-red-800",
  AUTO_REJECTED:   "bg-red-100 text-red-800",
};

const toCamelCase = (s: string) =>
  s.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

type StepOutcome = "APPROVE" | "REJECT" | null;

/**
 * The API does not send a decision per step — only the timestamps and the
 * overall status. A step's outcome is read back from that status, and stays
 * null when it cannot be known, so a reviewed step is never labelled a
 * rejection just because no decision field arrived.
 */
function stepOutcome(
  step: "manager" | "hr",
  status: string,
  declared?: "APPROVE" | "REJECT",
): StepOutcome {
  if (declared) return declared;
  if (step === "manager") {
    // Reaching any HR stage means the manager let it through.
    if (["PENDING_HR", "MANAGER_APPROVED", "HR_APPROVED", "HR_REJECTED"].includes(status)) return "APPROVE";
    if (status === "MANAGER_REJECTED") return "REJECT";
    return null;
  }
  if (status === "HR_APPROVED") return "APPROVE";
  if (status === "HR_REJECTED") return "REJECT";
  return null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="text-end text-sm font-medium">{children}</div>
    </div>
  );
}

function ReviewStep({
  title, reviewedAt, outcome, notes,
}: {
  title: string;
  reviewedAt?: string;
  outcome: StepOutcome;
  notes?: string;
}) {
  const t = useTranslations();
  return (
    <div>
      <p className="font-medium">{title}</p>
      {reviewedAt ? (
        <>
          <p className="text-xs text-muted-foreground">{formatDate(reviewedAt)}</p>
          <Badge
            variant="outline"
            className={`mt-1 text-[10px] ${
              outcome === "APPROVE"
                ? "border-green-300 text-green-700"
                : outcome === "REJECT"
                  ? "border-red-300 text-red-700"
                  : ""
            }`}
          >
            {outcome === "APPROVE"
              ? t("requests.actions.approve")
              : outcome === "REJECT"
                ? t("requests.actions.reject")
                : t("attendance.justificationReviewed")}
          </Badge>
          {notes && <p className="mt-1 text-xs">{notes}</p>}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">—</p>
      )}
    </div>
  );
}

export default function JustificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { hasPermission } = usePermissions();

  const { data: item, isLoading } = useJustification(id);
  const managerReview = useManagerReviewJustification();
  const hrReview = useHrReviewJustification();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewType, setReviewType] = useState<"manager" | "hr">("manager");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");

  const canManagerReview = hasPermission("attendance.justifications.manager-review");
  const canHrReview = hasPermission("attendance.justifications.hr-review");

  const openReview = (type: "manager" | "hr", dec: "APPROVE" | "REJECT") => {
    setReviewType(type);
    setDecision(dec);
    setNotes("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    const payload = { id, data: { decision, notesAr: notes, notes } };
    if (reviewType === "manager") await managerReview.mutateAsync(payload);
    else await hrReview.mutateAsync(payload);
    setReviewOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!item) {
    return <div className="py-20 text-center text-muted-foreground">{t("common.noData")}</div>;
  }

  const isPending = managerReview.isPending || hrReview.isPending;
  const employeeName = [item.employee?.firstNameAr, item.employee?.lastNameAr].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => router.push(`/${locale}/attendance/justifications`)}
      >
        <ArrowRight className="h-3.5 w-3.5" />
        {t("attendance.justificationsTitle")}
      </button>

      <PageHeader
        title={employeeName || t("attendance.justificationsTitle")}
        description={item.employee?.employeeNumber}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>{t("attendance.justificationTypeLabel")}</span>
              <Badge className={STATUS_CLASSES[item.status] || "bg-gray-100 text-gray-700"}>
                {t(`attendance.justificationStatuses.${toCamelCase(item.status)}` as any, { defaultValue: item.status })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Row label={t("attendance.justificationTypeLabel")}>
              {t(`attendance.justificationTypes.${toCamelCase(item.justificationType)}` as any, { defaultValue: item.justificationType })}
            </Row>
            <Row label={t("attendance.fields.date")}>
              {item.alert?.date ? formatDate(item.alert.date) : "—"}
            </Row>
            {item.alert?.messageAr && (
              <Row label={t("attendance.alertFields.message")}>{item.alert.messageAr}</Row>
            )}
            <div className="py-2">
              <p className="mb-1 text-sm text-muted-foreground">{t("attendance.alertFields.description")}</p>
              <p className="whitespace-pre-wrap text-sm">{item.descriptionAr || "—"}</p>
            </div>
            {item.attachmentUrl && (
              <Row label={t("attendance.justificationAttachment")}>
                <a
                  href={item.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {t("common.view")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Row>
            )}
            {item.deductionApplied && (
              <Row label={t("attendance.fields.lateMinutes")}>
                <span className="text-red-700">{item.deductionMinutes ?? 0}</span>
              </Row>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("attendance.justificationReviewSteps")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ReviewStep
              title={t("attendance.justificationStatuses.pendingManager")}
              reviewedAt={item.managerReviewedAt}
              outcome={stepOutcome("manager", item.status, item.managerDecision)}
              notes={item.managerNotesAr || item.managerNotes}
            />
            <Separator />
            <ReviewStep
              title={t("attendance.justificationStatuses.pendingHr")}
              reviewedAt={item.hrReviewedAt}
              outcome={stepOutcome("hr", item.status, item.hrDecision)}
              notes={item.hrNotesAr || item.hrNotes}
            />

            {((canManagerReview && item.status === "PENDING_MANAGER") ||
              (canHrReview && item.status === "PENDING_HR")) && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => openReview(item.status === "PENDING_MANAGER" ? "manager" : "hr", "APPROVE")}
                  >
                    <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                    {t("requests.actions.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openReview(item.status === "PENDING_MANAGER" ? "manager" : "hr", "REJECT")}
                  >
                    <XCircle className="ml-1 h-3.5 w-3.5" />
                    {t("requests.actions.reject")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "APPROVE" ? t("attendance.approveJustification") : t("attendance.rejectJustification")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t("attendance.alertFields.managerNotes")}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={decision === "APPROVE" ? "default" : "destructive"}
              onClick={submitReview}
              disabled={isPending}
            >
              {decision === "APPROVE" ? t("requests.actions.approve") : t("requests.actions.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
