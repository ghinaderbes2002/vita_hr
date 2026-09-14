"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDown, ArrowUp, Ban, CheckCircle2, ClipboardList, Clock, History, Loader2, Pencil,
  Plus, SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageGuard } from "@/components/permissions/page-guard";
import { ActionGuard } from "@/components/permissions/action-guard";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { PatientPicker } from "@/components/patient-app/patient-picker";
import { AssignmentDialog } from "@/components/patient-app/assignment-dialog";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  useCancelAssignment, useExercises, usePatientExecutions, usePatientSessions,
  useReorderAssignments, useSessionExercises,
} from "@/lib/hooks/use-patient-app";
import type { Patient } from "@/lib/api/clinic-patients";
import { localizedName, type Assignment, type ErpSession, type Execution } from "@/lib/api/patient-app";

const P = PERMISSIONS.PATIENT_APP;

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", hour12: true }) : "—";

const isCancelled = (a: Pick<Assignment, "status">) => a.status === "CANCELLED";

/** Bilingual free-text fields: the viewer's language, falling back to the other. */
const pickText = (locale: string, ar?: string | null, en?: string | null) =>
  (locale === "ar" ? ar || en : en || ar) || "";

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

  const ordered = [...sessions].sort(
    (a, b) =>
      (b.sessionDate ?? "").localeCompare(a.sessionDate ?? "") ||
      (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0),
  );
  const session = ordered.find((s) => s.id === selected) ?? ordered[0];

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (ordered.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        title={t("noSessionsTitle")}
        description={t("noSessionsDescription")}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="rounded-lg border">
        <div className="border-b px-3 py-2 text-sm font-medium">{t("sessions", { count: ordered.length })}</div>
        <div className="max-h-64 space-y-1 overflow-y-auto p-2 lg:max-h-[65dvh]">
          {ordered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors",
                s.id === session?.id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
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

      {session && <SessionAssignments key={session.id} session={session} />}
    </div>
  );
}

function SessionAssignments({ session }: { session: ErpSession }) {
  const t = useTranslations("patientApp.programs");
  const locale = useLocale();
  const { data: assignments = [], isLoading } = useSessionExercises(session.id);
  const { data: library = [] } = useExercises();
  const reorder = useReorderAssignments();
  const cancel = useCancelAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [cancelling, setCancelling] = useState<Assignment | null>(null);
  const [reason, setReason] = useState("");

  const sorted = [...assignments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const active = sorted.filter((a) => !isCancelled(a));
  // Cancelled ones stay visible (the patient still sees them, in red) but sit at
  // the bottom and are out of the ordering.
  const rows = [...active, ...sorted.filter(isCancelled)];
  const nextSortOrder = sorted.reduce((max, a) => Math.max(max, a.sortOrder ?? 0), 0) + 1;

  const exerciseOf = (a: Assignment) => a.exercise ?? library.find((e) => e.id === a.exerciseId);

  /** "3 × 10 · 5s hold · 15s rest" — only the parts that were set. */
  const dosage = (a: Assignment) => {
    const parts: string[] = [];
    if (a.sets && a.reps) parts.push(t("dosageSetsReps", { sets: a.sets, reps: a.reps }));
    else if (a.sets) parts.push(t("dosageSets", { count: a.sets }));
    else if (a.reps) parts.push(t("dosageReps", { count: a.reps }));
    if (a.durationSeconds) parts.push(t("dosageDuration", { count: a.durationSeconds }));
    if (a.holdSeconds) parts.push(t("dosageHold", { count: a.holdSeconds }));
    if (a.restSeconds) parts.push(t("dosageRest", { count: a.restSeconds }));
    return parts.join(" · ") || "—";
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= active.length) return;
    const next = [...active];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ sessionId: session.id, items: next.map((a, i) => ({ id: a.id, sortOrder: i + 1 })) });
  };

  const confirmCancel = async () => {
    if (!cancelling) return;
    await cancel.mutateAsync({ id: cancelling.id, reason: reason.trim() || undefined });
    setCancelling(null);
    setReason("");
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{t("session", { number: session.sessionNumber ?? "—" })}</h3>
          <span className="text-sm text-muted-foreground">{fmtDate(session.sessionDate)}</span>
          {session.attendanceConfirmed ? (
            <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">{t("attended")}</Badge>
          ) : (
            <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-700">{t("notAttended")}</Badge>
          )}
        </div>
        <ActionGuard permission={P.ASSIGN_EXERCISE}>
          <Button className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            {t("assign")}
          </Button>
        </ActionGuard>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{t("colOrder")}</TableHead>
              <TableHead>{t("colExercise")}</TableHead>
              <TableHead>{t("colDosage")}</TableHead>
              <TableHead>{t("colFrequency")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
                    title={t("noAssignmentsTitle")}
                    description={t("noAssignmentsDescription")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => {
                const cancelled = isCancelled(a);
                const index = active.indexOf(a);
                const instruction = pickText(locale, a.customInstructionAr, a.customInstructionEn);
                return (
                  <TableRow key={a.id} className={cn(cancelled && "bg-red-50/60 dark:bg-red-950/20")}>
                    <TableCell>
                      {cancelled ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <span className="w-5 text-center text-sm font-medium">{index + 1}</span>
                          <ActionGuard permission={P.EDIT_ASSIGNED_EXERCISE}>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
                                disabled={index === 0 || reorder.isPending}
                                onClick={() => move(index, -1)}
                                aria-label={t("moveUp")}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
                                disabled={index === active.length - 1 || reorder.isPending}
                                onClick={() => move(index, 1)}
                                aria-label={t("moveDown")}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </ActionGuard>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className={cn("font-medium", cancelled && "text-red-700 line-through dark:text-red-400")}>
                        {localizedName(exerciseOf(a), locale) || "—"}
                      </p>
                      {instruction && (
                        <p className="line-clamp-2 max-w-72 text-xs text-muted-foreground">{instruction}</p>
                      )}
                      {cancelled && a.cancelReason && (
                        <p className="text-xs text-red-700 dark:text-red-400">
                          {t("cancelReason", { reason: a.cancelReason })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{dosage(a)}</TableCell>
                    <TableCell className="text-sm">
                      {pickText(locale, a.frequencyTextAr, a.frequencyTextEn) || "—"}
                    </TableCell>
                    <TableCell>
                      {cancelled ? (
                        <Badge variant="outline" className="border-red-200 bg-red-100 text-red-800">{t("cancelled")}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">{t("active")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!cancelled && (
                        <div className="flex items-center gap-1">
                          <ActionGuard permission={P.EDIT_ASSIGNED_EXERCISE}>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { setEditing(a); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </ActionGuard>
                          <ActionGuard permission={P.CANCEL_ASSIGNED_EXERCISE}>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              title={t("cancelExercise")}
                              onClick={() => { setCancelling(a); setReason(""); }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </ActionGuard>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sessionId={session.id}
        assignment={editing}
        nextSortOrder={nextSortOrder}
      />

      <Dialog open={!!cancelling} onOpenChange={(o) => { if (!o && !cancel.isPending) setCancelling(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cancelExercise")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t("cancelBody", { name: cancelling ? localizedName(exerciseOf(cancelling), locale) || "—" : "" })}
            </p>
            <div className="space-y-1.5">
              <Label>{t("cancelReasonLabel")}</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("optional")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={cancel.isPending}>
              {t("keep")}
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancel.isPending}>
              {cancel.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("cancelExercise")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                    <TableCell className="font-medium">{localizedName(exercise, locale) || "—"}</TableCell>
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
