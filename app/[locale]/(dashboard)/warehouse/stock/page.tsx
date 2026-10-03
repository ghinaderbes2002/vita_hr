"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowUpDown, Package, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useLowStock, useStockBalances, useStockMovements } from "@/lib/hooks/use-warehouse-operations";
import { StockBalance } from "@/lib/api/warehouse-operations";
import { ItemCombobox } from "@/components/features/warehouse/line-items-editor";
import { AdjustStockDialog, MinStockDialog, StockTarget } from "@/components/features/warehouse/stock-dialogs";
import {
  ALL, FrozenWarehouseNotice, OptionSelect, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "@/components/features/warehouse/shared";

const LIMIT = 20;

export default function WarehouseStockPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_STOCK.READ}>
      <StockContent />
    </PageGuard>
  );
}

function StockContent() {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, items, warehouseName, itemName, itemSku } = useWarehouseLookups();

  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [itemFilter, setItemFilter] = useState("");
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [minOpen, setMinOpen] = useState(false);
  const [target, setTarget] = useState<StockTarget | undefined>();

  const warehouseId = warehouseFilter !== ALL ? warehouseFilter : undefined;
  const itemId = itemFilter || undefined;

  const { data: balances = [], isLoading: balancesLoading } = useStockBalances({ warehouseId, itemId });
  const { data: movements, isLoading: movementsLoading } = useStockMovements({ warehouseId, itemId, page, limit: LIMIT });
  const { data: lowStock = [], isLoading: lowLoading } = useLowStock({ warehouseId });

  // A balance row does not say what its minimum is — only the low-stock list
  // does (the warehouse's own minimum, else the item's). For the rest, the
  // item's general minimum is the best that can be shown.
  const lowByKey = new Map(lowStock.map((l) => [`${l.warehouseId}:${l.itemId}`, l]));
  const minStockOf = (b: StockBalance) =>
    b.minStock ?? lowByKey.get(`${b.warehouseId}:${b.itemId}`)?.minStock ?? b.item?.minStock ??
    items.find((i) => i.id === b.itemId)?.minStock;

  const openAdjust = (b?: StockBalance) => {
    setTarget(b ? { warehouseId: b.warehouseId, itemId: b.itemId } : { warehouseId });
    setAdjustOpen(true);
  };
  const openMin = (b?: StockBalance) => {
    setTarget(b ? { warehouseId: b.warehouseId, itemId: b.itemId, minStock: minStockOf(b) } : { warehouseId });
    setMinOpen(true);
  };

  const balanceRows = (rows: StockBalance[], loading: boolean, emptyKey: string) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("warehouse.shared.item")}</TableHead>
            <TableHead>{t("warehouse.shared.warehouse")}</TableHead>
            <TableHead>{t("warehouse.stock.onHand")}</TableHead>
            <TableHead>{t("warehouse.stock.reserved")}</TableHead>
            <TableHead>{t("warehouse.stock.available")}</TableHead>
            <TableHead>{t("warehouse.stock.minStock")}</TableHead>
            <TableHead className="w-[90px]">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <EmptyState icon={<Package className="h-8 w-8 text-muted-foreground" />} title={t(emptyKey)} />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((b) => {
              const available = b.availableQty ?? Number(b.onHandQty) - Number(b.reservedQty);
              const low = lowByKey.has(`${b.warehouseId}:${b.itemId}`);
              const minStock = minStockOf(b);
              return (
                <TableRow key={`${b.warehouseId}-${b.itemId}`} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {itemName(b.itemId, b.item)}
                    <p className="font-mono text-xs text-muted-foreground">{itemSku(b.itemId, b.item)}</p>
                  </TableCell>
                  <TableCell className="text-sm">{warehouseName(b.warehouseId, b.warehouse)}</TableCell>
                  <TableCell>{fmt.qty(b.onHandQty)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmt.qty(b.reservedQty)}</TableCell>
                  <TableCell>
                    <span className={low ? "font-bold text-orange-600" : "font-medium"}>{fmt.qty(available)}</span>
                    {low && <AlertTriangle className="ms-1 inline h-3.5 w-3.5 text-orange-500" />}
                  </TableCell>
                  <TableCell className="text-sm">{fmt.qty(minStock)}</TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_STOCK.ADJUST}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title={t("warehouse.stock.adjust")} aria-label={t("warehouse.stock.adjust")}
                          onClick={() => openAdjust(b)}
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title={t("warehouse.stock.setMinStock")} aria-label={t("warehouse.stock.setMinStock")}
                          onClick={() => openMin(b)}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </ActionGuard>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.stock.title")}
        description={t("warehouse.stock.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_STOCK.ADJUST}>
            <Button variant="outline" onClick={() => openMin()} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t("warehouse.stock.setMinStock")}
            </Button>
            <Button onClick={() => openAdjust()} className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              {t("warehouse.stock.adjust")}
            </Button>
          </ActionGuard>
        }
      />

      <FrozenWarehouseNotice warehouseIds={[warehouseId]} />

      <div className="flex flex-wrap items-center gap-3">
        <OptionSelect
          value={warehouseFilter}
          onChange={(v) => { setWarehouseFilter(v); setPage(1); }}
          allLabel={t("warehouse.shared.allWarehouses")}
          options={warehouseOptions(warehouses)}
          className="w-52"
        />
        <div className="w-72 max-w-full">
          <ItemCombobox items={items} value={itemFilter} onChange={(v) => { setItemFilter(v); setPage(1); }} />
        </div>
        {itemFilter && (
          <Button variant="ghost" size="sm" onClick={() => { setItemFilter(""); setPage(1); }}>
            {t("warehouse.stock.allItems")}
          </Button>
        )}
      </div>

      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">{t("warehouse.stock.tabs.balances")}</TabsTrigger>
          <TabsTrigger value="movements">{t("warehouse.stock.tabs.movements")}</TabsTrigger>
          <TabsTrigger value="low-stock">
            {t("warehouse.stock.tabs.lowStock")}
            {lowStock.length > 0 && <Badge className="ms-1.5 h-4 text-xs">{lowStock.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="mt-4">
          {balanceRows(balances, balancesLoading, "warehouse.stock.emptyBalances")}
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("warehouse.shared.date")}</TableHead>
                  <TableHead>{t("warehouse.shared.item")}</TableHead>
                  <TableHead>{t("warehouse.shared.warehouse")}</TableHead>
                  <TableHead>{t("warehouse.stock.movementType")}</TableHead>
                  <TableHead>{t("warehouse.shared.quantity")}</TableHead>
                  <TableHead>{t("warehouse.stock.balanceAfter")}</TableHead>
                  <TableHead>{t("warehouse.shared.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !movements || movements.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={<ArrowUpDown className="h-8 w-8 text-muted-foreground" />}
                        title={t("warehouse.stock.emptyMovements")}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.items.map((m) => {
                    // The deltas are signed: positive in, negative out. A
                    // reservation moves the reserved quantity, not the balance.
                    const onHand = Number(m.onHandDelta);
                    const delta = onHand !== 0 ? onHand : Number(m.reservedDelta);
                    const neutral = onHand === 0;
                    const up = delta > 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {fmt.dateTime(m.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{itemName(m.itemId, m.item)}</TableCell>
                        <TableCell className="text-sm">{warehouseName(m.warehouseId, m.warehouse)}</TableCell>
                        <TableCell className="text-sm">
                          {t.has(`warehouse.stock.movementTypes.${m.movementType}`)
                            ? t(`warehouse.stock.movementTypes.${m.movementType}`)
                            : m.movementType}
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          className={`text-start font-mono font-bold ${neutral ? "text-muted-foreground" : up ? "text-green-600" : "text-red-600"}`}
                        >
                          {up ? "+" : delta < 0 ? "−" : ""}
                          {fmt.qty(Math.abs(delta))}
                        </TableCell>
                        <TableCell>{fmt.qty(m.balanceAfter)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {movements && (
            <Pagination
              page={movements.page}
              totalPages={movements.totalPages}
              total={movements.total}
              limit={movements.limit || LIMIT}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="low-stock" className="mt-4">
          {balanceRows(lowStock, lowLoading, "warehouse.stock.emptyLowStock")}
        </TabsContent>
      </Tabs>

      <AdjustStockDialog open={adjustOpen} onOpenChange={setAdjustOpen} target={target} />
      <MinStockDialog open={minOpen} onOpenChange={setMinOpen} target={target} />
    </div>
  );
}
