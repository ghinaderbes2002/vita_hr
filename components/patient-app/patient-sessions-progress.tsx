"use client";

import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientExecutions, usePatientSessionsProgress } from "@/lib/hooks/use-patient-app";
import { localizedName, type Exercise, type SessionProgress } from "@/lib/api/patient-app";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB") : "—";

type ExerciseStatus = "COMPLETED" | "IN_PROGRESS" | "SKIPPED" | "NOT_STARTED";

const STATUS_BADGE: Record<ExerciseStatus, { key: "statusCompleted" | "statusInProgress" | "statusSkipped" | "statusNotStarted"; className: string }> = {
  COMPLETED:   { key: "statusCompleted",  className: "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800" },
  IN_PROGRESS: { key: "statusInProgress", className: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  SKIPPED:     { key: "statusSkipped",    className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  NOT_STARTED: { key: "statusNotStarted", className: "bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700" },
};

const toStatus = (s?: string | null): ExerciseStatus =>
  s === "COMPLETED" ? "COMPLETED"
  : s === "SKIPPED" ? "SKIPPED"
  : s === "STARTED" || s === "IN_PROGRESS" ? "IN_PROGRESS"
  : "NOT_STARTED";

/** One exercise of one session, with where the patient is on it. */
interface ExerciseRow {
  key: string;
  sessionId: string;
  sortOrder: number;
  exercise?: Exercise | null;
  status: ExerciseStatus;
  skipReason?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * /patients/:id/executions as one row per exercise. The backend describes it as
 * one item per assigned exercise with its latest run in `executions[0]`; the
 * programs screen reads it as one item per run carrying its `assignment`. Both
 * shapes are accepted, and for the second only each exercise's latest run is kept.
 */
function toExerciseRows(items: any[]): ExerciseRow[] {
  const rows = new Map<string, ExerciseRow & { at: string }>();
  for (const it of items ?? []) {
    const perExercise = Array.isArray(it?.executions);
    const run = perExercise ? it.executions[0] : it;
    const assignment = perExercise ? it : it?.assignment ?? {};
    const key = (perExercise ? it.id : it?.assignmentId ?? assignment?.id) ?? it?.id;
    const sessionId = assignment?.erpSessionId ?? it?.erpSessionId ?? run?.erpSessionId;
    if (!key || !sessionId) continue;
    const at = run?.completedAt ?? run?.skippedAt ?? run?.startedAt ?? run?.createdAt ?? "";
    const prev = rows.get(key);
    if (prev && prev.at >= at) continue;
    const reason = run?.skipReason?.nameAr ?? run?.skipReason?.labelAr ?? run?.skipReason?.textAr;
    rows.set(key, {
      key,
      sessionId,
      sortOrder: assignment?.sortOrder ?? 0,
      exercise: assignment?.exercise ?? it?.exercise ?? null,
      status: toStatus(run?.status ?? (perExercise ? null : it?.status)),
      skipReason: [reason, run?.skipReasonText].filter(Boolean).join(" — ") || undefined,
      at,
    });
  }
  return [...rows.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * How far the patient got with each session's exercises, as the app reports it.
 * Read-only: the therapist builds the programme on the programs screen.
 */
export function PatientSessionsProgress({ erpPatientId }: { erpPatientId?: string }) {
  const t = useTranslations("patientApp.progress");
  const locale = useLocale();
  const { data = [], isLoading } = usePatientSessionsProgress(erpPatientId);
  // The per-exercise detail behind each session's counters, skip reasons included.
  const { data: executions = [] } = usePatientExecutions(erpPatientId);
  const bySession = new Map<string, ExerciseRow[]>();
  for (const r of toExerciseRows(executions)) {
    bySession.set(r.sessionId, [...(bySession.get(r.sessionId) ?? []), r]);
  }

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

          {(bySession.get(row.session.id)?.length ?? 0) > 0 && (
            <ul className="divide-y rounded-md border bg-muted/20">
              {bySession.get(row.session.id)!.map((ex) => {
                const st = STATUS_BADGE[ex.status];
                return (
                  <li key={ex.key} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {localizedName(ex.exercise, locale) || t("unnamedExercise")}
                      </p>
                      {ex.status === "SKIPPED" && ex.skipReason && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {t("skipReason", { reason: ex.skipReason })}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${st.className}`}>{t(st.key)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
