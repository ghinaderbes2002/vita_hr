"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseReport } from "@/lib/hooks/use-warehouse-operations";
import { WarehouseReportKey } from "@/lib/api/warehouse-operations";
import { apiErrorMessage } from "@/lib/api/api-errors";
import { ItemCombobox } from "@/components/features/warehouse/line-items-editor";
import { ReportView } from "@/components/features/warehouse/report-view";
import {
  ALL, Field, OptionSelect, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

// Which filters each report endpoint accepts.
const REPORTS: { key: WarehouseReportKey; warehouse?: boolean; item?: boolean; dates?: boolean }[] = [
  { key: "stock-valuation", warehouse: true },
  { key: "low-stock", warehouse: true },
  { key: "stock-movements", warehouse: true, item: true, dates: true },
  { key: "purchases-summary", dates: true },
  { key: "sales-summary", dates: true },
  { key: "material-requests-summary", dates: true },
  { key: "returns-summary", dates: true },
  { key: "inventory-variance", warehouse: true },
];

export default function WarehouseReportsPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_REPORTS.READ}>
      <ReportsContent />
    </PageGuard>
  );
}

function ReportsContent() {
  const t = useTranslations();
  const { warehouses, items } = useWarehouseLookups();

  const [reportKey, setReportKey] = useState<WarehouseReportKey>("stock-valuation");
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [itemFilter, setItemFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const report = REPORTS.find((r) => r.key === reportKey)!;

  // Only the filters this report understands are sent.
  const { data, isLoading, isFetching, error } = useWarehouseReport(reportKey, {
    warehouseId: report.warehouse && warehouseFilter !== ALL ? warehouseFilter : undefined,
    itemId: report.item && itemFilter ? itemFilter : undefined,
    dateFrom: report.dates && dateFrom ? dateFrom : undefined,
    dateTo: report.dates && dateTo ? dateTo : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("warehouse.reports.title")} description={t("warehouse.reports.description")} />

      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("warehouse.reports.report")}>
          <OptionSelect
            value={reportKey}
            onChange={(v) => setReportKey(v as WarehouseReportKey)}
            options={REPORTS.map((r) => ({ value: r.key, label: t(`warehouse.reports.names.${r.key}`) }))}
            className="w-64"
          />
        </Field>
        {report.warehouse && (
          <Field label={t("warehouse.shared.warehouse")}>
            <OptionSelect
              value={warehouseFilter}
              onChange={setWarehouseFilter}
              allLabel={t("warehouse.shared.allWarehouses")}
              options={warehouseOptions(warehouses)}
              className="w-52"
            />
          </Field>
        )}
        {report.item && (
          <Field label={t("warehouse.shared.item")}>
            <div className="flex items-center gap-2">
              <div className="w-64 max-w-full">
                <ItemCombobox items={items} value={itemFilter} onChange={setItemFilter} />
              </div>
              {itemFilter && (
                <Button variant="ghost" size="sm" onClick={() => setItemFilter("")}>
                  {t("warehouse.stock.allItems")}
                </Button>
              )}
            </div>
          </Field>
        )}
        {report.dates && (
          <>
            <Field label={t("warehouse.reports.dateFrom")}>
              <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </Field>
            <Field label={t("warehouse.reports.dateTo")}>
              <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </Field>
          </>
        )}
        {isFetching && <Loader2 className="mb-2 h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <p className="text-sm text-muted-foreground">{t(`warehouse.reports.hints.${reportKey}`)}</p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {apiErrorMessage(error, t("warehouse.opToast.error"))}
        </p>
      ) : (
        <ReportView data={data} />
      )}
    </div>
  );
}
