"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FolderTree, Pencil, Plus } from "lucide-react";
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
import { useWarehouseCategories } from "@/lib/hooks/use-warehouse";
import { WarehouseCategory } from "@/lib/api/warehouse";
import { CategoryDialog } from "@/components/features/warehouse/category-dialog";
import { localizedName } from "@/components/features/warehouse/utils";

// Categories have no permissions of their own — they share the items ones.
export default function WarehouseCategoriesPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.READ}>
      <CategoriesContent />
    </PageGuard>
  );
}

function CategoriesContent() {
  const t = useTranslations();
  const locale = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WarehouseCategory | null>(null);

  const { data: categories = [], isLoading } = useWarehouseCategories();

  const parentName = (c: WarehouseCategory) => {
    const parent = c.parent ?? categories.find((p) => p.id === c.parentId);
    return parent ? localizedName(parent, locale) : "—";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.categories.title")}
        description={t("warehouse.categories.description")}
        count={isLoading ? undefined : categories.length}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.CREATE}>
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.categories.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.categories.fields.name")}</TableHead>
              <TableHead>{t("warehouse.categories.fields.nameAr")}</TableHead>
              <TableHead>{t("warehouse.categories.fields.parent")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    icon={<FolderTree className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.categories.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.nameAr || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{parentName(c)}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive !== false ? "default" : "secondary"}>
                      {c.isActive !== false ? t("warehouse.common.active") : t("warehouse.common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.UPDATE}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t("common.edit")}
                        onClick={() => { setSelected(c); setDialogOpen(true); }}
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selected ?? undefined}
        categories={categories}
      />
    </div>
  );
}
