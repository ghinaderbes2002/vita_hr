"use client";

import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyAppraisalResult, appraisalErrorMessage } from "@/lib/hooks/use-appraisal";
import { BonusTierBadge, PercentCell, formatNumber } from "./appraisal-ui";

/** نتيجة الموظف — تُستدعى فقط بعد FINALIZED (قبلها الخدمة ترجع 400). */
export function MyAppraisalResult({ cycleId }: { cycleId: string }) {
  const t = useTranslations("appraisal");
  const { data, isLoading, error } = useMyAppraisalResult(cycleId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {appraisalErrorMessage(error, t("result.notAvailable"))}
        </CardContent>
      </Card>
    );
  }

  const deductions = data.commitment?.deductions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-amber-500" />
          {t("result.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-sm text-muted-foreground">{t("result.finalScore")}</p>
            <p className="text-4xl font-extrabold tabular-nums">
              {data.finalScore === null ? "—" : formatNumber(data.finalScore)}
              <span className="text-lg font-normal text-muted-foreground"> / 100</span>
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{t("result.bonusTier")}</p>
            <BonusTierBadge tier={data.bonusTier} />
          </div>
        </div>

        {data.missingAxes?.length > 0 && (
          <p className="text-sm text-amber-700">
            {t("result.missing")}: {data.missingAxes.map((a) => t(`axis.${a}`)).join("، ")}
          </p>
        )}

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
            {data.axes.map((axis) => {
              const applicable = axis.percent !== null && axis.weight > 0;
              return (
                <TableRow key={axis.axis}>
                  <TableCell className="font-medium">
                    {t(`axis.${axis.axis}`)}
                    {axis.axis === "PEER" && applicable && (
                      <span className="ms-1 text-xs text-muted-foreground">({t("result.raters", { count: data.peerCount })})</span>
                    )}
                    {axis.axis === "UPWARD" && applicable && (
                      <span className="ms-1 text-xs text-muted-foreground">({t("result.raters", { count: data.upwardCount })})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PercentCell value={applicable ? axis.percent : null} />
                  </TableCell>
                  <TableCell className="tabular-nums">{applicable ? `${formatNumber(axis.weight)}%` : "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {applicable ? formatNumber(((axis.percent as number) * axis.weight) / 100) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {data.commitment && deductions && (
          <div className="rounded-lg border p-4">
            <p className="mb-3 font-medium">
              {t("result.commitmentTitle")}: <span className="tabular-nums">{formatNumber(data.commitment.score)}</span> / 10
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <DeductionItem label={t("result.deductions.penalties")} value={-deductions.penalties} />
              <DeductionItem label={t("result.deductions.justifications")} value={-deductions.justifications} />
              <DeductionItem label={t("result.deductions.excessLeaveDays")} value={-deductions.excessLeaveDays} />
              <DeductionItem label={t("result.deductions.excessLeaveHours")} value={-deductions.excessLeaveHours} />
              <DeductionItem label={t("result.deductions.bonus")} value={data.commitment.bonus} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeductionItem({ label, value }: { label: string; value: number }) {
  const color = value < 0 ? "text-red-600" : value > 0 ? "text-green-600" : "text-muted-foreground";
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${color}`} dir="ltr">
        {value > 0 ? "+" : ""}
        {formatNumber(value)}
      </p>
    </div>
  );
}
