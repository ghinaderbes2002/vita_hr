"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useWarehouseSuppliers } from "@/lib/hooks/use-warehouse";
import { WarehouseSupplier } from "@/lib/api/warehouse";
import { SupplierDialog } from "@/components/features/warehouse/supplier-dialog";

export default function WarehouseSuppliersPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_SUPPLIERS.READ}>
      <SuppliersContent />
    </PageGuard>
  );
}

function SuppliersContent() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WarehouseSupplier | null>(null);

  const { data: allSuppliers = [], isLoading } = useWarehouseSuppliers();

  // The endpoint takes no query, so the list is filtered here.
  const q = search.trim().toLowerCase();
  const suppliers = allSuppliers.filter((s) =>
    !q ||
    s.name.toLowerCase().includes(q) ||
    s.phone?.toLowerCase().includes(q) ||
    s.email?.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.suppliers.title")}
        description={t("warehouse.suppliers.description")}
        count={isLoading ? undefined : allSuppliers.length}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_SUPPLIERS.CREATE}>
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.suppliers.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("warehouse.common.searchPlaceholder")}
          className="ps-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.suppliers.fields.name")}</TableHead>
              <TableHead>{t("warehouse.suppliers.fields.phone")}</TableHead>
              <TableHead>{t("warehouse.suppliers.fields.email")}</TableHead>
              <TableHead>{t("warehouse.suppliers.fields.address")}</TableHead>
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
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<Truck className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.suppliers.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm" dir="ltr">{s.phone || "—"}</TableCell>
                  <TableCell className="text-sm" dir="ltr">{s.email || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.address || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive !== false ? "default" : "secondary"}>
                      {s.isActive !== false ? t("warehouse.common.active") : t("warehouse.common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_SUPPLIERS.UPDATE}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t("common.edit")}
                        onClick={() => { setSelected(s); setDialogOpen(true); }}
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

      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={selected ?? undefined} />
    </div>
  );
}
