"use client";

// السجل الزمني للحالة: مدة كل مرحلة ثم الأحداث التفصيلية مع فلترة.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/shared/pagination";
import { cn } from "@/lib/utils";
import { useProstheticsCaseHistory } from "@/lib/hooks/use-clinic-prosthetics";
import { CaseStageEntry, TimelineEvent } from "@/lib/api/clinic-prosthetics";

const LIMIT = 50;

/** Radix rejects an empty option value, so "all" needs a sentinel. */
const ALL = "__all__";

/** The stages a case moves through, in order — the filter's options. */
const STAGES = [
  "INTAKE", "ASSESSMENT", "COMMITTEE_REVIEW", "FITTING", "SOCKET_TRIAL",
  "FOLLOW_UP", "FINAL_REVIEW", "DELIVERED", "CANCELLED",
];

/** Every status the messages translate — older events may carry one outside STAGES. */
const TRANSLATED_STATUSES = [
  ...STAGES, "COMMITTEE_APPROVED", "GAIT_ANALYSIS", "FINAL_EVALUATION", "CLOSED",
];

/** The types the server logs per operation, grouped as the case flows — the filter's options. */
const TYPES = [
  "CASE_CREATED", "CASE_UPDATED", "STATUS_CHANGED", "CASE_PDF",
  "ASSESSMENT_UPPER", "ASSESSMENT_LOWER",
  "ASSESSMENT_TRANSTIBIAL", "ASSESSMENT_TRANSFEMORAL", "ASSESSMENT_KNEE_DISARTICULATION",
  "ASSESSMENT_ANKLE_DISARTICULATION", "ASSESSMENT_HEMIPELVECTOMY", "ASSESSMENT_TRANSRADIAL",
  "ASSESSMENT_ELBOW_DISARTICULATION", "ASSESSMENT_TRANSHUMERAL",
  "COMMITTEE_ASSIGN", "COMMITTEE_OPINION", "COMMITTEE_DECIDE", "COMMITTEE_SIGN",
  "COMPONENTS", "COMPONENTS_BULK", "CONSUMABLES",
  "GAIT_ANALYSIS", "GAIT_ANALYSIS_SIGN", "GAIT_ANALYSIS_FORMS", "GAIT_ANALYSIS_FORMS_SAVE",
  "GAIT_ANALYSIS_FORMS_ARCHIVE",
  "BALANCE_ASSESSMENT", "BALANCE_ASSESSMENT_SAVE", "BALANCE_ASSESSMENT_ARCHIVE",
  "TREATMENT_PLAN", "SESSIONS_WORKSHOP", "SESSIONS_PT", "SESSIONS_MEDIA",
  "TREATMENT_PROGRAMS", "TREATMENT_PROGRAMS_ARCHIVE", "REVIEW_PROGRAM",
  "ALERT", "ALERTS_RESPOND",
  "PROSTHETIC_DELIVERY", "PROSTHETIC_DELIVERY_ITEMS", "PROSTHETIC_DELIVERY_ITEMS_APPROVE",
  "FINAL_DELIVERY", "DELIVERY", "DELIVERY_PATIENT_SIGN", "DELIVERY_MANAGER_SIGN",
  "FINAL_EVALUATION", "FINAL_EVALUATION_DIRECTOR_SIGN",
  "FOLLOW_UPS", "ATTACHMENTS",
];

/**
 * Types the server derived from older records, before per-operation logging.
 * Still translated, but left out of the filter — they stop appearing over time.
 */
const LEGACY_TYPES = [
  "COMMITTEE_DECISION", "COMMITTEE_SIGNED", "COMPONENT_ADDED", "FITTING",
  "WORKSHOP_SESSION", "PT_SESSION", "MEDIA_SESSION", "CONSUMABLE_USED", "GAIT_SIGNED",
  "DIRECTOR_SIGNED", "MANAGER_SIGNED", "PATIENT_SIGNED", "DELIVERY_MANAGER_SIGNED", "FOLLOW_UP",
];

/** Anything newer than these falls back to the server's title. */
const TRANSLATED_TYPES = [...TYPES, ...LEGACY_TYPES];

/** STATUS_CHANGE is left out: the stage arrow already says it. */
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "SIGN", "ARCHIVE", "APPROVE", "RESPOND", "EXPORT"];
const SIDES = ["RIGHT", "LEFT", "BILATERAL"];

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—";

