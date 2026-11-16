"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, Calculator, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BonusTierBadge, CycleStatusBadge, PercentCell, formatNumber } from "@/components/appraisal/appraisal-ui";
import {
  useAppraisalCycles,
  useAppraisalProgress,
  useAppraisalResults,
  useComputeAppraisal,
} from "@/lib/hooks/use-appraisal";
import { BonusTier, ComputeResponse } from "@/lib/api/appraisal";
import { PERMISSIONS } from "@/lib/permissions/catalog";

const ALL = "__all__";
const TIERS: BonusTier[] = ["EXCEPTIONAL", "HIGH", "BASIC", "PIP"];

export default function AppraisalCycleDetailPage() {
  return (
    <PageGuard permission={PERMISSIONS.APPRAISAL.MANAGE}>
      <CycleDetailContent />
    </PageGuard>
  );
}

function CycleDetailContent() {
  const t = useTranslations("appraisal");
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data: cycles, isLoading: cyclesLoading } = useAppraisalCycles();
  const { data: progress = [], isLoading: progressLoading } = useAppraisalProgress(id);
  const { data: results = [], isLoading: resultsLoading } = useAppraisalResults(id);
  const compute = useComputeAppraisal();
  const [computeResult, setComputeResult] = useState<ComputeResponse | null>(null);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [tier, setTier] = useState(ALL);
  const [missingOnly, setMissingOnly] = useState(false);

  const cycle = cycles?.find((c) => c.id === id);
  const canCompute = cycle?.status === "OPEN" || cycle?.status === "CLOSED";

  const departments = useMemo(
    () =>
      Array.from(
        new Set(results.map((r) => r.details?.employee?.departmentName).filter((d): d is string => !!d)),
      ).sort(),
    [results],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      if (q && !r.employeeName?.toLowerCase().includes(q)) return false;
      if (department !== ALL && r.details?.employee?.departmentName !== department) return false;
      if (tier !== ALL && r.bonusTier !== tier) return false;
      if (missingOnly && !(r.missingAxes?.length > 0)) return false;
      return true;
    });
  }, [results, search, department, tier, missingOnly]);

  const handleCompute = async () => {
    try {
      setComputeResult(await compute.mutateAsync(id));
    } catch {
      // الخطأ معروض من الـ hook
    }
  };

  const unconfigured = computeResult?.warnings?.unconfiguredDepartments ?? [];
  const noReadiness = computeResult?.warnings?.noReadinessJobTitles;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.push("/evaluations/360-cycles")}>
        <ArrowRight className="me-2 h-4 w-4 ltr:rotate-180" />
        {t("cycles.title")}
      </Button>

      {cyclesLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <PageHeader
          title={cycle?.nameAr ?? t("cycles.title")}
          description={cycle ? `${cycle.code} · ${cycle.startDate.slice(0, 10)} → ${cycle.endDate.slice(0, 10)}` : undefined}
          actions={
            <div className="flex items-center gap-2">
              {cycle && <CycleStatusBadge status={cycle.status} />}
              {canCompute && (
                <Button disabled={compute.isPending} onClick={handleCompute}>
                  <Calculator className="me-2 h-4 w-4" />
                  {compute.isPending ? t("detail.computing") : t("detail.compute")}
                </Button>
              )}
            </div>
          }
        />
      )}

      {computeResult && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{t("detail.computed", { count: computeResult.computed })}</p>
          {unconfigured.length > 0 && (
            <p className="flex items-start gap-2 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t("detail.warnings.unconfigured", { departments: unconfigured.join("، ") })}
            </p>
          )}
          {noReadiness && (
            <p className="flex items-start gap-2 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t("detail.warnings.noReadiness")}
            </p>
          )}
        </div>
      )}

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">{t("detail.tabs.results")}</TabsTrigger>
          <TabsTrigger value="progress">{t("detail.tabs.progress")}</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("detail.progressTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {progressLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : progress.length === 0 ? (
                <p className="text-center text-muted-foreground">{t("detail.noProgress")}</p>
              ) : (
                progress.map((p) => {
                  const pct = p.expected > 0 ? (p.submitted / p.expected) * 100 : 0;
                  return (
                    <div key={p.axis} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{t(`axis.${p.axis}`)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {t("detail.progressLine", { submitted: p.submitted, expected: p.expected, drafts: p.drafts })}
                        </span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("detail.searchPlaceholder")}
              />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("detail.allDepartments")}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("detail.allTiers")}</SelectItem>
                {TIERS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {t(`bonusTier.${x}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="missing-only" checked={missingOnly} onCheckedChange={(v) => setMissingOnly(v === true)} />
              <Label htmlFor="missing-only" className="cursor-pointer">
                {t("detail.missingOnly")}
              </Label>
            </div>
            <span className="ms-auto text-sm text-muted-foreground">
              {filtered.length} / {results.length}
            </span>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t("detail.employee")}</TableHead>
                    <TableHead>{t("axisShort.MANAGER")}</TableHead>
                    <TableHead>{t("axisShort.CUSTOMER")}</TableHead>
                    <TableHead>{t("axisShort.PEER")}</TableHead>
                    <TableHead>{t("axisShort.UPWARD")}</TableHead>
                    <TableHead>{t("axisShort.COMMITMENT")}</TableHead>
                    <TableHead>{t("axisShort.SELF")}</TableHead>
                    <TableHead>{t("detail.finalScore")}</TableHead>
                    <TableHead>{t("detail.tier")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                        {results.length === 0 ? t("detail.noResults") : t("detail.noMatches")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r, index) => (
                      <TableRow
                        key={r.employeeId}
                        className="cursor-pointer"
                        onClick={() => router.push(`/evaluations/360-cycles/${id}/${r.employeeId}`)}
                      >
                        <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{r.employeeName}</p>
                          {r.details?.employee?.departmentName && (
                            <p className="text-xs text-muted-foreground">
                              {r.details.employee.departmentName}
                              {r.details.employee.jobTitleName ? ` · ${r.details.employee.jobTitleName}` : ""}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <PercentCell value={r.managerPercent} />
                        </TableCell>
                        <TableCell>
                          <PercentCell value={r.customerPercent} />
                        </TableCell>
                        <TableCell>
                          <PercentCell value={r.peerPercent} />
                          {r.peerPercent !== null && <span className="ms-1 text-xs text-muted-foreground">({r.peerCount})</span>}
                        </TableCell>
                        <TableCell>
                          <PercentCell value={r.upwardPercent} />
                          {r.upwardPercent !== null && (
                            <span className="ms-1 text-xs text-muted-foreground">({r.upwardCount})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PercentCell value={r.commitmentPercent} />
                        </TableCell>
                        <TableCell>
                          <PercentCell value={r.selfPercent} />
                        </TableCell>
                        <TableCell className="font-bold tabular-nums">
                          {r.finalScore === null ? "—" : formatNumber(r.finalScore)}
                        </TableCell>
                        <TableCell>
                          {r.finalScore === null && r.missingAxes?.length > 0 ? (
                            <span className="text-xs text-amber-700">
                              {t("detail.waitingFor", {
                                axes: r.missingAxes.map((a) => t(`axis.${a}`)).join(" / "),
                              })}
                            </span>
                          ) : (
                            <BonusTierBadge tier={r.bonusTier} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
