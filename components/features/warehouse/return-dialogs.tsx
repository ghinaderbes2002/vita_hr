"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseSuppliers } from "@/lib/hooks/use-warehouse";
import {
  useCreateReturn, usePurchaseInvoice, usePurchaseInvoices, useReturn,
} from "@/lib/hooks/use-warehouse-operations";
import { RETURN_TYPES, ReturnType } from "@/lib/api/warehouse-operations";
import { filledLines, LineDraft, LineItemsEditor, newLine } from "./line-items-editor";
import {
  DetailItem, DialogLoading, Field, FrozenWarehouseNotice, OptionSelect, refNo,
  toQty, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "./shared";
import { NONE } from "./utils";

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form state lives in a body rendered inside <DialogContent>, which Radix
// unmounts on close — so each open starts clean with no manual reset.
export function ReturnCreateDialog({ open, onOpenChange }: CreateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90dvh] overflow-y-auto">
        <ReturnCreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ReturnCreateForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, items } = useWarehouseLookups();
  const { data: suppliers = [] } = useWarehouseSuppliers();
  const { hasPermission, isAdmin } = usePermissions();
  const create = useCreateReturn();

  const [returnType, setReturnType] = useState<ReturnType>("ISSUE_RETURN");
  const [selectedWarehouseId, setWarehouseId] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [damagedWarehouseId, setDamagedWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);

  const isPurchase = returnType === "PURCHASE_RETURN";

  // A purchase return goes back to the supplier out of the warehouse of the
  // original invoice — and only posted invoices ever put stock in.
  const canReadInvoices = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.READ);
  const { data: invoicePage } = usePurchaseInvoices(
    { status: "POSTED", limit: 100 },
    isPurchase && canReadInvoices,
  );
  const invoices = invoicePage?.items ?? [];
  const { data: invoice } = usePurchaseInvoice(isPurchase ? purchaseInvoiceId : "");

  // On a purchase return the warehouse follows the chosen invoice and is not
  // editable; otherwise it is whatever was picked.
  const warehouseId = isPurchase ? invoice?.warehouseId ?? "" : selectedWarehouseId;

  const quarantine = warehouses.filter((w) => w.type === "QUARANTINE" && w.isActive);
  const selectableItems = isPurchase && invoice
    ? items.filter((i) => invoice.items.some((l) => l.itemId === i.id))
    : items;

  const filled = filledLines(lines);
  // Incoming returns must be inspected: every line needs a condition.
  const valid = isPurchase ? filled : filled.filter((l) => l.condition);
  const needsQuarantine = !isPurchase && valid.some((l) => l.condition === "DAMAGED" || l.condition === "INSPECT");
  const canSubmit =
    !!warehouseId &&
    (!isPurchase || !!purchaseInvoiceId) &&
    valid.length > 0 && valid.length === filled.length &&
    !(needsQuarantine && quarantine.length === 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        returnType,
        warehouseId,
        ...(isPurchase ? { purchaseInvoiceId } : {}),
        ...(needsQuarantine && damagedWarehouseId ? { damagedWarehouseId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: valid.map((l) => ({
          itemId: l.itemId,
          qty: toQty(l.qty)!,
          ...(!isPurchase && l.condition ? { condition: l.condition } : {}),
          ...(isPurchase && l.unitPrice.trim() !== "" ? { unitPrice: Number(l.unitPrice) } : {}),
          ...(l.note.trim() ? { note: l.note.trim() } : {}),
        })),
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.returns.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FrozenWarehouseNotice warehouseIds={[warehouseId, needsQuarantine ? damagedWarehouseId || quarantine[0]?.id : undefined]} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("warehouse.returns.returnType")} required>
              <OptionSelect
                value={returnType}
                onChange={(v) => {
                  setReturnType(v as ReturnType);
                  setPurchaseInvoiceId("");
                  setWarehouseId("");
                  setLines([newLine()]);
                }}
                options={RETURN_TYPES.map((r) => ({ value: r, label: t(`warehouse.returns.types.${r}`) }))}
              />
            </Field>

            {isPurchase ? (
              <Field label={t("warehouse.returns.purchaseInvoice")} required>
                <OptionSelect
                  value={purchaseInvoiceId}
                  onChange={(v) => { setPurchaseInvoiceId(v); setLines([newLine()]); }}
                  placeholder={t("warehouse.returns.selectPurchaseInvoice")}
                  options={invoices.map((inv) => ({
                    value: inv.id,
                    label: [
                      `#${refNo(inv)}`,
                      inv.supplier?.name ?? suppliers.find((s) => s.id === inv.supplierId)?.name,
                      fmt.date(inv.invoiceDate ?? inv.createdAt),
                    ].filter(Boolean).join(" · "),
                  }))}
                />
              </Field>
            ) : (
              <Field label={t("warehouse.shared.warehouse")} required>
                <OptionSelect
                  value={warehouseId}
                  onChange={setWarehouseId}
                  placeholder={t("warehouse.shared.selectWarehouse")}
                  options={warehouseOptions(warehouses, true)}
                />
              </Field>
            )}
          </div>

          {isPurchase && warehouseId && (
            <DetailItem label={t("warehouse.shared.warehouse")}>
              {warehouses.find((w) => w.id === warehouseId)?.name ?? "—"}
            </DetailItem>
          )}

          <Field
            label={t("warehouse.shared.items")}
            required
            hint={isPurchase ? undefined : t("warehouse.returns.conditionHint")}
          >
            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              items={selectableItems}
              withPrice={isPurchase}
              withCondition={!isPurchase}
              withNote
            />
          </Field>

          {needsQuarantine && (
            quarantine.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{t("warehouse.returns.noQuarantine")}</p>
              </div>
            ) : (
              <Field label={t("warehouse.returns.damagedWarehouse")}>
                <OptionSelect
                  value={damagedWarehouseId || NONE}
                  onChange={(v) => setDamagedWarehouseId(v === NONE ? "" : v)}
                  options={[
                    { value: NONE, label: t("warehouse.returns.damagedWarehouseAuto") },
                    ...quarantine.map((w) => ({ value: w.id, label: w.name })),
                  ]}
                />
              </Field>
            )
          )}

          <Field label={t("warehouse.shared.notes")}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
    </>
  );
}

