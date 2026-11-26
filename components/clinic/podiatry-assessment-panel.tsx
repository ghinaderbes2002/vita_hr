"use client";

// One assessment form of a reception, read and written in place: the same fields
// switch from marks to controls when "تعديل" is pressed, so nothing covers the
// sheet while it is being filled in. A reception may hold several forms — POST
// adds a new one, PATCH edits the one shown. Each form carries its own fitting
// state (غير محدد / لم يُركَّب / رُكِّب).
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, CircleHelp, Footprints, Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  useCreatePodiatrySession, useSetPodiatryInstallStatus, useUpdatePodiatrySession,
} from "@/lib/hooks/use-clinic-podiatry";
import { PodiatryInstallStatus, PodiatrySession } from "@/lib/api/clinic-podiatry";
import {
  AssessmentValue, PodiatryAssessmentFields, assessmentOf, assessmentToDto, emptyAssessment,
  missingAssessmentFields,
} from "./podiatry-assessment-fields";
import { FormT } from "./podiatry-session-schema";

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

/** Old forms only carry the stamp; the API maps them, this covers a stale build of it. */
export const installStatusOf = (s?: PodiatrySession | null): PodiatryInstallStatus | null =>
  s?.installStatus ?? (s?.installedAt ? "INSTALLED" : null);

const UNSET = "UNSET";

