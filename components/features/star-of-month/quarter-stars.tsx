"use client";

// نجم الربع: أفضل الفائزين الشهريين الثلاثة لكل شركة بنفس نتيجة فوزهم الشهري.
// الحساب تلقائي بعد إغلاق الأشهر الثلاثة؛ التعادل يحسمه HR، والشهادة PDF من الباك.

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Award, ChevronLeft, ChevronRight, FileDown, Loader2, RefreshCw, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import {
  useStarCycle, useStarQuarter, useStarQuarterAction, useStarQuarterCertificate,
} from "@/lib/hooks/use-star-of-month";
import {
  STAR_COMPANIES, StarCandidate, StarCompany, StarCycle, StarQuarter, StarQuarterWinner,
} from "@/lib/api/star-of-month";

const COMPANY_NAME: Record<StarCompany, string> = { VITASYR: "VitaSyr", VITAXIR: "VitaXir" };

/** The latest quarter whose three months have all ended. */
function lastClosedQuarter(): { year: number; quarter: StarQuarter } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3); // current quarter, 0-based
  return q === 0 ? { year: now.getFullYear() - 1, quarter: 4 } : { year: now.getFullYear(), quarter: q as StarQuarter };
}

const fmtScore = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** A month's winner in one company: named by the server, else the one clear top score. */
function monthWinner(cycle: StarCycle | null | undefined, company: StarCompany): StarCandidate | undefined {
  if (!cycle || cycle.status !== "CLOSED") return undefined;
  const all = cycle.candidatesByCompany[company] ?? [];
  const named = all.find((c) => c.isWinner);
  if (named) return named;
  const top = Math.max(-1, ...all.map((c) => c.finalScore ?? -1));
  const leaders = all.filter((c) => top >= 0 && (c.finalScore ?? -1) === top);
  return leaders.length === 1 ? leaders[0] : undefined;
}

export function QuarterStars({ canManage }: { canManage: boolean }) {
  const t = useTranslations("starOfMonth.quarter");
  const [{ year, quarter }, setPeriod] = useState(lastClosedQuarter);
  const latest = lastClosedQuarter();
  const atLatest = year === latest.year && quarter === latest.quarter;
  const shift = (delta: number) => setPeriod(({ year: y, quarter: q }) => {
    const i = y * 4 + (q - 1) + delta;
    return { year: Math.floor(i / 4), quarter: ((i % 4) + 1) as StarQuarter };
  });

  const { data: winners = [], isLoading, isError } = useStarQuarter(year, quarter);
  // The quarter's three monthly cycles: who competed, and the choice in a tie.
  const firstMonth = (quarter - 1) * 3 + 1;
  const m1 = useStarCycle(year, firstMonth);
  const m2 = useStarCycle(year, firstMonth + 1);
  const m3 = useStarCycle(year, firstMonth + 2);
  const months = [
    { month: firstMonth, cycle: m1.data?.cycle },
    { month: firstMonth + 1, cycle: m2.data?.cycle },
    { month: firstMonth + 2, cycle: m3.data?.cycle },
  ];

  const action = useStarQuarterAction();
  const certificate = useStarQuarterCertificate();
  const [pendingTie, setPendingTie] = useState<{ company: StarCompany; employeeId: string; name: string } | null>(null);
  const nameOf = useEmployeeName();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-violet-500" />
            {t("title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("previous")} onClick={() => shift(-1)}>
            <ChevronRight className="h-4 w-4 ltr:rotate-180" />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold">{t("label", { quarter, year })}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("next")} disabled={atLatest} onClick={() => shift(1)}>
            <ChevronLeft className="h-4 w-4 ltr:rotate-180" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {STAR_COMPANIES.map((c) => <Skeleton key={c} className="h-44 rounded-xl" />)}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">{t("loadFailed")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {STAR_COMPANIES.map((company) => (
              <CompanyQuarter
                key={company}
                company={company}
                result={winners.find((w) => w.company === company)}
                monthly={months.map((m) => ({ month: m.month, winner: monthWinner(m.cycle, company) }))}
                year={year}
                canManage={canManage}
                nameOf={nameOf}
                computing={action.isPending && action.variables?.action === "compute" && action.variables.company === company}
                downloading={certificate.isPending && certificate.variables?.company === company}
                onCompute={() => action.mutate({ year, quarter, company, action: "compute" })}
                onCertificate={() => certificate.mutate({ year, quarter, company })}
                onPickTie={(employeeId, name) => setPendingTie({ company, employeeId, name })}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!pendingTie}
        onOpenChange={(o) => { if (!o) setPendingTie(null); }}
        title={t("tieBreakTitle")}
        description={pendingTie ? t("tieBreakDescription", { name: pendingTie.name, company: COMPANY_NAME[pendingTie.company] }) : undefined}
        onConfirm={() => {
          if (pendingTie) {
            action.mutate({ year, quarter, company: pendingTie.company, action: "tieBreak", employeeId: pendingTie.employeeId });
          }
          setPendingTie(null);
        }}
      />
    </Card>
  );
}

