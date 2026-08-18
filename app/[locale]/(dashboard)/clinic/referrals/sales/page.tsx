"use client";

// Sales dashboard over the referral sources: the size of each channel, which
// sources actually bring patients in, and how much visiting it took.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageGuard } from "@/components/permissions";
import { ReferralPerformanceMatrix } from "@/components/clinic/referral-performance-matrix";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useReferralStats } from "@/lib/hooks/use-clinic-referrals";
import {
  REFERRAL_SOURCE_TYPES, REFERRAL_SOURCE_TYPE_LABEL, ReferralSourceType, ReferralStats, visitsCountOf,
} from "@/lib/api/clinic-referrals";

const TYPE_BADGE: Record<ReferralSourceType, string> = {
  DOCTOR:      "border-blue-300 bg-blue-50 text-blue-700",
  HOSPITAL:    "border-purple-300 bg-purple-50 text-purple-700",
  ASSOCIATION: "border-green-300 bg-green-50 text-green-700",
};

// Two shades of one hue for the patient split: the segments are parts of the
// same total, and a lightness split stays legible under every colour-vision
// type. The channel hues follow the badges already used across the module.
const C_ACTUAL = "#1d4ed8";
const C_PENDING = "#bfdbfe";
const C_VISITS = "#0d9488";
const TYPE_FILL: Record<ReferralSourceType, string> = {
  DOCTOR:      "#2563eb",
  HOSPITAL:    "#9333ea",
  ASSOCIATION: "#16a34a",
};
// Blue and purple are the weakest pair under colour-vision deficiency, so green
// is drawn between them — and every segment carries its own count as well.
const TYPE_ORDER: ReferralSourceType[] = ["DOCTOR", "ASSOCIATION", "HOSPITAL"];

type SortKey = "registered" | "actual" | "visits";
type ReferralStatsSource = ReferralStats["topSources"][number];

const SORT_LABEL: Record<SortKey, string> = {
  registered: "مرضى مسجّلون",
  actual: "مرضى فعليون",
  visits: "زيارات الفريق",
};

