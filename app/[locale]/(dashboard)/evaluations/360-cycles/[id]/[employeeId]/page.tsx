"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Download, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BonusTierBadge,
  PercentCell,
  TaskStatusBadge,
  formatNumber,
} from "@/components/appraisal/appraisal-ui";
import {
  appraisalErrorMessage,
  useAppraisalEmployeeResult,
  useAppraisalQuestions,
  useDownloadAchievementFile,
} from "@/lib/hooks/use-appraisal";
import { ANONYMOUS_AXES, APPRAISAL_AXES, AppraisalAxis, EmployeeAppraisalResult } from "@/lib/api/appraisal";
import { PERMISSIONS } from "@/lib/permissions/catalog";

const PERCENT_FIELD: Record<AppraisalAxis, keyof EmployeeAppraisalResult> = {
  MANAGER: "managerPercent",
  CUSTOMER: "customerPercent",
  PEER: "peerPercent",
  UPWARD: "upwardPercent",
  COMMITMENT: "commitmentPercent",
  SELF: "selfPercent",
};

export default function AppraisalEmployeeResultPage() {
  return (
    <PageGuard permission={PERMISSIONS.APPRAISAL.MANAGE}>
      <EmployeeResultContent />
    </PageGuard>
  );
}

function EmployeeResultContent() {
  const t = useTranslations("appraisal");
  const router = useRouter();
  const { id, employeeId } = useParams<{ id: string; employeeId: string }>();
  const { data, isLoading, error } = useAppraisalEmployeeResult(id, employeeId);
  const { data: questions = [] } = useAppraisalQuestions();
  const download = useDownloadAchievementFile();

  const questionById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const back = (
    <Button variant="ghost" onClick={() => router.push(`/evaluations/360-cycles/${id}`)}>
      <ArrowRight className="me-2 h-4 w-4 ltr:rotate-180" />
      {t("detail.backToResults")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {back}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {appraisalErrorMessage(error, t("detail.noResults"))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { result, submissions } = data;
  const employee = result.details?.employee;
  const hasSelfSubmission = submissions.some((s) => s.axis === "SELF");

  return (
    <div className="space-y-4">
      {back}

      <PageHeader
        title={result.employeeName}
        description={[employee?.departmentName, employee?.jobTitleName, employee?.gradeCode].filter(Boolean).join(" · ")}
        actions={
          hasSelfSubmission ? (
            <Button
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => download.mutate({ cycleId: id, employeeId })}
            >
              <Download className="me-2 h-4 w-4" />
              {t("form.downloadEmployeeAchievements")}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-8 py-5">
          <div>
            <p className="text-sm text-muted-foreground">{t("result.finalScore")}</p>
            <p className="text-3xl font-extrabold tabular-nums">
              {result.finalScore === null ? "—" : formatNumber(result.finalScore)}
              <span className="text-base font-normal text-muted-foreground"> / 100</span>
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{t("result.bonusTier")}</p>
            <BonusTierBadge tier={result.bonusTier} />
          </div>
          {result.missingAxes?.length > 0 && (
            <p className="text-sm text-amber-700">
              {t("detail.waitingFor", { axes: result.missingAxes.map((a) => t(`axis.${a}`)).join(" / ") })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("detail.axesBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("result.axis")}</TableHead>
                <TableHead>{t("result.percent")}</TableHead>
                <TableHead>{t("result.weight")}</TableHead>
                <TableHead>{t("result.contribution")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {APPRAISAL_AXES.map((axis) => {
                const percent = result[PERCENT_FIELD[axis]] as number | null;
                const weight = result.appliedWeights?.[axis] ?? 0;
                const applicable = percent !== null && weight > 0;
                return (
                  <TableRow key={axis}>
                    <TableCell className="font-medium">
                      {t(`axis.${axis}`)}
                      {axis === "PEER" && (
                        <span className="ms-1 text-xs text-muted-foreground">({t("result.raters", { count: result.peerCount })})</span>
                      )}
                      {axis === "UPWARD" && (
                        <span className="ms-1 text-xs text-muted-foreground">({t("result.raters", { count: result.upwardCount })})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PercentCell value={applicable ? percent : null} />
                    </TableCell>
                    <TableCell className="tabular-nums">{applicable ? `${formatNumber(weight)}%` : "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {applicable ? formatNumber(((percent as number) * weight) / 100) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailsCard title={t("detail.customerDetails")} details={result.details?.customer} />
        <DetailsCard title={t("detail.commitmentDetails")} details={result.details?.commitment} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("detail.submissions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground">{t("detail.noSubmissions")}</p>
          ) : (
            submissions.map((s) => {
              const anonymous = ANONYMOUS_AXES.includes(s.axis);
              return (
                <div key={s.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t(`axis.${s.axis}`)}</span>
                      <span className="text-sm text-muted-foreground">—</span>
                      {s.evaluatorName ? (
                        <span className="text-sm">{s.evaluatorName}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          {anonymous && <EyeOff className="h-3.5 w-3.5" />}
                          {anonymous ? t("detail.anonymousRater") : "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(s.percent ?? s.score) != null && (
                        <span className="text-sm font-semibold tabular-nums">
                          {s.percent != null ? `${formatNumber(s.percent)}%` : formatNumber(s.score)}
                        </span>
                      )}
                      <TaskStatusBadge status={s.status} />
                    </div>
                  </div>
                  {s.answers && s.answers.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {[...s.answers]
                        .sort(
                          (a, b) =>
                            (questionById.get(a.questionId)?.displayOrder ?? 0) -
                            (questionById.get(b.questionId)?.displayOrder ?? 0),
                        )
                        .map((a) => {
                          const q = questionById.get(a.questionId);
                          return (
                            <li key={a.questionId} className="flex justify-between gap-4">
                              <span className="text-muted-foreground">{q?.textAr ?? a.questionId}</span>
                              <span className="shrink-0 tabular-nums">
                                {a.score}
                                {q ? ` / ${q.maxScore}` : ""}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                  {s.achievementNote && (
                    <p className="mt-3 text-sm">
                      <span className="font-medium">{t("form.achievementNote")}: </span>
                      {s.achievementNote}
                    </p>
                  )}
                  {s.comments && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">{t("form.comments")}: </span>
                      {s.comments}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** تفاصيل آلية (رضا العملاء / الالتزام) — شكلها يحدده الباك، فتُعرض كمفتاح/قيمة. */
function DetailsCard({ title, details }: { title: string; details?: Record<string, unknown> }) {
  const t = useTranslations("appraisal");
  const entries = details ? flatten(details) : [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <dl className="space-y-1 text-sm">
            {entries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.has(`detailKeys.${key}`) ? t(`detailKeys.${key}`) : key}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function flatten(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]): [string, string][] => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return flatten(value as Record<string, unknown>, path);
    }
    const display =
      value === null || value === undefined
        ? "—"
        : typeof value === "number"
          ? formatNumber(value)
          : Array.isArray(value)
            ? value.join("، ")
            : String(value);
    return [[path, display]];
  });
}
