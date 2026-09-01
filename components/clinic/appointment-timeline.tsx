"use client";

// Professional day timeline: a time axis with appointments laid out as
// positioned blocks per column. Free gaps read at a glance, a live "now" line
// marks the current time, overlapping bookings split side-by-side.
import { useLocale, useTranslations } from "next-intl";
import { cn, formatClinicTime } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/lib/api/clinic-appointments";

// The axis is always the clinic day, whatever the bookings say.
const DEFAULT_START = 10 * 60; // 10:00
const DEFAULT_END = 18 * 60;   // 18:00
const HOUR_H = 88;             // px per hour — a 30-min booking still fits two lines
/** A lane narrower than this truncates the patient's name to nothing useful. */
const MIN_LANE_W = 96;         // px
/** Floor for a column with no crowding, so quiet days don't look stretched. */
const MIN_COL_W = 150;         // px
const SLOT_MIN = 30;           // gridline / label granularity (half-hour)
const SLOT_H = HOUR_H / 2;     // px per half-hour
const PAD = 16;                // top/bottom breathing room so the edges aren't clipped

type Win = { start: number; end: number };
const bodyHeight = (w: Win) => ((w.end - w.start) / 60) * HOUR_H + PAD * 2;

// "10", "10:30", "11" … afternoon in 12-hour form ("1", "6").
const slotLabel = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? String(h12) : `${h12}:30`;
};

const STATUS_STYLE: Record<AppointmentStatus, { bar: string; cls: string }> = {
  SCHEDULED:   { bar: "#3b82f6", cls: "bg-blue-50/90 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100" },
  CONFIRMED:   { bar: "#22c55e", cls: "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100" },
  COMPLETED:   { bar: "#6b7280", cls: "bg-gray-50/90 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200" },
  CANCELLED:   { bar: "#ef4444", cls: "bg-red-50/80 dark:bg-red-950/40 text-red-800/70 dark:text-red-200/70" },
  NO_SHOW:     { bar: "#f97316", cls: "bg-orange-50/90 dark:bg-orange-950/50 text-orange-950 dark:text-orange-100" },
  RESCHEDULED: { bar: "#a855f7", cls: "bg-purple-50/90 dark:bg-purple-950/50 text-purple-950 dark:text-purple-100" },
};

// Order shown in the colour legend.
const LEGEND_STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];

function toMinutes(v?: string | null): number | null {
  if (!v) return null;
  if (v.length > 5) { const d = new Date(v); return d.getHours() * 60 + d.getMinutes(); }
  const m = /^(\d{1,2}):(\d{2})/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
const fmtTime = formatClinicTime;

const patientOf = (a: Appointment) =>
  a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.patientName || "—");

/**
 * The axis is fixed to the clinic day. It deliberately does not stretch to reach
 * an out-of-hours booking: one 2 a.m. entry used to blow the grid out to sixteen
 * hours and push the working day below the fold.
 */
const CLINIC_WINDOW: Win = { start: DEFAULT_START, end: DEFAULT_END };

type Placed = { a: Appointment; start: number; end: number; lane: number; lanes: number };

/**
 * Widest stack of overlapping bookings in a column. Splitting a fixed column
 * between four of them leaves ~55px each and every name truncates, so instead
 * the grid grows and the page scrolls — nothing is hidden behind anything.
 */
const maxLanesIn = (appts: Appointment[], win: Win) =>
  layout(appts, win).reduce((mx, p) => Math.max(mx, p.lanes), 1);

// Split a column's appointments into overlap clusters and assign side-by-side
// lanes so concurrent bookings never cover each other.
function layout(appts: Appointment[], win: Win): Placed[] {
  const items = appts
    .map((a) => {
      const s = toMinutes(a.startTime);
      let e = toMinutes(a.endTime);
      if (s == null) return null;
      if (e == null || e <= s) e = s + 30;
      return { a, start: Math.max(win.start, s), end: Math.min(win.end, Math.max(s + 15, e)) };
    })
    .filter((x): x is { a: Appointment; start: number; end: number } => !!x && x.end > win.start && x.start < win.end)
    .sort((x, y) => x.start - y.start || x.end - y.end);

  const out: Placed[] = [];
  let cluster: { a: Appointment; start: number; end: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    const laned = cluster.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end); } else laneEnds[lane] = it.end;
      return { ...it, lane };
    });
    const lanes = laneEnds.length;
    laned.forEach((it) => out.push({ ...it, lanes }));
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

export interface TimelineGroup {
  title: string;
  color: string;   // header accent
  appointments: Appointment[];
  /** Marks the column as the current day so it reads apart from the rest. */
  isToday?: boolean;
  /** Secondary line under the title (a date, a room, …). */
  subtitle?: string;
}