/** One row of a horizontal bar chart: label, track, value at the tip. */
function BarRow({
  label, sublabel, children, value, onClick,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
  value: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-1.5 ${onClick ? "cursor-pointer rounded hover:bg-muted/50" : ""}`}
      onClick={onClick}
    >
      <div className="w-40 shrink-0 text-end">
        <p className="truncate text-xs font-medium">{label}</p>
        {sublabel && <p className="truncate text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
      <div className="h-5 flex-1">{children}</div>
      <div className="w-24 shrink-0 text-start text-xs tabular-nums">{value}</div>
    </div>
  );
}

export default function ReferralSalesPage() {
  const router = useRouter();
  const locale = useLocale();

  const { data: stats, isLoading } = useReferralStats();

  const [sortBy, setSortBy] = useState<SortKey>("registered");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const metricOf = (s: ReferralStatsSource) =>
    sortBy === "registered" ? (s.patientCount ?? 0)
      : sortBy === "actual" ? (s.realPatientCount ?? 0)
        : visitsCountOf(s);

  // Both charts list the same sources in the same order, so a row can be read
  // across them — visits on one line against the patients they produced.
  const rows = (stats?.topSources ?? [])
    .filter((s) => !hideEmpty || (s.patientCount ?? 0) > 0)
    .sort((a, b) => metricOf(b) - metricOf(a))
    .slice(0, 10);

  // Each chart is scaled to its own measure — patients and visits are different
  // quantities and must never share one axis.
  const maxPatients = Math.max(1, ...rows.map((s) => s.patientCount ?? 0));
  const maxVisits = Math.max(1, ...rows.map(visitsCountOf));

  // The API only returns the leading sources, so the summary is explicitly about
  // those rather than pretending to be a centre-wide total.
  const sumRegistered = rows.reduce((n, s) => n + (s.patientCount ?? 0), 0);
  const sumActual = rows.reduce((n, s) => n + (s.realPatientCount ?? 0), 0);
  const sumVisits = rows.reduce((n, s) => n + visitsCountOf(s), 0);
  const conversion = sumRegistered ? Math.round((sumActual / sumRegistered) * 100) : null;

  const countOfType = (t: ReferralSourceType) =>
    stats?.byType.find((b) => b.type === t)?._count.id ?? 0;
  const totalSources = REFERRAL_SOURCE_TYPES.reduce((n, t) => n + countOfType(t), 0);

  const openSource = (id: string) => router.push(`/${locale}/clinic/referrals/${id}`);

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.STATS_VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="الإحصائيات"
          description="أداء مصادر الإحالة: زيارات الفريق وما ينتج عنها من مرضى"
        />

        {/* ── الخلاصة: رقم رئيسي + مقياس نسبة التحويل ── */}
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <div className="flex flex-wrap gap-8">
                  {[
                    { label: "زيارات الفريق", value: sumVisits, color: C_VISITS },
                    { label: "مرضى مسجّلون", value: sumRegistered, color: C_PENDING },
                    { label: "مرضى فعليون", value: sumActual, color: C_ACTUAL },
                  ].map((k) => (
                    <div key={k.label} className="border-s-2 ps-3" style={{ borderColor: k.color }}>
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <p className="text-4xl font-bold tabular-nums leading-tight">{k.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col justify-center gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">نسبة من دخل خدمة فعلاً</span>
                    <span className="text-lg font-bold tabular-nums">
                      {conversion === null ? "—" : `${conversion}%`}
                    </span>
                  </div>
                  {/* meter: filled part is the actual patients, the track the rest */}
                  <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: C_PENDING }}>
                    <div
                      className="h-full rounded-e-full"
                      style={{ width: `${conversion ?? 0}%`, backgroundColor: C_ACTUAL }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {sumActual} من {sumRegistered} مريضاً — ضمن المصادر المعروضة أدناه
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── مصفوفة الأداء + توزيع القنوات ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <Card>
            <CardContent className="space-y-2 pt-4">
              <div>
                <p className="font-semibold">مصفوفة الأداء</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  كل نقطة مصدر. الخطان المتوسطان يقسمان اللوحة: أعلى اليمين مصادر تستحق الزيارات،
                  وأسفل اليمين زيارات كثيرة بلا مردود.
                </p>
              </div>
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={<Trophy className="h-8 w-8 text-muted-foreground" />}
                  title="لا توجد بيانات بعد"
                  description="سجّل زيارات لمصادر الإحالة حتى يظهر أداؤها هنا."
                />
              ) : (
                <ReferralPerformanceMatrix sources={rows} onSelect={openSource} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">القنوات</p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-lg font-bold tabular-nums text-foreground">{totalSources}</span> مصدر
                </p>
              </div>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : totalSources === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">لا توجد مصادر مسجّلة.</p>
              ) : (
                <div className="space-y-3">
                  {TYPE_ORDER.map((t) => {
                    const n = countOfType(t);
                    const share = totalSources ? Math.round((n / totalSources) * 100) : 0;
                    return (
                      <div key={t} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TYPE_FILL[t] }} />
                            <span className="text-muted-foreground">{REFERRAL_SOURCE_TYPE_LABEL[t]}</span>
                          </span>
                          <span className="tabular-nums">
                            <span className="font-bold">{n}</span>
                            <span className="text-muted-foreground"> · {share}%</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-e-full"
                            style={{ width: `${share}%`, backgroundColor: TYPE_FILL[t] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* One control drives both charts and the table, so the ordering stays
            comparable across them. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">الترتيب حسب</span>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortBy(k)}
              aria-pressed={sortBy === k}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sortBy === k ? "bg-muted font-semibold ring-1 ring-border" : "hover:bg-muted/60"
              }`}
            >
              {SORT_LABEL[k]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHideEmpty((v) => !v)}
            aria-pressed={hideEmpty}
            className={`ms-auto rounded-md border px-2.5 py-1 text-xs transition-colors ${
              hideEmpty ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            إخفاء المصادر بلا مرضى
          </button>
        </div>

        {/* ── المرضى لكل مصدر: الفعليون جزء من المسجّلين، فالشريط مكدّس ── */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="font-semibold">المرضى لكل مصدر</p>
              <p className="mt-1 text-xs text-muted-foreground">
                «مرضى مسجّلون» كل من أُدرج باسم المصدر، و«مرضى فعليون» من دخل خدمة فعلاً —
                والفرق بينهما هم من لم يحضروا بعد.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: C_ACTUAL }} />
                  مرضى فعليون
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: C_PENDING }} />
                  لم يحضروا بعد
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1 w-4 rounded-full" style={{ backgroundColor: C_VISITS }} />
                  زيارات الفريق (شريط رفيع)
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-8 w-8 text-muted-foreground" />}
                title="لا توجد بيانات بعد"
                description="سجّل زيارات لمصادر الإحالة حتى يظهر أداؤها هنا."
              />
            ) : (
              <div className="divide-y">
                {rows.map((s) => {
                  const registered = s.patientCount ?? 0;
                  const actual = s.realPatientCount ?? 0;
                  const pending = Math.max(0, registered - actual);
                  const visits = visitsCountOf(s);
                  const pct = (n: number) => (n / maxPatients) * 100;
                  return (
                    <BarRow
                      key={s.id}
                      label={s.name}
                      sublabel={`${REFERRAL_SOURCE_TYPE_LABEL[s.type]}${s.city ? ` — ${s.city}` : ""}`}
                      onClick={() => openSource(s.id)}
                      value={
                        <>
                          <span className="font-bold" style={{ color: C_ACTUAL }}>{actual}</span>
                          <span className="text-muted-foreground"> / {registered}</span>
                        </>
                      }
                    >
                      {/* Patients on the main bar, the visits that produced them on a
                          thinner track beneath — two measures, two scales, never one axis.
                          2px surface gap between segments; only the far end is rounded. */}
                      <div className="flex h-full flex-col justify-center gap-1">
                        <div className="flex h-3.5 items-center gap-0.5">
                          {[
                            { n: actual, color: C_ACTUAL, title: `مرضى فعليون: ${actual}` },
                            { n: pending, color: C_PENDING, title: `لم يحضروا بعد: ${pending}` },
                          ]
                            .filter((seg) => seg.n > 0)
                            .map((seg, i, arr) => (
                              <div
                                key={seg.color}
                                className={`h-3.5 transition-opacity hover:opacity-80 ${
                                  i === arr.length - 1 ? "rounded-e-[4px]" : ""
                                }`}
                                style={{ width: `${pct(seg.n)}%`, backgroundColor: seg.color }}
                                title={seg.title}
                              />
                            ))}
                          {registered === 0 && <span className="text-[10px] text-muted-foreground">لا مرضى بعد</span>}
                        </div>
                        {visits > 0 && (
                          <div
                            className="h-1 rounded-e-full opacity-70"
                            style={{ width: `${(visits / maxVisits) * 100}%`, backgroundColor: C_VISITS }}
                            title={`زيارات الفريق: ${visits}`}
                          />
                        )}
                      </div>
                    </BarRow>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* الجدول بديل نصّي للمخططات — مطوي افتراضياً */}
        <Card>
          <CardContent className="pt-4">
            <button
              type="button"
              onClick={() => setTableOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-start"
            >
              <span className="text-sm font-semibold">عرض جدولي</span>
              {tableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {tableOpen && (
              <div className="mt-3 rounded-md border">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead>المصدر</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المدينة</TableHead>
                      <TableHead>زيارات الفريق</TableHead>
                      <TableHead>مرضى مسجّلون</TableHead>
                      <TableHead>مرضى فعليون</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openSource(s.id)}
                      >
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${TYPE_BADGE[s.type]}`}>
                            {REFERRAL_SOURCE_TYPE_LABEL[s.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.city || "—"}</TableCell>
                        <TableCell className="font-medium">{visitsCountOf(s)}</TableCell>
                        <TableCell className="font-medium">{s.patientCount ?? 0}</TableCell>
                        <TableCell className="font-medium text-green-600">{s.realPatientCount ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
