"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Ruler } from "lucide-react";
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
import { useWarehouseUnits } from "@/lib/hooks/use-warehouse";
import { WarehouseUnit } from "@/lib/api/warehouse";
import { UnitDialog } from "@/components/features/warehouse/unit-dialog";

export default function WarehouseUnitsPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_UNITS.READ}>
      <UnitsContent />
    </PageGuard>
  );
}

function UnitsContent() {
  const t = useTranslations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WarehouseUnit | null>(null);

  const { data: units = [], isLoading } = useWarehouseUnits();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.units.title")}
        description={t("warehouse.units.description")}
        count={isLoading ? undefined : units.length}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_UNITS.CREATE}>
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.units.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.units.fields.name")}</TableHead>
              <TableHead>{t("warehouse.units.fields.symbol")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    icon={<Ruler className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.units.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.symbol || "—"}</TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_UNITS.UPDATE}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t("common.edit")}
                        onClick={() => { setSelected(u); setDialogOpen(true); }}
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

      <UnitDialog open={dialogOpen} onOpenChange={setDialogOpen} unit={selected ?? undefined} />
    </div>
  );
}
