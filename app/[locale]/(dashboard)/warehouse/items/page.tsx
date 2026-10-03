"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Boxes, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  useDeleteWarehouseItem, useWarehouseCategories, useWarehouseItems, useWarehouseUnits,
} from "@/lib/hooks/use-warehouse";
import { WarehouseItem, WarehouseItemType, WAREHOUSE_ITEM_TYPES } from "@/lib/api/warehouse";
import { ItemDialog } from "@/components/features/warehouse/item-dialog";
import { localizedName } from "@/components/features/warehouse/utils";

const ALL = "all";

export default function WarehouseItemsPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.READ}>
      <ItemsContent />
    </PageGuard>
  );
}

function ItemsContent() {
  const t = useTranslations();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WarehouseItemType | typeof ALL>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WarehouseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseItem | null>(null);

  const { data: items = [], isLoading } = useWarehouseItems({
    search: search.trim() || undefined,
    itemType: typeFilter !== ALL ? typeFilter : undefined,
    categoryId: categoryFilter !== ALL ? categoryFilter : undefined,
  });
  const { data: categories = [] } = useWarehouseCategories();
  const { data: units = [] } = useWarehouseUnits();
  const deleteItem = useDeleteWarehouseItem();

  // The list may or may not embed the relations; fall back to the lookups.
  const categoryName = (item: WarehouseItem) => {
    const c = item.category ?? categories.find((x) => x.id === item.categoryId);
    return c ? localizedName(c, locale) : "—";
  };
  const unitName = (item: WarehouseItem) => {
    const u = item.unit ?? units.find((x) => x.id === item.unitId);
    return u ? u.symbol || u.name : "—";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.items.title")}
        description={t("warehouse.items.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.CREATE}>
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.items.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("warehouse.items.searchPlaceholder")}
            className="ps-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as WarehouseItemType | typeof ALL)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("warehouse.items.allTypes")}</SelectItem>
            {WAREHOUSE_ITEM_TYPES.map((v) => (
              <SelectItem key={v} value={v}>{t(`warehouse.items.types.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("warehouse.items.allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{localizedName(c, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.items.fields.sku")}</TableHead>
              <TableHead>{t("warehouse.items.fields.name")}</TableHead>
              <TableHead>{t("warehouse.items.fields.partCode")}</TableHead>
              <TableHead>{t("warehouse.items.fields.itemType")}</TableHead>
              <TableHead>{t("warehouse.items.fields.category")}</TableHead>
              <TableHead>{t("warehouse.items.fields.unit")}</TableHead>
              <TableHead>{t("warehouse.items.fields.minStock")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[90px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState
                    icon={<Boxes className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.items.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell className="font-medium">
                    {localizedName(item, locale)}
                    {item.manufacturer && (
                      <p className="text-xs text-muted-foreground">{item.manufacturer}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{item.partCode || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {item.itemType ? t(`warehouse.items.types.${item.itemType}`) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{categoryName(item)}</TableCell>
                  <TableCell className="text-sm">{unitName(item)}</TableCell>
                  <TableCell className="text-sm">{item.minStock ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive !== false ? "default" : "secondary"}>
                      {item.isActive !== false ? t("warehouse.common.active") : t("warehouse.common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {/* Soft delete is gated by the update permission, same as editing. */}
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_ITEMS.UPDATE}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={t("common.edit")}
                          onClick={() => { setSelected(item); setDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label={t("common.delete")}
                          onClick={() => setDeleteTarget(item)}
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

      <ItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={selected ?? undefined} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("warehouse.items.deleteTitle", { name: deleteTarget ? localizedName(deleteTarget, locale) : "" })}
        description={t("warehouse.items.deleteDescription")}
        confirmText={t("common.delete")}
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteItem.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />
    </div>
  );
}
