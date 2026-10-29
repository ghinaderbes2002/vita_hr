"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, LineChart as LineChartIcon, Minus } from "lucide-react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { dashboardApi } from "@/lib/api/dashboard";

type Series = "receptions" | "fitted" | "notFitted";

const COLORS: Record<Series, string> = {
  receptions: "#0ea5e9",
  fitted: "#10b981",
  notFitted: "#f43f5e",
};

const MONTH_OPTIONS = [6, 12, 24];

/** "2026-03" → "03/2026", as the rest of the dashboard writes dates. */
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${mo}/${y}` : m;
};

/** Change against the previous month, as a whole percentage; null when there's nothing to compare with. */
const changePct = (now: number, before?: number) =>
  before == null || before === 0 ? null : Math.round(((now - before) / before) * 100);

function Trend({ now, before }: { now: number; before?: number }) {
  const pct = changePct(now, before);
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 tabular-nums",
      pct > 0 ? "text-emerald-600 dark:text-emerald-400" : pct < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
    )}>
      <Icon className="h-3 w-3" />{Math.abs(pct)}%
    </span>
  );
}

/**
 * The podiatry caseload month by month: receptions opened, cases fitted, and
 * receptions still analysis-only — so a rise or a drop is visible at a glance.
 */
export function PodiatryMonthlyChart() {
  const t = useTranslations("dashboard.ceo");
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(12);
  const [hidden, setHidden] = useState<Set<Series>>(new Set());

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["dashboard-podiatry-monthly", months],
    queryFn: () => dashboardApi.podiatryMonthly(months),
    enabled: open,
  });

  const rows = data.map((r) => ({ ...r, label: monthLabel(r.month) }));
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const series: { key: Series; label: string }[] = [
    { key: "receptions", label: t("podiatryTotal") },
    { key: "fitted", label: t("podiatryFitted") },
    { key: "notFitted", label: t("podiatryNotFitted") },
  ];

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <LineChartIcon className="h-4 w-4" />
        {t("podiatryChart")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("podiatryChartTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    months === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("podiatryChartMonths", { count: m })}
                </button>
              ))}
            </div>
          </div>

          {/* This month against the last, per series. */}
          {last && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {series.map((s) => (
                <div key={s.key} className="rounded-lg border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[s.key] }} />
                    {s.label}
                  </p>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-bold tabular-nums">{last[s.key]}</span>
                    <span className="text-xs"><Trend now={last[s.key]} before={prev?.[s.key]} /></span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("podiatryChartVsLast")}</p>
                </div>
              ))}
            </div>
          )}

          <div className="h-80 w-full" dir="ltr">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : isError ? (
              <p className="flex h-full items-center justify-center text-sm text-destructive">{t("podiatryChartError")}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip />
                  <Legend
                    onClick={(e) => {
                      const k = e.dataKey as Series;
                      setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; });
                    }}
                    wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                  />
                  {series.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={COLORS[s.key]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      hide={hidden.has(s.key)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* The same numbers as a table, each month against the one before. */}
          {!isLoading && !isError && rows.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t("podiatryChartMonth")}</th>
                    {series.map((s) => <th key={s.key} className="px-3 py-2 text-center font-medium">{s.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r, i, arr) => {
                    const before = arr[i + 1];
                    return (
                      <tr key={r.month} className="border-t">
                        <td className="px-3 py-1.5 font-mono text-xs">{r.label}</td>
                        {series.map((s) => (
                          <td key={s.key} className="px-3 py-1.5 text-center tabular-nums">
                            {r[s.key]} <span className="ms-1 text-[11px]"><Trend now={r[s.key]} before={before?.[s.key]} /></span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

