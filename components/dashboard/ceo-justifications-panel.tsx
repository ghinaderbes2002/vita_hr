"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceJustification } from "@/lib/api/attendance-justifications";
import {
  useManagerReviewJustification, useMyTeamJustifications,
} from "@/lib/hooks/use-attendance-justifications";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatDate } from "@/lib/utils/date";

const LIMIT = 5;

/**
 * The justifications waiting on the CEO's signature, reviewable from the
 * dashboard. The CEO reviews as a direct manager, so this is the team list
 * at the PENDING_MANAGER step only, same as the full justifications screen.
 */
export function CeoJustificationsPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canReview = hasPermission("attendance.justifications.manager-review");

  const { data, isLoading } = useMyTeamJustifications({ status: "PENDING_MANAGER", page: 1, limit: LIMIT });
  const review = useManagerReviewJustification();

  const [target, setTarget] = useState<AttendanceJustification | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");

  const items: AttendanceJustification[] = data?.items || data?.data?.items || data?.data || [];
  const total: number = data?.total ?? data?.data?.total ?? items.length;

  const openReview = (item: AttendanceJustification, dec: "APPROVE" | "REJECT") => {
    setTarget(item);
    setDecision(dec);
    setNotes("");
  };

  const submit = async () => {
    if (!target) return;
    await review.mutateAsync({ id: target.id, data: { decision, notesAr: notes, notes } });
    setTarget(null);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          {t("attendance.justificationsTitle")}
          {total > 0 && <Badge variant="secondary" className="text-xs tabular-nums">{total}</Badge>}
        </CardTitle>
        {total > LIMIT && (
          <button
            type="button"
            onClick={() => router.push(`/${locale}/attendance/justifications`)}
            className="text-xs text-primary hover:underline"
          >
            {t("dashboard.ceo.viewAll")}
          </button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 py-2.5 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/attendance/justifications/${item.id}`)}
                  className="block w-full rounded text-start hover:bg-muted/50"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {item.employee?.firstNameAr} {item.employee?.lastNameAr}
                    </span>
                    {item.alert?.date && (
                      <span className="text-xs text-muted-foreground">{formatDate(item.alert.date)}</span>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.descriptionAr}</span>
                </button>
                {canReview && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => openReview(item, "APPROVE")}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("requests.actions.approve")}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={() => openReview(item, "REJECT")}>
                      <XCircle className="h-3.5 w-3.5" />
                      {t("requests.actions.reject")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pr-6 text-start sm:text-start">
            <DialogTitle>
              {decision === "REJECT" ? t("attendance.rejectJustification") : t("attendance.approveJustification")}
            </DialogTitle>
            <DialogDescription>{target?.descriptionAr}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("attendance.reviewNotesLabel")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("attendance.reviewNotesPlaceholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>{t("common.cancel")}</Button>
            <Button
              variant={decision === "REJECT" ? "destructive" : "default"}
              onClick={submit}
              disabled={review.isPending}
            >
              {review.isPending
                ? t("attendance.submitting")
                : decision === "REJECT" ? t("requests.actions.reject") : t("requests.actions.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
