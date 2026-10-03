"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Eye, Plus } from "lucide-react";
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
import { useTransfers } from "@/lib/hooks/use-warehouse-operations";
import { StockTransferStatus, TRANSFER_STATUSES } from "@/lib/api/warehouse-operations";
import { TransferCreateDialog, TransferDetailsDialog } from "@/components/features/warehouse/transfer-dialogs";
import {
  ALL, OptionSelect, refNo, StatusBadge, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehouseTransfersPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_TRANSFERS.READ}>
      <TransfersContent />
    </PageGuard>
  );
}

function TransfersContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, warehouseName } = useWarehouseLookups();

  const [status, setStatus] = useState(ALL);
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data, isLoading } = useTransfers({
    status: status !== ALL ? (status as StockTransferStatus) : undefined,
    warehouseId: warehouseFilter !== ALL ? warehouseFilter : undefined,
    page,
    limit: LIMIT,
  });
  const transfers = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.transfers.title")}
        description={t("warehouse.transfers.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_TRANSFERS.CREATE}>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.transfers.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          allLabel={t("warehouse.shared.allStatuses")}
          options={TRANSFER_STATUSES.map((s) => ({ value: s, label: t(`warehouse.statuses.${s}`) }))}
          className="w-44"
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
              <TableHead>{t("warehouse.transfers.fromWarehouse")}</TableHead>
              <TableHead>{t("warehouse.transfers.toWarehouse")}</TableHead>
              <TableHead>{t("warehouse.shared.items")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<ArrowLeftRight className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.transfers.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((tr) => (
                <TableRow key={tr.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(tr.id)}>
                  <TableCell className="font-mono text-sm">{refNo(tr)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.dateTime(tr.createdAt)}</TableCell>
                  <TableCell>{warehouseName(tr.fromWarehouseId, tr.fromWarehouse)}</TableCell>
                  <TableCell>{warehouseName(tr.toWarehouseId, tr.toWarehouse)}</TableCell>
                  <TableCell className="text-sm">{tr.items?.length ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={tr.status} /></TableCell>
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

      <TransferCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TransferDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
