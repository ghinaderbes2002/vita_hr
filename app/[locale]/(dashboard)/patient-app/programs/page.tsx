"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ClipboardList, Clock, History, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageGuard } from "@/components/permissions/page-guard";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { PatientPicker } from "@/components/patient-app/patient-picker";
import { AssignmentsPanel, isCancelled } from "@/components/patient-app/assignments-panel";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useExercises, usePatientExecutions, usePatientGeneralExercises, usePatientSessions } from "@/lib/hooks/use-patient-app";
import type { Patient } from "@/lib/api/clinic-patients";
import { localizedName, type Execution } from "@/lib/api/patient-app";

const P = PERMISSIONS.PATIENT_APP;

/** The session list's entry for exercises that belong to no session. */
const GENERAL = "__general__";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", hour12: true }) : "—";

export default function PatientAppProgramsPage() {
  const t = useTranslations("patientApp.programs");
  const locale = useLocale();
  const { hasPermission, isAdmin } = usePermissions();
  const canViewExecutions = isAdmin() || hasPermission(P.VIEW_PATIENT_EXECUTIONS);
  const [patient, setPatient] = useState<Patient | null>(null);

  return (
    <PageGuard
      permissions={[P.ASSIGN_EXERCISE, P.EDIT_ASSIGNED_EXERCISE, P.CANCEL_ASSIGNED_EXERCISE, P.VIEW_PATIENT_EXECUTIONS]}
    >
      <div className="space-y-4">
        <PageHeader title={t("title")} description={t("description")} />

        <div className="max-w-2xl">
          <PatientPicker value={patient} onChange={setPatient} />
        </div>

        {!patient ? (
          <EmptyState
            icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
            title={t("pickPatientTitle")}
            description={t("pickPatientDescription")}
          />
        ) : (
          <Tabs key={patient.id} defaultValue="program" dir={locale === "ar" ? "rtl" : "ltr"}>
            <TabsList>
              <TabsTrigger value="program">{t("tabProgram")}</TabsTrigger>
              {canViewExecutions && <TabsTrigger value="executions">{t("tabExecutions")}</TabsTrigger>}
            </TabsList>
            <TabsContent value="program" className="mt-4">
              <SessionPrograms patientId={patient.id} />
            </TabsContent>
            {canViewExecutions && (
              <TabsContent value="executions" className="mt-4">
                <ExecutionsLog patientId={patient.id} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </PageGuard>
  );
}

// ── Sessions + their assigned exercises ─────────────────────

function SessionPrograms({ patientId }: { patientId: string }) {
  const t = useTranslations("patientApp.programs");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: sessions = [], isLoading } = usePatientSessions(patientId);
  const { data: general = [] } = usePatientGeneralExercises(patientId);
  const generalCount = general.filter((a) => !isCancelled(a)).length;

  const ordered = [...sessions].sort(
    (a, b) =>
      (b.sessionDate ?? "").localeCompare(a.sessionDate ?? "") ||
      (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0),
  );
  // General exercises need no session, so with no sessions they are the only
  // thing to show, and the default.
  const showGeneral = selected === GENERAL || ordered.length === 0;
  const session = showGeneral ? undefined : ordered.find((s) => s.id === selected) ?? ordered[0];

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="rounded-lg border">
        <div className="border-b px-3 py-2 text-sm font-medium">{t("sessions", { count: ordered.length })}</div>
        <div className="max-h-64 space-y-1 overflow-y-auto p-2 lg:max-h-[65dvh]">
          <button
            type="button"
            onClick={() => setSelected(GENERAL)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-start text-sm transition-colors",
              showGeneral ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <span>
              <span className="block font-medium">{t("generalExercises")}</span>
              <span className="block text-xs opacity-80">{t("generalExercisesHint")}</span>
            </span>
            {generalCount > 0 && <Badge variant="secondary" className="shrink-0">{generalCount}</Badge>}
          </button>
          {ordered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("noSessionsDescription")}</p>
          )}
          {ordered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors",
                !showGeneral && s.id === session?.id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <span>
                <span className="block font-medium">{t("session", { number: s.sessionNumber ?? "—" })}</span>
                <span className="block text-xs opacity-80">{fmtDate(s.sessionDate)}</span>
              </span>
              {s.attendanceConfirmed && <CheckCircle2 className="h-4 w-4 shrink-0 opacity-80" />}
            </button>
          ))}
        </div>
      </div>

      <AssignmentsPanel key={session?.id ?? GENERAL} session={session} patientId={patientId} />
    </div>
  );
}

