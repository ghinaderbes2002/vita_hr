"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Ban, ClipboardList, Dumbbell, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionGuard } from "@/components/permissions/action-guard";
import { AssignmentDialog } from "@/components/patient-app/assignment-dialog";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  useCancelAssignment, useExercises, usePatientGeneralExercises, useReorderAssignments, useSessionExercises,
} from "@/lib/hooks/use-patient-app";
import { localizedName, type Assignment, type ErpSession } from "@/lib/api/patient-app";

const P = PERMISSIONS.PATIENT_APP;

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export const isCancelled = (a: Pick<Assignment, "status">) => a.status === "CANCELLED";

/** Bilingual free-text fields: the viewer's language, falling back to the other. */
const pickText = (locale: string, ar?: string | null, en?: string | null) =>
  (locale === "ar" ? ar || en : en || ar) || "";

/** One session's exercises, or — with no session — the patient's general ones. */
export function AssignmentsPanel({
  session, patientId, hideGeneralHeading,
}: {
  session?: ErpSession;
  patientId: string;
  /** For a host that already titles the section "general exercises". */
  hideGeneralHeading?: boolean;
}) {
  const t = useTranslations("patientApp.programs");
  const locale = useLocale();
  const listTarget = session ? { sessionId: session.id } : { patientId };
  const sessionList = useSessionExercises(session?.id);
  const generalList = usePatientGeneralExercises(patientId, !session);
  const { data: assignments = [], isLoading } = session ? sessionList : generalList;
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

  /** الرقمان الاختياريان تحت نص التكرار: "3 مرات/يوم · 5 أيام/أسبوع". */
  const frequencyNumbers = (a: Assignment) => {
    const parts: string[] = [];
    if (a.timesPerDay) parts.push(t("dosageTimesPerDay", { count: a.timesPerDay }));
    if (a.daysPerWeek) parts.push(t("dosageDaysPerWeek", { count: a.daysPerWeek }));
    return parts.join(" · ");
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= active.length) return;
    const next = [...active];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ ...listTarget, items: next.map((a, i) => ({ id: a.id, sortOrder: i + 1 })) });
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
        {session ? (
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t("session", { number: session.sessionNumber ?? "—" })}</h3>
            <span className="text-sm text-muted-foreground">{fmtDate(session.sessionDate)}</span>
            {session.attendanceConfirmed ? (
              <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">{t("attended")}</Badge>
            ) : (
              <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-700">{t("notAttended")}</Badge>
            )}
          </div>
        ) : hideGeneralHeading ? (
          <p className="text-sm text-muted-foreground">{t("generalExercisesDescription")}</p>
        ) : (
          <div className="space-y-0.5">
            <h3 className="flex items-center gap-2 font-semibold">
              <Dumbbell className="h-4 w-4 text-primary" />
              {t("generalExercises")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("generalExercisesDescription")}</p>
          </div>
        )}
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
                      {pickText(locale, a.frequencyTextAr, a.frequencyTextEn)
                        || (frequencyNumbers(a) ? "" : "—")}
                      {frequencyNumbers(a) && (
                        <p className="text-xs text-muted-foreground tabular-nums">{frequencyNumbers(a)}</p>
                      )}
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
        target={listTarget}
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
