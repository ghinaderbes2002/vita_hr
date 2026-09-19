"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientSessionsProgress } from "@/lib/hooks/use-patient-app";
import type { SessionProgress } from "@/lib/api/patient-app";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB") : "—";

/**
 * How far the patient got with each session's exercises, as the app reports it.
 * Read-only: the therapist builds the programme on the programs screen.
 */
export function PatientSessionsProgress({ erpPatientId }: { erpPatientId?: string }) {
  const t = useTranslations("patientApp.progress");
  const { data = [], isLoading } = usePatientSessionsProgress(erpPatientId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }

  const counters = (row: SessionProgress) => [
    { key: "completed", value: row.completed, className: "bg-green-50 text-green-700 border-green-300" },
    { key: "inProgress", value: row.inProgress, className: "bg-blue-50 text-blue-700 border-blue-300" },
    { key: "skipped", value: row.skipped, className: "bg-amber-50 text-amber-700 border-amber-300" },
    { key: "notStarted", value: row.notStarted, className: "bg-gray-50 text-gray-600 border-gray-300" },
  ].filter((c) => c.value > 0);

  return (
    <div className="space-y-2">
      {data.map((row) => (
        <div key={row.session.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-2.5 py-0.5 font-bold">
                #{row.session.sessionNumber ?? "—"}
              </Badge>
              <span className="text-sm font-medium">{fmtDate(row.session.sessionDate)}</span>
              {row.session.attendanceConfirmed && (
                <Badge variant="outline" className="text-[10px]">{t("attended")}</Badge>
              )}
            </div>
            {/* allCompleted comes from the API — nothing is added up here. */}
            {row.totalExercises === 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleDashed className="h-4 w-4" />
                {t("noProgramme")}
              </span>
            ) : row.allCompleted ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {t("allCompleted")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("ratio", { done: row.completed, total: row.totalExercises })}
              </span>
            )}
          </div>

          {row.totalExercises > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {counters(row).map((c) => (
                <Badge key={c.key} variant="outline" className={`text-[10px] ${c.className}`}>
                  {t(c.key as "completed" | "inProgress" | "skipped" | "notStarted", { count: c.value })}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
