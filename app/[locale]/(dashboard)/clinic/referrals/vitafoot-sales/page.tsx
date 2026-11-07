"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FileDown, Footprints, Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePodiatrySales, useUpdatePodiatrySaleCost } from "@/lib/hooks/use-clinic-podiatry";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { clinicPodiatryApi } from "@/lib/api/clinic-podiatry";
import { arrivalMethodText } from "@/lib/clinic/referral-sources";
import type { PodiatryCurrency, PodiatrySale } from "@/lib/api/clinic-podiatry";

const PAGE_SIZE = 20;

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const CURRENCIES: PodiatryCurrency[] = ["USD", "SYP"];
const fmtAmount = (v: number) => Number(v).toLocaleString("en-US");
const COST_PATTERN = /^\d+(\.\d{1,2})?$/;

/** VitaFoot sales: every podiatry patient whose insole has been fitted, one row each. */
export default function VitaFootSalesPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.podiatry.sales");
  const isRtl = locale === "ar";
  // Amounts stay apart per currency: pounds and dollars are never summed.
  const fmtMoney = (v: number, c: PodiatryCurrency) => (c === "USD" ? `${fmtAmount(v)}` : `${fmtAmount(v)} ${t("sypSuffix")}`);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filters = {
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { hasPermission, isAdmin } = usePermissions();
  const canEditCost = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PODIATRY.SALES_UPDATE_COST);
  const canSeeCost = canEditCost || hasPermission(PERMISSIONS.CLINIC_PODIATRY.SALES_VIEW_COST);

  const updateCost = useUpdatePodiatrySaleCost();
  const [costTarget, setCostTarget] = useState<PodiatrySale | null>(null);
  const [costValue, setCostValue] = useState("");
  const [costCurrency, setCostCurrency] = useState<PodiatryCurrency | "">("");
  const trimmedCost = costValue.trim();
  const costValid = trimmedCost === "" || COST_PATTERN.test(trimmedCost);
  // Never preselected: an amount in the wrong currency is off by a factor of thousands.
  const needsCurrency = trimmedCost !== "" && !costCurrency;

  const openCost = (s: PodiatrySale) => {
    setCostTarget(s);
    setCostValue(s.insoleCost == null ? "" : String(s.insoleCost));
    setCostCurrency(s.insoleCostCurrency ?? "");
  };
  const saveCost = () => {
    if (!costTarget || !costValid || needsCurrency) return;
    updateCost.mutate(
      {
        sessionId: costTarget.sessionId,
        dto: trimmedCost === "" || !costCurrency
          ? { insoleCost: null }
          : { insoleCost: Number(trimmedCost), insoleCostCurrency: costCurrency },
      },
      { onSuccess: () => setCostTarget(null) },
    );
  };

  const { data, isLoading, isError } = usePodiatrySales({ page, limit: PAGE_SIZE, ...filters });
  const rows = data?.items ?? [];
  const summary = data?.summary;
  const filtered = !!(debouncedSearch || dateFrom || dateTo);

  // The sheet covers every page of the current filters, not just the one on screen.
  const [exporting, setExporting] = useState(false);
  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const sales: PodiatrySale[] = [];
      let p = 1;
      let totalPages = 1;
      do {
        const res = await clinicPodiatryApi.getSales({ page: p, limit: 100, ...filters });
        sales.push(...res.items);
        totalPages = res.totalPages;
        p += 1;
      } while (p <= totalPages);
      const { downloadVitaFootSalesPdf } = await import("@/components/clinic/vitafoot-sales-pdf");
      await downloadVitaFootSalesPdf({ sales, dateFrom, dateTo, withCosts: canSeeCost });
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          count={data?.total}
          actions={
            <Button variant="outline" className="gap-1.5" onClick={exportPdf} disabled={exporting || !data?.total}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {t("exportPdf")}
            </Button>
          }
        />

        {/* Totals for every matching patient, from the server: the table only holds one page. */}
        {summary && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{filtered ? t("patientsInFilter") : t("patientsCount")}</p>
              <p className="text-2xl font-bold tabular-nums">{summary.patients}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("installsCount")}</p>
              <p className="text-2xl font-bold tabular-nums">{summary.installs}</p>
            </div>
            {canSeeCost && summary.totalCosts != null && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{t("totalSales")}</p>
                {CURRENCIES.some((c) => summary.totalCosts?.[c]) ? (
                  CURRENCIES.filter((c) => summary.totalCosts?.[c]).map((c) => (
                    <p key={c} className="text-2xl font-bold tabular-nums leading-tight">{fmtMoney(summary.totalCosts![c]!, c)}</p>
                  ))
                ) : (
                  <p className="text-2xl font-bold">—</p>
                )}
                {!!summary.patientsWithCostWithoutCurrency && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    {t("costWithoutCurrencyNote", { count: summary.patientsWithCostWithoutCurrency })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t("searchPlaceholder")}
              className="ps-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("fittedFrom")}</span>
            <Input
              type="date"
              className="h-9 w-40 text-xs"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <span className="text-xs text-muted-foreground">{t("to")}</span>
            <Input
              type="date"
              className="h-9 w-40 text-xs"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
            {(dateFrom || dateTo) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-xs"
                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              >
                {t("clear")}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-destructive">{t("loadFailed")}</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Footprints className="h-8 w-8 text-muted-foreground" />}
              title={debouncedSearch || dateFrom || dateTo ? t("noResults") : t("empty")}
            />
          ) : (
            <Table dir={isRtl ? "rtl" : "ltr"}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colPatientNumber")}</TableHead>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{t("colArrival")}</TableHead>
                  <TableHead>{t("colInsoleType")}</TableHead>
                  <TableHead>{t("colSize")}</TableHead>
                  <TableHead>{t("colInstalls")}</TableHead>
                  <TableHead>{t("colLastInstall")}</TableHead>
                  {canSeeCost && <TableHead>{t("colLastCost")}</TableHead>}
                  {canSeeCost && <TableHead>{t("colTotalCost")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow
                    key={s.patientId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/clinic/podiatry/${s.receptionId}`)}
                  >
                    <TableCell className="font-mono text-xs">{s.patientNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{s.patientName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{arrivalMethodText(s) ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.insoleType?.join(isRtl ? "، " : ", ") || "—"}</TableCell>
                    <TableCell className="tabular-nums">{s.shoeSize ?? "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">{s.installCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(s.installedAt)}</TableCell>
                    {canSeeCost && (
                      <TableCell className="tabular-nums">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {s.insoleCost == null ? (
                            <span>—</span>
                          ) : s.insoleCostCurrency ? (
                            <span>{fmtMoney(s.insoleCost, s.insoleCostCurrency)}</span>
                          ) : (
                            <>
                              <span>{fmtAmount(s.insoleCost)}</span>
                              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                {t("unknownCurrency")}
                              </span>
                            </>
                          )}
                          {canEditCost && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={t("editCost")}
                              // The row itself opens the patient.
                              onClick={(e) => { e.stopPropagation(); openCost(s); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {canSeeCost && (
                      <TableCell className="font-medium tabular-nums">
                        {CURRENCIES.some((c) => s.totalCosts?.[c] != null)
                          ? CURRENCIES.filter((c) => s.totalCosts?.[c] != null).map((c) => (
                              <div key={c}>{fmtMoney(s.totalCosts![c]!, c)}</div>
                            ))
                          : "—"}
                        {s.hasCostWithoutCurrency && (
                          <div className="whitespace-nowrap text-[10px] font-normal text-amber-700 dark:text-amber-400">{t("amountWithoutCurrency")}</div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {(data?.totalPages ?? 1) > 1 && (
          <Pagination
            page={page}
            totalPages={data!.totalPages}
            total={data!.total}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}

        <Dialog open={!!costTarget} onOpenChange={(o) => !o && setCostTarget(null)}>
          <DialogContent className="max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{costTarget?.patientName || "—"}</p>
              <Label htmlFor="insole-cost">{t("cost")}</Label>
              <Input
                id="insole-cost"
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
              />
              <p className={`text-xs ${costValid ? "text-muted-foreground" : "text-destructive"}`}>
                {costValid ? t("clearHint") : t("invalidCost")}
              </p>
              <Label>{t("currency")}</Label>
              <Select value={costCurrency} onValueChange={(v) => setCostCurrency(v as PodiatryCurrency)}>
                <SelectTrigger><SelectValue placeholder={t("chooseCurrency")} /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c === "USD" ? t("usd") : t("syp")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCostTarget(null)}>{t("cancel")}</Button>
              <Button onClick={saveCost} disabled={!costValid || needsCurrency || updateCost.isPending}>
                {updateCost.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
