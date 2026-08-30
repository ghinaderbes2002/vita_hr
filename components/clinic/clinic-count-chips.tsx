"use client";

import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface ClinicCount {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
}

/**
 * Header counters for the clinic list screens.
 *
 * Each row in those tables is a case (or a podiatry reception), not a patient —
 * one patient can have several files open at once — so the two totals legitimately
 * differ. Every counter carries its own label so that difference reads as the
 * fact it is rather than as a miscount.
 */
export function ClinicCountChips({
  counts,
  isLoading,
}: {
  counts: ClinicCount[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {counts.map((c) => (
          <Skeleton key={c.label} className="h-7 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {counts.map(({ icon: Icon, label, value }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium"
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{label}</span>
          <span className="font-bold tabular-nums">{value ?? "—"}</span>
        </span>
      ))}
    </div>
  );
}
