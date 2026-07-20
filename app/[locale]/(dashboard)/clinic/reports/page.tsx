"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Users, CheckCircle2, Activity, Heart, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { useDonorReport, useDownloadDonorPdf } from "@/lib/hooks/use-clinic-reports";
import { useProstheticsCases } from "@/lib/hooks/use-clinic-prosthetics";
import { ProstheticsCase } from "@/lib/api/clinic-prosthetics";
import { usePhysioCases } from "@/lib/hooks/use-clinic-physio";
import { PhysioCase } from "@/lib/api/clinic-physio";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { useLowStockAlerts, useInventoryTransactions } from "@/lib/hooks/use-clinic-inventory";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: any;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({ data }: { data: Array<{ label: string; value: number; color?: string }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="space-y-0.5">
          <div className="flex justify-between text-sm">
            <span>{d.label}</span>
            <span className="font-bold">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${d.color ?? "bg-primary"}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClinicReportsPage() {
  const t = useTranslations("clinic.reports");

  const today = new Date();
  const firstDayOfYear = `${today.getFullYear()}-01-01`;
  const [from, setFrom] = useState(firstDayOfYear);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data: donorReport, isLoading: donorLoading } = useDonorReport({ from, to });
  // Parts actually taken out of the warehouse in the same period: every approved
  // part request writes an ISSUED transaction, so their quantities are the count.
  const { data: inventoryTransactions = [] } = useInventoryTransactions({ from, to });
  const issuedPartsCount = inventoryTransactions
    .filter((tx) => tx.type === "ISSUED" || tx.type === "ISSUE")
    .reduce((sum, tx) => sum + (tx.quantity ?? 0), 0);
  const downloadPdf = useDownloadDonorPdf();

  const { data: prostData } = useProstheticsCases({ limit: 999 });
  const { data: physioData } = usePhysioCases({ limit: 999 });
  const { data: patientsData } = useClinicPatients({ limit: 1 });
  const { data: lowStock = [] } = useLowStockAlerts();

  const prostCases = prostData?.items ?? [];
  const physioCases = physioData?.items ?? [];
  const totalPatients = patientsData?.total ?? 0;

  const activeProst = prostCases.filter((c: ProstheticsCase) => !["CLOSED", "CANCELLED", "DELIVERED"].includes(c.status)).length;
  const activePhysio = physioCases.filter((c: PhysioCase) => !["COMPLETED", "CANCELLED"].includes(c.status)).length;
  const deliveredProst = prostCases.filter((c: ProstheticsCase) => c.status === "DELIVERED").length;
  const completedPhysio = physioCases.filter((c: PhysioCase) => c.status === "COMPLETED").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {/* ── Clinical overview ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t("overview.title")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label={t("overview.totalPatients")} value={totalPatients} />
          <StatCard icon={Activity} label={t("overview.activeProstCases")} value={activeProst} color="text-indigo-600" />
          <StatCard icon={Heart} label={t("overview.activePhysioCases")} value={activePhysio} color="text-pink-600" />
          <StatCard
            icon={CheckCircle2}
            label={t("overview.completedCases")}
            value={deliveredProst + completedPhysio}
            color="text-green-600"
            sub={t("overview.completedSub", { prost: deliveredProst, physio: completedPhysio })}
          />
        </div>
      </section>

      {/* ── Breakdown charts ──────────────────────────────────────────────── */}
      {prostCases.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("charts.prostByStage")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={(() => {
                  const counts: Record<string, number> = {};
                  prostCases.forEach((c: ProstheticsCase) => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
                  return Object.entries(counts).map(([k, v]) => ({
                    label: t(`prostStatuses.${k}` as any, { default: k }),
                    value: v,
                  }));
                })()}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("charts.prostByType")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={(() => {
                  const counts: Record<string, number> = {};
                  prostCases.forEach((c: ProstheticsCase) => {
                    const raw = c.amputationType;
                    const keys = Array.isArray(raw) ? raw : [raw ?? "UNKNOWN"];
                    keys.forEach((k) => { counts[String(k)] = (counts[String(k)] ?? 0) + 1; });
                  });
                  return Object.entries(counts).map(([k, v]) => ({
                    label: t(`prostTypes.${k}` as any, { default: k }),
                    value: v,
                    color: k === "UPPER" ? "bg-indigo-500" : "bg-emerald-500",
                  }));
                })()}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Donor report ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-lg">{t("donor")}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm shrink-0">{t("from")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm shrink-0">{t("to")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => downloadPdf.mutate({ from, to })}
              disabled={downloadPdf.isPending}
            >
              {downloadPdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("exportPdf")}
            </Button>
          </div>
        </div>

        {donorLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : donorReport ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Activity} label={t("summary.totalCases")} value={donorReport.summary.totalCases} />
              <StatCard icon={Users} label={t("summary.patientsServed")} value={donorReport.summary.patientsServed} />
              <StatCard icon={CheckCircle2} label={t("summary.deliveredCases")} value={donorReport.summary.deliveredCases} color="text-green-600" />
              <StatCard
                icon={BarChart3}
                label={t("summary.successRate")}
                value={`${donorReport.summary.successRate?.toFixed(1) ?? 0}%`}
                color="text-primary"
              />
              <StatCard icon={Activity} label={t("summary.followUpsCompleted")} value={donorReport.summary.followUpsCompleted} />
              <Card>
                <CardContent className="pt-4 pb-3 space-y-1">
                  <p className="text-sm text-muted-foreground">{t("resources.title")}</p>
                  <p className="text-sm"><span className="font-bold">{donorReport.resources.totalComponentsUsed}</span> {t("resources.components")}</p>
                  <p className="text-sm"><span className="font-bold">{issuedPartsCount}</span> {t("resources.issuedParts")}</p>
                </CardContent>
              </Card>
            </div>

            {donorReport.byStatus.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("donorCharts.byStatus")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={donorReport.byStatus.map((s) => ({
                        label: t(`prostStatuses.${s.status}` as any, { default: s.status }),
                        value: s.count,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("donorCharts.byAmputationType")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={donorReport.byAmputationType.map((item) => ({
                        label: t(`prostTypes.${item.type}` as any, { default: item.type }),
                        value: item.count,
                        color: item.type === "UPPER" ? "bg-indigo-500" : "bg-emerald-500",
                      }))}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-8 text-muted-foreground">{t("noData")}</p>
        )}
      </section>

      {/* Low stock warning */}
      {lowStock.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <p className="font-semibold text-orange-800 mb-2">
              {t("lowStock.warning", { count: lowStock.length })}
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((i) => (
                <span key={i.id} className="text-xs bg-orange-100 border border-orange-300 rounded px-2 py-0.5 text-orange-800">
                  {i.name} ({i.currentStock}/{i.minStockLevel})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