/** Minutes the case spent (or has spent so far) in a stage; null when unknown. */
const minutesIn = (s: CaseStageEntry): number | null => {
  if (s.durationMinutes != null) return s.durationMinutes;
  if (!s.enteredAt) return null;
  const end = s.exitedAt ? new Date(s.exitedAt).getTime() : Date.now();
  return Math.max(0, (end - new Date(s.enteredAt).getTime()) / 60_000);
};

const show = (v: unknown) => (v == null || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** The server swaps an oversized value (romData and the like) for this marker. */
const isTruncated = (v: unknown) =>
  typeof v === "object" && v !== null && (v as { truncated?: unknown }).truncated === true;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const clip = (s: string) => (s.length > 120 ? `${s.slice(0, 120)}…` : s);

export function ProstheticsCaseHistory({ caseId, isRtl }: { caseId: string; isRtl: boolean }) {
  const t = useTranslations("clinic.prosthetics.case.page.history");
  const tStatus = useTranslations("clinic.prosthetics.statuses");
  const [stage, setStage] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProstheticsCaseHistory(caseId, {
    stage: stage !== ALL ? stage : undefined,
    type: type !== ALL ? type : undefined,
    page,
    limit: LIMIT,
  });

  const stages = data?.stages ?? [];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const isFiltered = stage !== ALL || type !== ALL;

  const stageLabel = (s?: string | null) => (s ? (TRANSLATED_STATUSES.includes(s) ? tStatus(s) : s) : "—");
  const typeLabel = (ev: TimelineEvent) =>
    TRANSLATED_TYPES.includes(ev.type) ? t(`types.${ev.type}`) : ev.title || ev.type;

  /** One side of a field change, as a person would read it. */
  const showChange = (v: unknown): string => {
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return v ? t("yes") : t("no");
    if (typeof v === "string" && ISO_DATE.test(v)) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return v;
      // A date-only field arrives as midnight UTC — the time would be noise.
      return /T00:00:00(\.000)?Z$/.test(v) ? d.toLocaleDateString("en-GB", { timeZone: "UTC" }) : fmtDateTime(v);
    }
    if (Array.isArray(v)) {
      return v.every((x) => typeof x !== "object" || x === null)
        ? clip(v.map((x) => showChange(x)).join("، "))
        : t("dataChanged");
    }
    if (typeof v === "object") return clip(JSON.stringify(v));
    return clip(String(v));
  };

  const fmtDuration = (min: number) => {
    if (min < 1) return t("lessThanMinute");
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = Math.floor(min % 60);
    const parts: string[] = [];
    if (d) parts.push(t("days", { count: d }));
    if (h) parts.push(t("hours", { count: h }));
    // Minutes are noise once a stage has run for days.
    if (!d && m) parts.push(t("minutes", { count: m }));
    return parts.join(" ");
  };

  const durations = stages.map(minutesIn);
  const longest = Math.max(1, ...durations.map((d) => d ?? 0));
  const totalMinutes = durations.reduce<number>((sum, d) => sum + (d ?? 0), 0);
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-4">
      {/* ── Stage durations ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("stagesTitle")}</h3>
          {totalMinutes > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("totalDuration")}: <span className="font-medium text-foreground">{fmtDuration(totalMinutes)}</span>
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : stages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("noStages")}</p>
        ) : (
          <div className="space-y-2">
            {stages.map((s, i) => {
              const minutes = durations[i];
              const current = !s.exitedAt;
              return (
                <div
                  key={`${s.stage}-${s.enteredAt ?? i}`}
                  className={cn("rounded-md border p-3 space-y-2", current && "border-primary/50 bg-primary/5")}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{stageLabel(s.stage)}</span>
                      {current && <Badge className="text-[10px]">{t("current")}</Badge>}
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {minutes != null ? fmtDuration(minutes) : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", current ? "bg-primary" : "bg-primary/40")}
                      style={{ width: `${minutes != null ? Math.max(2, (minutes / longest) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 tabular-nums">
                      {s.enteredAt ? fmtDateTime(s.enteredAt) : t("beforeTracking")}
                      <Arrow className="h-3 w-3" />
                      {current ? t("now") : fmtDateTime(s.exitedAt)}
                    </span>
                    {s.enteredByName && <span>{t("enteredBy")}: {s.enteredByName}</span>}
                    {s.exitedByName && <span>{t("exitedBy")}: {s.exitedByName}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Events ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("eventsTitle")}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={stage} onValueChange={(v) => { setStage(v); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allStages")}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{tStatus(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allTypes")}</SelectItem>
                {TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`types.${ty}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{isFiltered ? t("noMatch") : t("noEvents")}</p>
        ) : (
          <div className="relative space-y-3 ps-4">
            <div className="absolute start-2 top-0 bottom-0 w-0.5 bg-border" />
            {items.map((ev) => {
              const meta = (ev.metadata ?? {}) as Record<string, unknown>;
              const isStatusChange = ev.type === "STATUS_CHANGED" && !!meta.toStatus;
              // What the operation touched: the stock item, the side, the fields sent.
              const item = [meta.partName ?? meta.consumableName, meta.partCode && `(${meta.partCode})`]
                .filter(Boolean).join(" ");
              const side = typeof meta.side === "string" ? meta.side : "";
              const fields = Array.isArray(meta.fields) ? (meta.fields as unknown[]).map(String) : [];
              return (
                <div key={ev.id} className="relative">
                  <div className="absolute -start-2.75 top-4 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{typeLabel(ev)}</p>
                        {ev.action && ACTIONS.includes(ev.action) && (
                          <Badge
                            variant={ev.action === "DELETE" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {t(`actions.${ev.action}`)}
                          </Badge>
                        )}
                        {ev.stage && (
                          <Badge variant="outline" className="text-[10px]">{stageLabel(ev.stage)}</Badge>
                        )}
                        {/* Rebuilt from the old operations log: no stage, no diff, and
                            it may rarely be a save attempt that failed at the time. */}
                        {meta.backfilled === true && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground" title={t("backfilledHint")}>
                            {t("backfilled")}
                          </Badge>
                        )}
                        {meta.source === "AUTO" && (
                          <Badge variant="secondary" className="text-[10px]">{t("auto")}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{fmtDateTime(ev.date)}</span>
                    </div>

                    {isStatusChange && (
                      <p className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">{stageLabel(meta.fromStatus as string)}</span>
                        <Arrow className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{stageLabel(meta.toStatus as string)}</span>
                      </p>
                    )}
                    {typeof meta.reason === "string" && meta.reason && (
                      <p className="text-xs text-muted-foreground">{t("reason")}: {meta.reason}</p>
                    )}
                    {ev.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{ev.description}</p>
                    )}
                    {(item || meta.quantity != null || side) && (
                      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                        {item && <span className="font-medium">{item}</span>}
                        {meta.quantity != null && (
                          <span className="text-muted-foreground">{t("quantity")}: {show(meta.quantity)}</span>
                        )}
                        {side && (
                          <span className="text-muted-foreground">
                            {t("side")}: {SIDES.includes(side) ? t(`sides.${side}`) : side}
                          </span>
                        )}
                      </p>
                    )}
                    {/* Once the diff is there, the bare field list only repeats it. */}
                    {fields.length > 0 && !ev.changes?.length && (
                      <p className="text-xs text-muted-foreground wrap-break-word" dir="auto">
                        {t("fields")}: <span className="font-mono" dir="ltr">{fields.join(", ")}</span>
                      </p>
                    )}

                    {!!ev.changes?.length && (
                      <ul className="space-y-1 rounded-md bg-muted/40 p-2 text-xs">
                        {ev.changes.map((c, i) => (
                          <li key={`${c.field}-${i}`} className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-medium" dir="ltr">{c.field}</span>
                            {isTruncated(c.oldValue) || isTruncated(c.newValue) ? (
                              <span className="text-muted-foreground">{t("dataChanged")}</span>
                            ) : (
                              <>
                                <span className="text-muted-foreground line-through wrap-break-word">
                                  {showChange(c.oldValue)}
                                </span>
                                <Arrow className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="font-medium wrap-break-word">{showChange(c.newValue)}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {ev.actorName && (
                      <p className="text-xs text-muted-foreground">
                        {t("by")}: {ev.actorName}{ev.actorRole ? ` (${ev.actorRole})` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total > LIMIT && (
          <Pagination
            page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
