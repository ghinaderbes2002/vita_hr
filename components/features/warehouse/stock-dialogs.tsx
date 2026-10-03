"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdjustStock, useSetMinStock } from "@/lib/hooks/use-warehouse-operations";
import { ItemCombobox } from "./line-items-editor";
import {
  Field, FrozenWarehouseNotice, OptionSelect, toQty, useWarehouseLookups, warehouseOptions,
} from "./shared";

/** Row the dialog was opened from, if any — prefills warehouse and item. */
export interface StockTarget {
  warehouseId?: string;
  itemId?: string;
  minStock?: number | string | null;
}

interface StockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: StockTarget;
}

// Form state lives in a body rendered inside <DialogContent>, which Radix
// unmounts on close — so each open starts clean with no manual reset.
export function AdjustStockDialog({ open, onOpenChange, target }: StockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <AdjustStockForm target={target} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface StockFormProps {
  target?: StockTarget;
  onDone: () => void;
}

function AdjustStockForm({ target, onDone }: StockFormProps) {
  const t = useTranslations();
  const { warehouses, items } = useWarehouseLookups();
  const adjust = useAdjustStock();

  const [warehouseId, setWarehouseId] = useState(target?.warehouseId ?? "");
  const [itemId, setItemId] = useState(target?.itemId ?? "");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const qty = toQty(quantity);
  const canSubmit = !!warehouseId && !!itemId && qty !== undefined;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await adjust.mutateAsync({
        warehouseId, itemId, direction, quantity: qty, ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.stock.adjustTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FrozenWarehouseNotice warehouseIds={[warehouseId]} />
          <Field label={t("warehouse.shared.warehouse")} required>
            <OptionSelect
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={t("warehouse.shared.selectWarehouse")}
              options={warehouseOptions(warehouses, true)}
            />
          </Field>
          <Field label={t("warehouse.shared.item")} required>
            <ItemCombobox items={items} value={itemId} onChange={setItemId} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("warehouse.stock.direction")} required>
              <OptionSelect
                value={direction}
                onChange={(v) => setDirection(v as "IN" | "OUT")}
                options={(["IN", "OUT"] as const).map((d) => ({ value: d, label: t(`warehouse.stock.directions.${d}`) }))}
              />
            </Field>
            <Field label={t("warehouse.shared.quantity")} required>
              <Input type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
          </div>
          <Field label={t("warehouse.shared.notes")}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || adjust.isPending}>
            {adjust.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
    </>
  );
}

export function MinStockDialog({ open, onOpenChange, target }: StockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <MinStockForm target={target} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MinStockForm({ target, onDone }: StockFormProps) {
  const t = useTranslations();
  const { warehouses, items } = useWarehouseLookups();
  const setMin = useSetMinStock();

  const [warehouseId, setWarehouseId] = useState(target?.warehouseId ?? "");
  const [itemId, setItemId] = useState(target?.itemId ?? "");
  const [minStock, setMinStock] = useState(target?.minStock != null ? String(Number(target.minStock)) : "");

  const value = Number(minStock);
  const canSubmit = !!warehouseId && !!itemId && minStock.trim() !== "" && value >= 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await setMin.mutateAsync({ warehouseId, itemId, minStock: value });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.stock.setMinStockTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("warehouse.stock.minStockHint")}</p>
          <Field label={t("warehouse.shared.warehouse")} required>
            <OptionSelect
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={t("warehouse.shared.selectWarehouse")}
              options={warehouseOptions(warehouses, true)}
            />
          </Field>
          <Field label={t("warehouse.shared.item")} required>
            <ItemCombobox items={items} value={itemId} onChange={setItemId} />
          </Field>
          <Field label={t("warehouse.stock.minStock")} required>
            <Input type="number" min={0} step="any" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || setMin.isPending}>
            {setMin.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
    </>
  );
}
