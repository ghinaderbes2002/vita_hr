"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Factory, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useDeleteWarehouseManufacturer, useWarehouseManufacturers } from "@/lib/hooks/use-warehouse";
import { WarehouseManufacturer } from "@/lib/api/warehouse";
import { ManufacturerDialog } from "@/components/features/warehouse/manufacturer-dialog";

// The API names no permissions of its own for manufacturers; they are part of
// the item catalog, so the item permissions govern them.
export default function WarehouseManufacturersPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.READ}>
      <ManufacturersContent />
    </PageGuard>
  );
}

function ManufacturersContent() {
  const t = useTranslations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WarehouseManufacturer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseManufacturer | null>(null);

  const { data: manufacturers = [], isLoading } = useWarehouseManufacturers();
  const deleteManufacturer = useDeleteWarehouseManufacturer();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.manufacturers.title")}
        description={t("warehouse.manufacturers.description")}
        count={isLoading ? undefined : manufacturers.length}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.CREATE}>
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.manufacturers.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.manufacturers.fields.name")}</TableHead>
              <TableHead>{t("warehouse.manufacturers.fields.nameAr")}</TableHead>
              <TableHead className="w-[90px]">{t("common.actions")}</TableHead>
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
            ) : manufacturers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    icon={<Factory className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.manufacturers.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              manufacturers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium" dir="ltr">{m.name}</TableCell>
                  <TableCell className="text-sm">{m.nameAr || "—"}</TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.UPDATE}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={t("common.edit")}
                          onClick={() => { setSelected(m); setDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label={t("common.delete")}
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </ActionGuard>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ManufacturerDialog open={dialogOpen} onOpenChange={setDialogOpen} manufacturer={selected ?? undefined} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("warehouse.manufacturers.deleteTitle", { name: deleteTarget?.nameAr || deleteTarget?.name || "" })}
        description={t("warehouse.manufacturers.deleteDescription")}
        confirmText={t("common.delete")}
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteManufacturer.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />
    </div>
  );
}
