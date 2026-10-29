"use client";

// The headline figures of the referral sales dashboard: who leads across all
// sources, how the team did this month, the six-month trend, and the leaders
// within each source type.
import { useState } from "react";
import { Activity, CalendarClock, Gauge, Star, Trophy, Users } from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  REFERRAL_SOURCE_TYPE_LABEL, ReferralSourceType, ReferralStats,
} from "@/lib/api/clinic-referrals";

// The same hues the rest of the sales page uses: blue for patients, teal for visits.
const C_REFERRALS = "#1d4ed8";
const C_VISITS = "#0d9488";
const TYPE_ORDER: ReferralSourceType[] = ["DOCTOR", "HOSPITAL", "ASSOCIATION", "OTHER"];

/** "2026-05" → "05/2026". */
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${mo}/${y}` : m;
};

function LeaderTile({
  icon: Icon, label, name, type, value, onClick,
}: {
  icon: React.ElementType;
  label: string;
  name?: string;
  type?: ReferralSourceType;
  value?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border p-3 text-start transition-colors enabled:hover:bg-muted/50"
    >
      <div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {name ? (
          <>
            <p className="truncate font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">
              {type && REFERRAL_SOURCE_TYPE_LABEL[type]}
              {value != null && <> · <span className="font-medium tabular-nums text-foreground">{value}</span></>}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
    </button>
  );
}

/** One measure per chart — referrals and visits never share an axis. */
function TrendChart({
  title, data, dataKey, color,
}: {
  title: string;
  data: { label: string; referrals: number; visits: number }[];
  dataKey: "referrals" | "visits";
  color: string;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </p>
      <div className="h-44 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => [v, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ReferralSalesInsights({
  stats, isLoading, onOpenSource,
}: {
  stats?: ReferralStats;
  isLoading: boolean;
  onOpenSource: (id: string) => void;
}) {
  const [type, setType] = useState<ReferralSourceType>("DOCTOR");

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!stats) return null;

  const { summary, byTypeRanking, monthlyTrend = [] } = stats;
  const trend = monthlyTrend.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const ranking = byTypeRanking?.[type];
  const top10 = ranking?.top10ThisMonth ?? [];
  const maxThisMonth = Math.max(1, ...top10.map((r) => r.referralsThisMonth));
  const open = (id?: string) => (id ? () => onOpenSource(id) : undefined);

  return (
    <div className="space-y-4">
      {/* ── ملخص عام عبر كل الأنواع ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LeaderTile
          icon={Star} label="الأعلى تقييماً"
          name={summary?.topRating?.name} type={summary?.topRating?.type}
          value={summary?.topRating ? `${summary.topRating.rating} / 5` : undefined}
          onClick={open(summary?.topRating?.id)}
        />
        <LeaderTile
          icon={Users} label="الأكثر حالات"
          name={summary?.topCases?.name} type={summary?.topCases?.type}
          value={summary?.topCases ? `${summary.topCases.patientCount} مريض` : undefined}
          onClick={open(summary?.topCases?.id)}
        />
        <LeaderTile
          icon={CalendarClock} label="الأكثر زيارة"
          name={summary?.topVisits?.name} type={summary?.topVisits?.type}
          value={summary?.topVisits ? `${summary.topVisits.visitCount} زيارة` : undefined}
          onClick={open(summary?.topVisits?.id)}
        />
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <div className="rounded-lg bg-muted p-2"><Activity className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <p className="text-xs text-muted-foreground">زيارات الفريق هذا الشهر</p>
            <p className="text-3xl font-bold tabular-nums leading-tight">{stats.teamVisitsThisMonth ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── الخط البياني الشهري ── */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="font-semibold">الاتجاه الشهري</p>
              <p className="mt-1 text-xs text-muted-foreground">آخر {trend.length || 6} أشهر، الشهر الحالي ضمنها</p>
            </div>
            {trend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <TrendChart title="الإحالات" data={trend} dataKey="referrals" color={C_REFERRALS} />
                <TrendChart title="زيارات الفريق" data={trend} dataKey="visits" color={C_VISITS} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── الترتيب داخل كل نوع ── */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">الأفضل حسب النوع</p>
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                {TYPE_ORDER.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    aria-pressed={type === t}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      type === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {REFERRAL_SOURCE_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <LeaderTile
              icon={Gauge} label="الأعلى كثافة حالات"
              name={ranking?.topByDensity?.name}
              value={ranking?.topByDensity ? `${Number(ranking.topByDensity.densityPercent).toFixed(1)}% من مرضى النوع` : undefined}
              onClick={open(ranking?.topByDensity?.id)}
            />

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" />
                أفضل 10 هذا الشهر (عدد الإحالات)
              </p>
              {top10.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">لا توجد إحالات هذا الشهر.</p>
              ) : (
                <ol className="divide-y">
                  {top10.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onOpenSource(r.id)}
                        className="flex w-full items-center gap-2 rounded py-1.5 text-start hover:bg-muted/50"
                        title={`${r.name}: ${r.referralsThisMonth} إحالة`}
                      >
                        <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                        <span className="w-36 shrink-0 truncate text-xs font-medium">{r.name}</span>
                        <span className="h-3 flex-1">
                          <span
                            className="block h-3 rounded-e-[4px]"
                            style={{ width: `${(r.referralsThisMonth / maxThisMonth) * 100}%`, backgroundColor: C_REFERRALS }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-end text-xs font-semibold tabular-nums">{r.referralsThisMonth}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