/** The three fitting states as a segmented control — same colours as the list's stats. */
const STATUS_OPTIONS: {
  value: string; labelKey: string; icon: typeof CheckCircle2; on: string; iconCls: string;
}[] = [
  { value: UNSET, labelKey: "statusUnset", icon: CircleHelp, iconCls: "text-slate-500", on: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" },
  { value: "NOT_INSTALLED", labelKey: "statusNotInstalled", icon: CircleDashed, iconCls: "text-amber-600", on: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "INSTALLED", labelKey: "statusInstalled", icon: CheckCircle2, iconCls: "text-emerald-600", on: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
];

export function PodiatryAssessmentPanel({
  receptionId, session, title, actions, state = "ready", onRetry, onClose, onInstalled,
}: {
  /**
   * Whether the sessions request has answered. Until it has — or if it failed —
   * the panel offers no editing: the page cannot tell what is really stored.
   */
  state?: "loading" | "error" | "ready";
  onRetry?: () => void;
  receptionId: string;
  /** The saved form, or null for a new one — which opens straight in editing. */
  session: PodiatrySession | null;
  title: string;
  /** Rendered next to the edit button — the PDF export, for example. */
  actions?: React.ReactNode;
  /** A new form was saved or abandoned. */
  onClose?: () => void;
  /** The form was just marked as fitted. */
  onInstalled?: () => void;
}) {
  const isNew = !session;
  // A new form opens straight in editing — but never in place of forms not loaded yet.
  const [editing, setEditing] = useState(isNew && state === "ready");
  const [form, setForm] = useState<AssessmentValue>(emptyAssessment);

  const t = useTranslations("clinic.podiatry.form.panel");
  // نفس مترجم الورقة، ليخرج اسم كل حقل ناقص بالصيغة المعروضة فيها.
  const tForm = useTranslations("clinic.podiatry.form") as unknown as FormT;
  const missing = missingAssessmentFields(form, tForm);
  const { hasPermission, isAdmin } = usePermissions();
  const canSetStatus = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PODIATRY.SESSION_EDIT);

  const create = useCreatePodiatrySession();
  const update = useUpdatePodiatrySession();
  const setStatus = useSetPodiatryInstallStatus();
  const saving = create.isPending || update.isPending;

  const status = installStatusOf(session);

  const startEditing = () => {
    setForm(assessmentOf(session));
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    if (isNew) onClose?.();
  };

  const handleSave = async () => {
    const dto = assessmentToDto(form);
    if (session) {
      await update.mutateAsync({ receptionId, sessionId: session.id, dto });
      setEditing(false);
    } else {
      await create.mutateAsync({ receptionId, dto });
      onClose?.();
    }
  };

  const changeStatus = (v: string) => {
    if (!session) return;
    const next = v === UNSET ? null : (v as PodiatryInstallStatus);
    if (next === status) return;
    setStatus.mutate(
      { receptionId, sessionId: session.id, installStatus: next },
      { onSuccess: () => { if (next === "INSTALLED") onInstalled?.(); } },
    );
  };

  // Reading shows the stored form; editing shows the draft being typed.
  const shown = editing ? form : assessmentOf(session);

  return (
    <Card className={isNew ? "border-orange-300" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base">{title}</CardTitle>
            {session && <span className="text-xs text-muted-foreground">{fmt(session.createdAt)}</span>}
            {/* Who typed the form in — not necessarily the clinician signing it. */}
            {!editing && session?.createdByName && (
              <span className="text-xs text-muted-foreground">{t("filledBy")}: {session.createdByName}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!editing && actions}
            {editing ? (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={saving} onClick={cancel}>
                  <X className="h-3.5 w-3.5" />
                  {t("cancel")}
                </Button>
                <Button size="sm" className="gap-1.5" disabled={saving || missing.length > 0} onClick={handleSave}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {t("save")}
                </Button>
              </>
            ) : state !== "ready" || !session ? null : (
              <ActionGuard permission={PERMISSIONS.CLINIC_PODIATRY.SESSION_EDIT}>
                <Button size="sm" className="gap-1.5" onClick={startEditing}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("edit")}
                </Button>
              </ActionGuard>
            )}
          </div>
        </div>

        {/* Fitting state of this form. */}
        {session && !editing && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Footprints className="h-4 w-4 text-muted-foreground" />
              {t("installStatus")}
            </span>
            {canSetStatus ? (() => {
              // The trigger takes the chosen state's colour and icon.
              const current = STATUS_OPTIONS.find((o) => o.value === (status ?? UNSET)) ?? STATUS_OPTIONS[0];
              return (
                <Select value={current.value} onValueChange={changeStatus} disabled={setStatus.isPending}>
                  <SelectTrigger className={`h-9 w-44 gap-2 rounded-lg border text-sm font-medium shadow-none ${current.on}`}>
                    <span className="flex items-center gap-2">
                      <current.icon className="h-4 w-4" />
                      {t(current.labelKey)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="py-2">
                        <span className="flex items-center gap-2">
                          <o.icon className={`h-4 w-4 ${o.iconCls}`} />
                          {t(o.labelKey)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })() : (
              <StatusBadge status={status} t={t} />
            )}
            {setStatus.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === "INSTALLED" && session.installedAt && (
              <span className="ms-auto inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {fmt(session.installedAt)}
                {session.installedByName ? ` — ${session.installedByName}` : ""}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Why "save" is still disabled: the required fields left to fill, by the
            names they carry on the sheet. */}
        {editing && missing.length > 0 && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">{t("missingFields")}: </span>
            {[...new Set(missing)].join("، ")}
          </p>
        )}
        {state === "loading" && !editing ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingForm")}
          </div>
        ) : state === "error" && !editing ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-6 text-center">
            <p className="text-sm font-medium text-destructive">{t("loadFailed")}</p>
            <p className="max-w-md text-xs text-muted-foreground">{t("loadFailedHint")}</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>{t("retry")}</Button>
            )}
          </div>
        ) : (
          <PodiatryAssessmentFields value={shown} onChange={setForm} readOnly={!editing} />
        )}
      </CardContent>

    </Card>
  );
}

function StatusBadge({ status, t }: { status: PodiatryInstallStatus | null; t: (k: string) => string }) {
  if (status === "INSTALLED") {
    return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">{t("statusInstalled")}</Badge>;
  }
  if (status === "NOT_INSTALLED") {
    return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">{t("statusNotInstalled")}</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">{t("statusUnset")}</Badge>;
}
