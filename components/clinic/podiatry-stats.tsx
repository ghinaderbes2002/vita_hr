"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, Footprints, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One figure: the number, what share of all receptions it is, and a bar for that share. */
function StatCard({
  icon: Icon, label, value, total, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  /** Omitted for the total itself — no share, no bar. */
  total?: number;
  sub?: string;
  tone: "brand" | "green" | "amber" | "blue";
}) {
  const t = useTranslations("clinic.podiatry");
  const pct = total ? Math.round((value / total) * 100) : null;
  const toneCls = {
    brand: { icon: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400", bar: "bg-orange-500" },
    green: { icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400", bar: "bg-emerald-500" },
    amber: { icon: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400", bar: "bg-amber-500" },
    blue: { icon: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400", bar: "bg-sky-500" },
  }[tone];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tabular-nums leading-none">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneCls.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {pct !== null ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", toneCls.bar)} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("statOfTotal", { pct })}
            {sub && <span> · {sub}</span>}
          </p>
        </div>
      ) : (
        sub && <p className="mt-3 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

/**
 * The podiatry caseload at a glance: all receptions, how many were fitted and
 * how many weren't, and — for those who see every reception — how many have a
 * practitioner. Counted from the full list, never just the visible page.
 */
export function PodiatryStats({
  total, patients, fitted, assigned, showAssignment, isLoading,
}: {
  total: number;
  patients: number;
  fitted: number;
  assigned: number;
  showAssignment: boolean;
  isLoading?: boolean;
}) {
  const t = useTranslations("clinic.podiatry");
  const cards = showAssignment ? 4 : 3;

  if (isLoading) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2", cards === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", cards === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      <StatCard
        icon={Footprints} tone="brand"
        label={t("statTotal")} value={total}
        sub={t("statPatients", { count: patients })}
      />
      <StatCard icon={CheckCircle2} tone="green" label={t("statFitted")} value={fitted} total={total} />
      <StatCard icon={CircleDashed} tone="amber" label={t("statNotFitted")} value={total - fitted} total={total} />
      {showAssignment && (
        <StatCard
          icon={UserCheck} tone="blue"
          label={t("statAssigned")} value={assigned} total={total}
          sub={t("statUnassigned", { count: total - assigned })}
        />
      )}
    </div>
  );
}
