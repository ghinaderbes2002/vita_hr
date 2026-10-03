"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardCheck, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useInventoryCounts } from "@/lib/hooks/use-warehouse-operations";
import { COUNT_STATUSES, InventoryCountStatus } from "@/lib/api/warehouse-operations";
import {
  InventoryCountDetailsDialog, InventoryCountStartDialog,
} from "@/components/features/warehouse/inventory-count-dialogs";
import {
  ALL, OptionSelect, refNo, StatusBadge, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

export default function WarehouseInventoryCountsPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_COUNTS.READ}>
      <InventoryCountsContent />
    </PageGuard>
  );
}

function InventoryCountsContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, warehouseName } = useWarehouseLookups();

  const [status, setStatus] = useState(ALL);
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [startOpen, setStartOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data: counts = [], isLoading } = useInventoryCounts({
    status: status !== ALL ? (status as InventoryCountStatus) : undefined,
    warehouseId: warehouseFilter !== ALL ? warehouseFilter : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.counts.title")}
        description={t("warehouse.counts.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_COUNTS.CREATE}>
            <Button onClick={() => setStartOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.counts.start")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={status}
          onChange={setStatus}
          allLabel={t("warehouse.shared.allStatuses")}
          options={COUNT_STATUSES.map((s) => ({ value: s, label: t(`warehouse.statuses.${s}`) }))}
          className="w-44"
        />
        <OptionSelect
          value={warehouseFilter}
          onChange={setWarehouseFilter}
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
              <TableHead>{t("warehouse.shared.warehouse")}</TableHead>
              <TableHead>{t("warehouse.shared.notes")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : counts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.counts.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              counts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(c.id)}>
                  <TableCell className="font-mono text-sm">{refNo(c)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.dateTime(c.createdAt)}</TableCell>
                  <TableCell className="font-medium">{warehouseName(c.warehouseId, c.warehouse)}</TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-muted-foreground">{c.notes || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
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

      <InventoryCountStartDialog open={startOpen} onOpenChange={setStartOpen} />
      <InventoryCountDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