/** The name the server embeds, else the shared employee list. */
function useEmployeeName() {
  const { data } = useEmployeesBasicList();
  const employees = Array.isArray(data) ? data : [];
  return (employeeId: string, embedded?: StarCandidate["employee"]) => {
    const e = embedded ?? employees.find((x) => x.id === employeeId);
    const name = e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : "";
    return name || employeeId.slice(0, 8);
  };
}

function CompanyQuarter({
  company, result, monthly, year, canManage, nameOf, computing, downloading, onCompute, onCertificate, onPickTie,
}: {
  company: StarCompany;
  result: StarQuarterWinner | undefined;
  monthly: { month: number; winner: StarCandidate | undefined }[];
  year: number;
  canManage: boolean;
  nameOf: (employeeId: string, embedded?: StarCandidate["employee"]) => string;
  computing: boolean;
  downloading: boolean;
  onCompute: () => void;
  onCertificate: () => void;
  onPickTie: (employeeId: string, name: string) => void;
}) {
  const t = useTranslations("starOfMonth.quarter");
  const locale = useLocale();
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : locale, { month: "long" }).format(new Date(year, m - 1, 1));
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  const settled = !!result?.employeeId;
  const tie = !!result && !settled && result.isTie;
  // In a tie, the monthly winners sharing the top score are the ones to choose from.
  const tied = tie ? monthly.filter((m) => m.winner && (m.winner.finalScore ?? -1) === result?.finalScore) : [];
  const choices = tied.length > 1 ? tied : monthly.filter((m) => m.winner);

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{COMPANY_NAME[company]}</p>
        {canManage && !settled && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={computing} onClick={onCompute}>
            {computing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t("compute")}
          </Button>
        )}
      </div>

      {settled && result?.employeeId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-violet-950/30">
          <Award className="h-8 w-8 shrink-0 text-violet-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{nameOf(result.employeeId, result.employee)}</p>
            <p className="text-xs text-muted-foreground">
              {t("score", { score: fmtScore(result.finalScore) })}
              {result.awardedAt && <> · {t("awardedAt", { date: date(result.awardedAt) })}</>}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={downloading} onClick={onCertificate}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            {t("certificate")}
          </Button>
        </div>
      ) : tie ? (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="flex items-center gap-1.5 font-medium">
            <Scale className="h-4 w-4" />
            {canManage ? t("tieHr") : t("tieWaiting")}
          </p>
          {canManage && choices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {choices.map(({ month, winner }) => {
                const name = nameOf(winner!.employeeId, winner!.employee);
                return (
                  <Button key={month} size="sm" variant="outline" className="h-8 bg-background" onClick={() => onPickTie(winner!.employeeId, name)}>
                    {name} ({fmtScore(winner!.finalScore)})
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">{t("notComputed")}</p>
      )}

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t("monthlyWinners")}</p>
        {monthly.map(({ month, winner }) => (
          <div key={month} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{monthName(month)}</span>
            <span className="truncate">
              {winner ? <>{nameOf(winner.employeeId, winner.employee)} <span className="text-xs text-muted-foreground">({fmtScore(winner.finalScore)})</span></> : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
