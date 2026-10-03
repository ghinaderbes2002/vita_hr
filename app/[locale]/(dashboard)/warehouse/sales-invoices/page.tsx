"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import { useSalesInvoices } from "@/lib/hooks/use-warehouse-operations";
import { SALES_INVOICE_STATUSES, SalesInvoiceStatus } from "@/lib/api/warehouse-operations";
import { PatientCombobox, PatientName } from "@/components/features/warehouse/patient-combobox";
import { SalesInvoiceDetailsDialog } from "@/components/features/warehouse/sales-invoice-details-dialog";
import {
  ALL, OptionSelect, refNo, StatusBadge, useWarehouseFormat,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehouseSalesInvoicesPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_SALES_INVOICES.READ}>
      <SalesInvoicesContent />
    </PageGuard>
  );
}

// No "add" button on purpose: an invoice is only ever generated from an
// accepted quotation, from the quotation's own screen.
function SalesInvoicesContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { data: currencies = [] } = useWarehouseCurrencies();

  const [status, setStatus] = useState(ALL);
  const [patientFilter, setPatientFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data, isLoading } = useSalesInvoices({
    status: status !== ALL ? (status as SalesInvoiceStatus) : undefined,
    patientId: patientFilter || undefined,
    page,
    limit: LIMIT,
  });
  const invoices = data?.items ?? [];
  const showTotals = invoices.some((i) => i.total !== undefined);
  const columns = showTotals ? 7 : 6;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.salesInvoices.title")}
        description={t("warehouse.salesInvoices.description")}
      />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          allLabel={t("warehouse.shared.allStatuses")}
          options={SALES_INVOICE_STATUSES.map((s) => ({ value: s, label: t(`warehouse.statuses.${s}`) }))}
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
              <TableHead>{t("warehouse.shared.date")}</TableHead>
              <TableHead>{t("warehouse.shared.patient")}</TableHead>
              <TableHead>{t("warehouse.salesInvoices.paymentMethod")}</TableHead>
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
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns}>
                  <EmptyState
                    icon={<ReceiptText className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.salesInvoices.empty")}
                    description={t("warehouse.salesInvoices.emptyDescription")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(inv.id)}>
                  <TableCell className="font-mono text-sm">{refNo(inv)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.date(inv.createdAt)}</TableCell>
                  <TableCell className="font-medium"><PatientName patientId={inv.patientId} /></TableCell>
                  <TableCell className="text-sm">{inv.paymentMethod || "—"}</TableCell>
                  {showTotals && (
                    <TableCell className="font-medium">
                      {fmt.money(inv.total, inv.currency?.code ?? currencies.find((c) => c.id === inv.currencyId)?.code)}
                    </TableCell>
                  )}
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
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

      <SalesInvoiceDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