interface DetailsProps {
  id: string | null;
  onClose: () => void;
}

export function ReturnDetailsDialog({ id, onClose }: DetailsProps) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouseName, itemName, itemSku } = useWarehouseLookups();
  const { data: ret, isLoading } = useReturn(id ?? "");

  const showCondition = ret?.items.some((l) => l.condition);
  const showPrice = ret?.items.some((l) => l.unitPrice != null);
  const showNote = ret?.items.some((l) => l.note);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {t("warehouse.returns.detailsTitle")}
            {ret && <span className="font-mono text-sm text-muted-foreground">#{refNo(ret)}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !ret ? (
          <DialogLoading />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DetailItem label={t("warehouse.returns.returnType")}>
                {t(`warehouse.returns.types.${ret.returnType}`)}
              </DetailItem>
              <DetailItem label={t("warehouse.shared.warehouse")}>
                {warehouseName(ret.warehouseId, ret.warehouse)}
              </DetailItem>
              <DetailItem label={t("warehouse.shared.date")}>{fmt.dateTime(ret.createdAt)}</DetailItem>
              {ret.damagedWarehouseId && (
                <DetailItem label={t("warehouse.returns.damagedWarehouse")}>
                  {warehouseName(ret.damagedWarehouseId)}
                </DetailItem>
              )}
              {ret.notes && <DetailItem label={t("warehouse.shared.notes")}>{ret.notes}</DetailItem>}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.shared.item")}</TableHead>
                    <TableHead>{t("warehouse.shared.quantity")}</TableHead>
                    {showCondition && <TableHead>{t("warehouse.returns.condition")}</TableHead>}
                    {showPrice && <TableHead>{t("warehouse.shared.unitPrice")}</TableHead>}
                    {showNote && <TableHead>{t("warehouse.shared.notes")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ret.items.map((l, i) => (
                    <TableRow key={l.id ?? `${l.itemId}-${i}`}>
                      <TableCell className="font-medium">
                        {itemName(l.itemId, l.item)}
                        <p className="font-mono text-xs text-muted-foreground">{itemSku(l.itemId, l.item)}</p>
                      </TableCell>
                      <TableCell>{fmt.qty(l.qty)}</TableCell>
                      {showCondition && (
                        <TableCell>{l.condition ? t(`warehouse.returns.conditions.${l.condition}`) : "—"}</TableCell>
                      )}
                      {showPrice && <TableCell>{fmt.money(l.unitPrice)}</TableCell>}
                      {showNote && <TableCell className="text-sm text-muted-foreground">{l.note || "—"}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("warehouse.shared.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
