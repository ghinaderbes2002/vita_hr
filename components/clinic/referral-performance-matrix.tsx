"use client";

// Visits against patients, one dot per source. The median lines cut the plane
// into four quadrants, which is the whole point: a source high on visits but low
// on patients is costing the team time, and one high on both is worth keeping.
import { useState } from "react";
import {
  REFERRAL_SOURCE_TYPE_LABEL, ReferralSource, ReferralSourceType, visitsCountOf,
} from "@/lib/api/clinic-referrals";

const W = 720;
const H = 380;
const PAD = { top: 16, right: 16, bottom: 40, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const TYPE_FILL: Record<ReferralSourceType, string> = {
  DOCTOR:      "#2563eb",
  HOSPITAL:    "#9333ea",
  ASSOCIATION: "#16a34a",
};
// Blue and purple are the weakest pair under colour-vision deficiency, so green
// sits between them in the legend and the dots carry a label on hover.
const TYPE_ORDER: ReferralSourceType[] = ["DOCTOR", "ASSOCIATION", "HOSPITAL"];

/** Round an axis maximum up to a clean tick value. */
function niceMax(n: number): number {
  if (n <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / (pow / 2)) * (pow / 2);
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function ReferralPerformanceMatrix({
  sources, onSelect, visitsOf = visitsCountOf,
}: {
  sources: ReferralSource[];
  onSelect?: (id: string) => void;
  /** Lets the page narrow the visit count, e.g. to one employee's visits. */
  visitsOf?: (s: ReferralSource) => number;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const points = sources.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    x: visitsOf(s),
    y: s.realPatientCount ?? 0,
    registered: s.patientCount ?? 0,
  }));

  const xMax = niceMax(Math.max(...points.map((p) => p.x), 0));
  const yMax = niceMax(Math.max(...points.map((p) => p.y), 0));
  const xMed = median(points.map((p) => p.x));
  const yMed = median(points.map((p) => p.y));

  const sx = (v: number) => PAD.left + (v / xMax) * PLOT_W;
  const sy = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H;

  const xTicks = [0, xMax / 4, xMax / 2, (xMax * 3) / 4, xMax];
  const yTicks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];
  const active = points.find((p) => p.id === hover);

  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="مصفوفة أداء مصادر الإحالة">
        {/* gridlines — hairline, one step off the surface */}
        {yTicks.map((t) => (
          <line key={`gy${t}`} x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)}
            stroke="currentColor" strokeWidth={1} className="text-border" />
        ))}
        {xTicks.map((t) => (
          <line key={`gx${t}`} y1={PAD.top} y2={PAD.top + PLOT_H} x1={sx(t)} x2={sx(t)}
            stroke="currentColor" strokeWidth={1} className="text-border/60" />
        ))}

        {/* median crosshair — the quadrant split */}
        <line x1={sx(xMed)} x2={sx(xMed)} y1={PAD.top} y2={PAD.top + PLOT_H}
          stroke="currentColor" strokeWidth={1.5} className="text-muted-foreground/50" />
        <line x1={PAD.left} x2={W - PAD.right} y1={sy(yMed)} y2={sy(yMed)}
          stroke="currentColor" strokeWidth={1.5} className="text-muted-foreground/50" />

        {/* quadrant captions, kept faint so the data stays loudest */}
        <text x={W - PAD.right - 6} y={PAD.top + 14} textAnchor="end"
          className="fill-muted-foreground text-[11px]">مصادر رابحة</text>
        <text x={W - PAD.right - 6} y={PAD.top + PLOT_H - 6} textAnchor="end"
          className="fill-muted-foreground text-[11px]">زيارات بلا مردود</text>
        <text x={PAD.left + 6} y={PAD.top + 14}
          className="fill-muted-foreground text-[11px]">مردود بجهد قليل</text>

        {/* axes */}
        {yTicks.map((t) => (
          <text key={`ty${t}`} x={PAD.left - 8} y={sy(t) + 4} textAnchor="end"
            className="fill-muted-foreground text-[10px] tabular-nums">{Math.round(t)}</text>
        ))}
        {xTicks.map((t) => (
          <text key={`tx${t}`} x={sx(t)} y={PAD.top + PLOT_H + 16} textAnchor="middle"
            className="fill-muted-foreground text-[10px] tabular-nums">{Math.round(t)}</text>
        ))}
        <text x={PAD.left + PLOT_W / 2} y={H - 6} textAnchor="middle"
          className="fill-muted-foreground text-[11px]">زيارات الفريق ←</text>
        <text transform={`translate(12 ${PAD.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle"
          className="fill-muted-foreground text-[11px]">مرضى فعليون ←</text>

        {/* dots — 2px surface ring so overlapping sources stay separable */}
        {points.map((p) => (
          <g key={p.id}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(p.id)}
            style={{ cursor: onSelect ? "pointer" : "default" }}>
            {/* generous invisible hit area */}
            <circle cx={sx(p.x)} cy={sy(p.y)} r={14} fill="transparent" />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={hover === p.id ? 8 : 6}
              fill={TYPE_FILL[p.type]} stroke="var(--card)" strokeWidth={2} />
          </g>
        ))}

        {/* one tooltip, for the hovered source only */}
        {active && (
          <g transform={`translate(${Math.min(sx(active.x) + 12, W - 190)} ${Math.max(sy(active.y) - 48, PAD.top)})`}>
            <rect width={178} height={44} rx={6} className="fill-popover stroke-border" strokeWidth={1} />
            <text x={8} y={17} className="fill-foreground text-[11px] font-semibold">{active.name}</text>
            <text x={8} y={33} className="fill-muted-foreground text-[10px]">
              {active.x} زيارة · {active.y} من {active.registered} مريضاً
            </text>
          </g>
        )}
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        {TYPE_ORDER.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_FILL[t] }} />
            {REFERRAL_SOURCE_TYPE_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
