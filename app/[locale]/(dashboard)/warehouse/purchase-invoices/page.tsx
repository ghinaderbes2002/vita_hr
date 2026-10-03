"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Plus, Receipt } from "lucide-react";
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
import { useWarehouseCurrencies, useWarehouseSuppliers } from "@/lib/hooks/use-warehouse";
import { usePurchaseInvoices } from "@/lib/hooks/use-warehouse-operations";
import { PURCHASE_INVOICE_STATUSES, PurchaseInvoiceStatus } from "@/lib/api/warehouse-operations";
import {
  PurchaseInvoiceCreateDialog, PurchaseInvoiceDetailsDialog,
} from "@/components/features/warehouse/purchase-invoice-dialogs";
import {
  ALL, OptionSelect, refNo, StatusBadge, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehousePurchaseInvoicesPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.READ}>
      <PurchaseInvoicesContent />
    </PageGuard>
  );
}

function PurchaseInvoicesContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, warehouseName } = useWarehouseLookups();
  const { data: suppliers = [] } = useWarehouseSuppliers();
  const { data: currencies = [] } = useWarehouseCurrencies();

  const [status, setStatus] = useState(ALL);
  const [supplierFilter, setSupplierFilter] = useState(ALL);
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data, isLoading } = usePurchaseInvoices({
    status: status !== ALL ? (status as PurchaseInvoiceStatus) : undefined,
    supplierId: supplierFilter !== ALL ? supplierFilter : undefined,
    warehouseId: warehouseFilter !== ALL ? warehouseFilter : undefined,
    page,
    limit: LIMIT,
  });
  const invoices = data?.items ?? [];
  // Totals are absent for users without the purchase-prices permission.
  const showTotals = invoices.some((i) => i.total !== undefined);
  const columns = showTotals ? 7 : 6;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.purchaseInvoices.title")}
        description={t("warehouse.purchaseInvoices.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.CREATE}>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.purchaseInvoices.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          allLabel={t("warehouse.shared.allStatuses")}
          options={PURCHASE_INVOICE_STATUSES.map((s) => ({ value: s, label: t(`warehouse.statuses.${s}`) }))}
          className="w-44"
        />
        <OptionSelect
          value={supplierFilter}
          onChange={(v) => { setSupplierFilter(v); setPage(1); }}
          allLabel={t("warehouse.purchaseInvoices.allSuppliers")}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          className="w-52"
        />
        <OptionSelect
          value={warehouseFilter}
          onChange={(v) => { setWarehouseFilter(v); setPage(1); }}
          allLabel={t("warehouse.shared.allWarehouses")}
          options={warehouseOptions(warehouses)}
          className="w-52"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.shared.number")}</TableHead>
              <TableHead>{t("warehouse.shared.date")}</TableHead>
              <TableHead>{t("warehouse.shared.supplier")}</TableHead>
              <TableHead>{t("warehouse.shared.warehouse")}</TableHead>
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
                    icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.purchaseInvoices.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(inv.id)}>
                  <TableCell className="font-mono text-sm">{refNo(inv)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {fmt.date(inv.invoiceDate ?? inv.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {inv.supplier?.name ?? suppliers.find((s) => s.id === inv.supplierId)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{warehouseName(inv.warehouseId, inv.warehouse)}</TableCell>
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

      <PurchaseInvoiceCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PurchaseInvoiceDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
