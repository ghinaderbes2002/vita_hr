"use client";

// Professional day timeline: a time axis with appointments laid out as
// positioned blocks per department column. Free gaps read at a glance, a live
// "now" line marks the current time, overlapping bookings split side-by-side.
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/lib/api/clinic-appointments";

const DAY_START = 10 * 60;  // 10:00
const DAY_END = 18 * 60;    // 18:00
const HOUR_H = 72;          // px per hour
const SLOT_MIN = 30;        // gridline / label granularity (half-hour)
const SLOT_H = HOUR_H / 2;  // px per half-hour
const PAD = 16;             // top/bottom breathing room so 10:00 & 18:00 aren't clipped
const TOTAL_MIN = DAY_END - DAY_START;
const TOTAL_H = (TOTAL_MIN / 60) * HOUR_H;
const BODY_H = TOTAL_H + PAD * 2;

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
const fmtTime = (v?: string | null) =>
  v ? (v.length > 5 ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : v) : "";

type Placed = { a: Appointment; start: number; end: number; lane: number; lanes: number };

// Split a column's appointments into overlap clusters and assign side-by-side
// lanes so concurrent bookings never cover each other.
function layout(appts: Appointment[]): Placed[] {
  const items = appts
    .map((a) => {
      const s = toMinutes(a.startTime);
      let e = toMinutes(a.endTime);
      if (s == null) return null;
      if (e == null || e <= s) e = s + 30;
      return { a, start: Math.max(DAY_START, s), end: Math.min(DAY_END, Math.max(s + 15, e)) };
    })
    .filter((x): x is { a: Appointment; start: number; end: number } => !!x && x.end > DAY_START && x.start < DAY_END)
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
}

function Column({
  group, onSelect, resolveTherapist, hideEmptyLabel,
}: {
  group: TimelineGroup;
  onSelect: (a: Appointment) => void;
  resolveTherapist?: (a: Appointment) => string | null;
  hideEmptyLabel?: boolean;
}) {
  const t = useTranslations("clinic.appointments");
  const placed = layout(group.appointments);
  return (
    <div className="relative border-s border-border/70" style={{ height: BODY_H }}>
      {/* half-hour grid lines (full hours a touch darker) */}
      {Array.from({ length: TOTAL_MIN / SLOT_MIN + 1 }, (_, i) => (
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
        const top = PAD + ((start - DAY_START) / 60) * HOUR_H;
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
            title={`${fmtTime(a.startTime)} — ${fmtTime(a.endTime)}`}
            className={cn(
              "absolute overflow-hidden rounded-md border border-black/5 px-2 py-1 text-start shadow-sm ring-0 transition-all hover:z-10 hover:shadow-md dark:border-white/10",
              st.cls,
            )}
            style={{
              top, height,
              insetInlineStart: `calc(${lane * w}% + 2px)`,
              width: `calc(${w}% - 4px)`,
              borderInlineStartWidth: 3, borderInlineStartColor: st.bar,
            }}
          >
            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold leading-tight opacity-90">
              {fmtTime(a.startTime)}
            </div>
            <div className={cn("truncate text-xs font-semibold leading-tight", cancelled && "line-through")}>
              {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.patientName || "—")}
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
  groups, isToday, onSelect, resolveTherapist, hideEmptyLabel,
}: {
  groups: TimelineGroup[];
  isToday: boolean;
  onSelect: (a: Appointment) => void;
  resolveTherapist?: (a: Appointment) => string | null;
  hideEmptyLabel?: boolean;
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.appointments");
  const slots = Array.from({ length: TOTAL_MIN / SLOT_MIN + 1 }, (_, i) => DAY_START + i * SLOT_MIN);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= DAY_START && nowMin <= DAY_END;
  const nowTop = PAD + ((nowMin - DAY_START) / 60) * HOUR_H;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
      {/* status colour legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/20 px-3 py-2">
        {LEGEND_STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_STYLE[s].bar }} />
            {t(`statuses.${s}`)}
          </span>
        ))}
      </div>

      {/* column headers */}
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `56px repeat(${groups.length}, 1fr)` }}>
        <div />
        {groups.map((g) => {
          const count = g.appointments.filter((a) => a.status !== "CANCELLED").length;
          return (
            <div key={g.title} className="flex items-center gap-2 border-s border-border/70 px-3 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="truncate text-sm font-semibold">{g.title}</span>
              <span className="ms-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>

      {/* timeline body */}
      <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${groups.length}, 1fr)` }}>
        {/* time gutter */}
        <div className="relative" style={{ height: BODY_H }}>
          {slots.map((min, i) => (
            <div key={min} className="absolute inset-x-0 -translate-y-1/2 pe-2 text-end" style={{ top: PAD + i * SLOT_H }}>
              <span className={min % 60 === 0 ? "text-[10px] font-semibold text-muted-foreground" : "text-[9px] font-medium text-muted-foreground/60"}>{slotLabel(min)}</span>
            </div>
          ))}
        </div>

        {groups.map((g) => (
          <Column key={g.title} group={g} onSelect={onSelect} resolveTherapist={resolveTherapist} hideEmptyLabel={hideEmptyLabel} />
        ))}

        {/* now indicator — spans all department columns */}
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