function Column({
  group, win, onSelect, resolveTherapist, hideEmptyLabel,
}: {
  group: TimelineGroup;
  win: Win;
  onSelect: (a: Appointment) => void;
  resolveTherapist?: (a: Appointment) => string | null;
  hideEmptyLabel?: boolean;
}) {
  const t = useTranslations("clinic.appointments");
  const placed = layout(group.appointments, win);
  const slots = (win.end - win.start) / SLOT_MIN;
  return (
    <div
      className={cn("relative border-s border-border/70", group.isToday && "bg-primary/4")}
      style={{ height: bodyHeight(win) }}
    >
      {/* half-hour grid lines (full hours a touch darker) */}
      {Array.from({ length: slots + 1 }, (_, i) => (
        <div
          key={i}
          className={`absolute inset-x-0 border-t ${i % 2 === 0 ? "border-border/60" : "border-border/25"}`}
          style={{ top: PAD + i * SLOT_H }}
        />
      ))}
      {placed.length === 0 && !hideEmptyLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">{t("emptyDay")}</span>
        </div>
      )}
      {placed.map(({ a, start, end, lane, lanes }) => {
        const top = PAD + ((start - win.start) / 60) * HOUR_H;
        const height = Math.max(22, ((end - start) / 60) * HOUR_H - 2);
        const w = 100 / lanes;
        const st = STATUS_STYLE[a.status];
        const cancelled = a.status === "CANCELLED";
        const therapist = resolveTherapist?.(a);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            title={`${fmtTime(a.startTime)} — ${a.isOpenEnded ? t("form.openEnded") : fmtTime(a.endTime)} · ${patientOf(a)}`}
            className={cn(
              "absolute cursor-pointer overflow-hidden rounded-md border border-black/5 px-2 py-1 text-start shadow-sm transition-all",
              "hover:z-10 hover:shadow-md focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "dark:border-white/10",
              st.cls,
            )}
            style={{
              top, height,
              insetInlineStart: `calc(${lane * w}% + 2px)`,
              width: `calc(${w}% - 4px)`,
              borderInlineStartWidth: 3, borderInlineStartColor: st.bar,
            }}
          >
            <div className="flex items-center gap-1 font-mono text-[10px] font-semibold leading-tight opacity-90">
              {fmtTime(a.startTime)}
              {/* An open-ended booking's endTime is the server's 15-minute buffer,
                  not a finish time — mark it rather than printing it. */}
              {a.isOpenEnded
                ? <span className="opacity-70">→</span>
                : height > 56 && a.endTime && <span className="opacity-70">— {fmtTime(a.endTime)}</span>}
            </div>
            <div className={cn("truncate text-xs font-semibold leading-tight", cancelled && "line-through")}>
              {patientOf(a)}
            </div>
            {height > 40 && (
              <div className="truncate text-[10px] leading-tight opacity-80">{t(`types.${a.appointmentType}`)}</div>
            )}
            {height > 40 && therapist && (
              <div className="truncate text-[10px] font-medium leading-tight text-primary/90">{therapist}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AppointmentTimeline({
  groups, isToday, onSelect, resolveTherapist, hideEmptyLabel, hideLegend,
}: {
  groups: TimelineGroup[];
  isToday: boolean;
  onSelect: (a: Appointment) => void;
  resolveTherapist?: (a: Appointment) => string | null;
  hideEmptyLabel?: boolean;
  /** Set when the page already shows the statuses elsewhere. */
  hideLegend?: boolean;
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.appointments");
  const win = CLINIC_WINDOW;
  const slots = Array.from({ length: (win.end - win.start) / SLOT_MIN + 1 }, (_, i) => win.start + i * SLOT_MIN);

  // Each column is sized by its own crowding, not by the busiest day on screen:
  // one packed Monday would otherwise stretch every quiet day with it and push
  // the week far off the edge.
  const columnWidths = groups.map((g) =>
    Math.max(MIN_COL_W, maxLanesIn(g.appointments, win) * MIN_LANE_W),
  );
  const gridTemplate = `56px ${columnWidths.map((w) => `${w}px`).join(" ")}`;
  const gridMinWidth = 56 + columnWidths.reduce((a, b) => a + b, 0);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= win.start && nowMin <= win.end;
  const nowTop = PAD + ((nowMin - win.start) / 60) * HOUR_H;

  return (
    <div
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ minWidth: gridMinWidth }}
    >
      {/* status colour legend */}
      {!hideLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/20 px-3 py-2">
          {LEGEND_STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_STYLE[s].bar }} />
              {t(`statuses.${s}`)}
            </span>
          ))}
        </div>
      )}

      {/* column headers */}
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: gridTemplate }}>
        <div />
        {groups.map((g) => {
          const count = g.appointments.filter((a) => a.status !== "CANCELLED").length;
          return (
            <div
              key={g.title}
              className={cn(
                "flex items-center gap-2 border-s border-border/70 px-3 py-2.5",
                g.isToday && "bg-primary/8",
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm", g.isToday ? "font-bold text-primary" : "font-semibold")}>{g.title}</p>
                {g.subtitle && <p className="truncate text-[10px] text-muted-foreground">{g.subtitle}</p>}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  count > 0 ? "bg-background text-foreground" : "text-muted-foreground/60",
                )}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* timeline body */}
      <div className="relative grid" style={{ gridTemplateColumns: gridTemplate }}>
        {/* time gutter */}
        <div className="relative" style={{ height: bodyHeight(win) }}>
          {slots.map((min, i) => (
            <div key={min} className="absolute inset-x-0 -translate-y-1/2 pe-2 text-end" style={{ top: PAD + i * SLOT_H }}>
              <span className={min % 60 === 0 ? "text-[10px] font-semibold text-muted-foreground" : "text-[9px] font-medium text-muted-foreground/60"}>{slotLabel(min)}</span>
            </div>
          ))}
        </div>

        {groups.map((g) => (
          <Column key={g.title} group={g} win={win} onSelect={onSelect} resolveTherapist={resolveTherapist} hideEmptyLabel={hideEmptyLabel} />
        ))}

        {/* now indicator — spans all columns */}
        {showNow && (
          <div
            className="pointer-events-none absolute z-20"
            style={{ top: nowTop, insetInlineStart: 56, insetInlineEnd: 0 }}
          >
            <div className="relative border-t-2 border-red-500">
              <span className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rounded-full bg-red-500 shadow"
                style={{ insetInlineStart: 0 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
