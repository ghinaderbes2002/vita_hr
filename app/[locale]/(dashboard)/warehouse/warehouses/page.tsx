"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Pencil, Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouses } from "@/lib/hooks/use-warehouse";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { Warehouse } from "@/lib/api/warehouse";
import { WarehouseDialog } from "@/components/features/warehouse/warehouse-dialog";

export default function WarehousesPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_WAREHOUSES.READ}>
      <WarehousesContent />
    </PageGuard>
  );
}

function WarehousesContent() {
  const t = useTranslations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Warehouse | null>(null);

  const { data: warehouses = [], isLoading } = useWarehouses();
  const { data: employees = [] } = useEmployeesBasicList();

  const managerName = (id?: string | null) => {
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.firstNameAr} ${e.lastNameAr}` : "—";
  };

  // Returns route damaged parts to a QUARANTINE warehouse, so one must exist.
  const hasQuarantine = warehouses.some((w) => w.type === "QUARANTINE" && w.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.warehouses.title")}
        description={t("warehouse.warehouses.description")}
        count={isLoading ? undefined : warehouses.length}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_WAREHOUSES.CREATE}>
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.warehouses.add")}
            </Button>
          </ActionGuard>
        }
      />

      {!isLoading && warehouses.length > 0 && !hasQuarantine && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{t("warehouse.warehouses.noQuarantineWarning")}</p>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.warehouses.fields.code")}</TableHead>
              <TableHead>{t("warehouse.warehouses.fields.name")}</TableHead>
              <TableHead>{t("warehouse.warehouses.fields.type")}</TableHead>
              <TableHead>{t("warehouse.warehouses.fields.location")}</TableHead>
              <TableHead>{t("warehouse.warehouses.fields.manager")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<WarehouseIcon className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.warehouses.empty")}
                    description={t("warehouse.warehouses.emptyDescription")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-sm">{w.code}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={w.type === "QUARANTINE" ? "border-orange-300 bg-orange-50 text-orange-700" : undefined}
                    >
                      {t(`warehouse.warehouses.types.${w.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{w.location || "—"}</TableCell>
                  <TableCell className="text-sm">{managerName(w.managerEmployeeId)}</TableCell>
                  <TableCell>
                    <Badge variant={w.isActive ? "default" : "secondary"}>
                      {w.isActive ? t("warehouse.common.active") : t("warehouse.common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_WAREHOUSES.UPDATE}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t("common.edit")}
                        onClick={() => { setSelected(w); setDialogOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </ActionGuard>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WarehouseDialog open={dialogOpen} onOpenChange={setDialogOpen} warehouse={selected ?? undefined} />
    </div>
  );
}