// ── Execution log ───────────────────────────────────────────

type ExecutionLabel = "execCompleted" | "execSkipped" | "execInProgress";

const EXECUTION_STATUS: Record<string, { label: ExecutionLabel; className: string }> = {
  COMPLETED:   { label: "execCompleted",  className: "bg-green-100 text-green-800 border-green-200" },
  SKIPPED:     { label: "execSkipped",    className: "bg-amber-100 text-amber-800 border-amber-200" },
  STARTED:     { label: "execInProgress", className: "bg-blue-100 text-blue-800 border-blue-200" },
  IN_PROGRESS: { label: "execInProgress", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

/**
 * A run of a general exercise (no session). Only an explicit null counts — a
 * response that leaves the field out says nothing either way.
 */
const isGeneralRun = (e: Execution) =>
  ("erpSessionId" in e && e.erpSessionId === null && (!e.assignment || e.assignment.erpSessionId == null)) ||
  (!("erpSessionId" in e) && !!e.assignment && "erpSessionId" in e.assignment && e.assignment.erpSessionId === null);

const lastTouched = (e: Execution) => e.completedAt ?? e.skippedAt ?? e.startedAt ?? e.createdAt ?? "";

function ExecutionsLog({ patientId }: { patientId: string }) {
  const t = useTranslations("patientApp.programs");
  const locale = useLocale();
  const { data: executions = [], isLoading } = usePatientExecutions(patientId);
  const { data: library = [] } = useExercises();

  const rows = [...executions].sort((a, b) => lastTouched(b).localeCompare(lastTouched(a)));
  const count = (s: string[]) => executions.filter((e) => s.includes(e.status)).length;

  return (
    <div className="space-y-3">
      <ClinicCountChips
        isLoading={isLoading}
        counts={[
          { icon: CheckCircle2, label: t("execCompleted"), value: count(["COMPLETED"]) },
          { icon: SkipForward, label: t("execSkipped"), value: count(["SKIPPED"]) },
          { icon: Clock, label: t("execInProgress"), value: count(["STARTED", "IN_PROGRESS"]) },
        ]}
      />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colExercise")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colStartedAt")}</TableHead>
              <TableHead>{t("colFinishedAt")}</TableHead>
              <TableHead>{t("colNote")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    icon={<History className="h-8 w-8 text-muted-foreground" />}
                    title={t("noExecutionsTitle")}
                    description={t("noExecutionsDescription")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => {
                const status = EXECUTION_STATUS[e.status];
                const exercise =
                  e.assignment?.exercise ?? library.find((x) => x.id === e.assignment?.exerciseId);
                const skipReason =
                  e.skipReason?.nameAr ?? e.skipReason?.labelAr ?? e.skipReason?.textAr;
                const note = e.status === "SKIPPED"
                  ? [skipReason, e.skipReasonText].filter(Boolean).join(" — ")
                  : e.completionNote;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {localizedName(exercise, locale) || "—"}
                      {isGeneralRun(e) && (
                        <Badge variant="outline" className="ms-2 border-dashed text-[10px] font-normal">{t("generalBadge")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", status?.className)}>
                        {status ? t(status.label) : e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm" dir="ltr">{fmtDateTime(e.startedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm" dir="ltr">
                      {fmtDateTime(e.completedAt ?? e.skippedAt)}
                    </TableCell>
                    <TableCell className="max-w-80 text-sm">{note || "—"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
