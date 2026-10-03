"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import { useQuotations } from "@/lib/hooks/use-warehouse-operations";
import { QUOTATION_STATUSES, QuotationStatus } from "@/lib/api/warehouse-operations";
import { PatientCombobox, PatientName } from "@/components/features/warehouse/patient-combobox";
import { QuotationFormDialog } from "@/components/features/warehouse/quotation-form-dialog";
import { QuotationDetailsDialog } from "@/components/features/warehouse/quotation-details-dialog";
import {
  ALL, OptionSelect, refNo, StatusBadge, useWarehouseFormat,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehouseQuotationsPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_QUOTATIONS.READ}>
      <QuotationsContent />
    </PageGuard>
  );
}

function QuotationsContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { data: currencies = [] } = useWarehouseCurrencies();

  const [status, setStatus] = useState(ALL);
  const [patientFilter, setPatientFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data, isLoading } = useQuotations({
    status: status !== ALL ? (status as QuotationStatus) : undefined,
    patientId: patientFilter || undefined,
    page,
    limit: LIMIT,
  });
  const quotations = data?.items ?? [];
  // Totals are absent on the technician copy (no view_prices permission).
  const showTotals = quotations.some((q) => q.total !== undefined);
  const columns = showTotals ? 8 : 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.quotations.title")}
        description={t("warehouse.quotations.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_QUOTATIONS.CREATE}>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.quotations.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          allLabel={t("warehouse.shared.allStatuses")}
          options={QUOTATION_STATUSES.map((s) => ({ value: s, label: t(`warehouse.statuses.${s}`) }))}
          className="w-44"
        />
        <div className="w-64 max-w-full">
          <PatientCombobox value={patientFilter} onChange={(v) => { setPatientFilter(v); setPage(1); }} />
        </div>
        {patientFilter && (
          <Button variant="ghost" size="sm" onClick={() => { setPatientFilter(""); setPage(1); }}>
            {t("warehouse.shared.allPatients")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.shared.number")}</TableHead>
              <TableHead>{t("warehouse.quotations.version")}</TableHead>
              <TableHead>{t("warehouse.shared.date")}</TableHead>
              <TableHead>{t("warehouse.shared.patient")}</TableHead>
              <TableHead>{t("warehouse.quotations.validUntil")}</TableHead>
              {showTotals && <TableHead>{t("warehouse.shared.total")}</TableHead>}
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns}>
                  <EmptyState
                    icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.quotations.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(q.id)}>
                  <TableCell className="font-mono text-sm">{refNo(q)}</TableCell>
                  <TableCell className="text-sm">{q.version ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.date(q.createdAt)}</TableCell>
                  <TableCell className="font-medium"><PatientName patientId={q.patientId} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fmt.date(q.validUntil)}</TableCell>
                  {showTotals && (
                    <TableCell className="font-medium">
                      {fmt.money(q.total, q.currency?.code ?? currencies.find((c) => c.id === q.currencyId)?.code)}
                    </TableCell>
                  )}
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t("common.view")}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit || LIMIT}
          onPageChange={setPage}
        />
      )}

      <QuotationFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <QuotationDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} onNavigate={setDetailsId} />
    </div>
  );
}
