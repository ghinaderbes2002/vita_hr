"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useReturns } from "@/lib/hooks/use-warehouse-operations";
import { RETURN_TYPES, ReturnType } from "@/lib/api/warehouse-operations";
import { ReturnCreateDialog, ReturnDetailsDialog } from "@/components/features/warehouse/return-dialogs";
import {
  ALL, OptionSelect, refNo, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehouseReturnsPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_RETURNS.READ}>
      <ReturnsContent />
    </PageGuard>
  );
}

function ReturnsContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, warehouseName } = useWarehouseLookups();

  const [typeFilter, setTypeFilter] = useState(ALL);
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data, isLoading } = useReturns({
    returnType: typeFilter !== ALL ? (typeFilter as ReturnType) : undefined,
    warehouseId: warehouseFilter !== ALL ? warehouseFilter : undefined,
    page,
    limit: LIMIT,
  });
  const returns = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.returns.title")}
        description={t("warehouse.returns.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_RETURNS.CREATE}>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.returns.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          allLabel={t("warehouse.returns.allTypes")}
          options={RETURN_TYPES.map((r) => ({ value: r, label: t(`warehouse.returns.types.${r}`) }))}
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
              <TableHead>{t("warehouse.returns.returnType")}</TableHead>
              <TableHead>{t("warehouse.shared.warehouse")}</TableHead>
              <TableHead>{t("warehouse.shared.items")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<Undo2 className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.returns.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              returns.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(r.id)}>
                  <TableCell className="font-mono text-sm">{refNo(r)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.dateTime(r.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`warehouse.returns.types.${r.returnType}`)}</Badge>
                  </TableCell>
                  <TableCell>{warehouseName(r.warehouseId, r.warehouse)}</TableCell>
                  <TableCell className="text-sm">{r.items?.length ?? "—"}</TableCell>
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

      <ReturnCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ReturnDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
