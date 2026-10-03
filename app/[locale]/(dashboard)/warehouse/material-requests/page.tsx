"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useMaterialRequests, useMyMaterialRequests } from "@/lib/hooks/use-warehouse-operations";
import { MATERIAL_REQUEST_STATUSES, MaterialRequestStatus } from "@/lib/api/warehouse-operations";
import {
  MaterialRequestCreateDialog, MaterialRequestDetailsDialog,
} from "@/components/features/warehouse/material-request-dialogs";
import {
  ALL, OptionSelect, refNo, StatusBadge, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehouseMaterialRequestsPage() {
  return (
    <PageGuard
      permissions={[
        PERMISSIONS.WAREHOUSE_MATERIAL_REQUESTS.READ,
        PERMISSIONS.WAREHOUSE_MATERIAL_REQUESTS.READ_OWN,
      ]}
    >
      <MaterialRequestsContent />
    </PageGuard>
  );
}

function MaterialRequestsContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, warehouseName } = useWarehouseLookups();
  const { hasPermission, isAdmin } = usePermissions();

  // Two separate permissions, two endpoints: everyone's requests (the
  // storekeeper's view) and the caller's own.
  const canReadAll = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_MATERIAL_REQUESTS.READ);
  const canReadOwn = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_MATERIAL_REQUESTS.READ_OWN);

  const [scope, setScope] = useState<"all" | "mine">(canReadAll ? "all" : "mine");
  const [status, setStatus] = useState(ALL);
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const all = useMaterialRequests(
    {
      status: status !== ALL ? (status as MaterialRequestStatus) : undefined,
      warehouseId: warehouseFilter !== ALL ? warehouseFilter : undefined,
      page,
      limit: LIMIT,
    },
    scope === "all" && canReadAll,
  );
  const mine = useMyMaterialRequests(scope === "mine" && canReadOwn);
  const { data, isLoading } = scope === "all" ? all : mine;
  const requests = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.materialRequests.title")}
        description={t("warehouse.materialRequests.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_MATERIAL_REQUESTS.CREATE}>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.materialRequests.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        {canReadAll && canReadOwn && (
          <Tabs value={scope} onValueChange={(v) => { setScope(v as "all" | "mine"); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">{t("warehouse.materialRequests.scopeAll")}</TabsTrigger>
              <TabsTrigger value="mine">{t("warehouse.materialRequests.scopeMine")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {scope === "all" && (
          <>
            <OptionSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              allLabel={t("warehouse.shared.allStatuses")}
              options={MATERIAL_REQUEST_STATUSES.map((s) => ({ value: s, label: t(`warehouse.statuses.${s}`) }))}
              className="w-48"
            />
            <OptionSelect
              value={warehouseFilter}
              onChange={(v) => { setWarehouseFilter(v); setPage(1); }}
              allLabel={t("warehouse.shared.allWarehouses")}
              options={warehouseOptions(warehouses)}
              className="w-52"
            />
          </>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.shared.number")}</TableHead>
              <TableHead>{t("warehouse.shared.date")}</TableHead>
              <TableHead>{t("warehouse.shared.warehouse")}</TableHead>
              <TableHead>{t("warehouse.shared.items")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
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
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.materialRequests.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailsId(r.id)}>
                  <TableCell className="font-mono text-sm">{refNo(r)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.dateTime(r.createdAt)}</TableCell>
                  <TableCell>{warehouseName(r.warehouseId, r.warehouse)}</TableCell>
                  <TableCell className="text-sm">{r.items?.length ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
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

      {scope === "all" && data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit || LIMIT}
          onPageChange={setPage}
        />
      )}

      <MaterialRequestCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <MaterialRequestDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
