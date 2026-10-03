"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseCurrencies, useWarehouseSuppliers } from "@/lib/hooks/use-warehouse";
import {
  useApprovePurchaseInvoice, useCreatePurchaseInvoice, usePostPurchaseInvoice,
  usePurchaseInvoice, useRejectPurchaseInvoice,
} from "@/lib/hooks/use-warehouse-operations";
import { DiscountType } from "@/lib/api/warehouse-operations";
import { filledLines, LineDraft, LineItemsEditor, newLine } from "./line-items-editor";
import { applyDiscount, discountDto, DiscountFields, PricedLinesTable } from "./pricing";
import {
  DetailItem, DialogLoading, Field, FrozenWarehouseNotice, OptionSelect, ReasonDialog, refNo,
  StatusBadge, toQty, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "./shared";

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form state lives in a body rendered inside <DialogContent>, which Radix
// unmounts on close — so each open starts clean with no manual reset.
export function PurchaseInvoiceCreateDialog({ open, onOpenChange }: CreateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90dvh] overflow-y-auto">
        <PurchaseInvoiceCreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PurchaseInvoiceCreateForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouses, items } = useWarehouseLookups();
  const { data: suppliers = [] } = useWarehouseSuppliers();
  const { data: currencies = [] } = useWarehouseCurrencies();
  const create = useCreatePurchaseInvoice();

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [discountType, setDiscountType] = useState<DiscountType | "">("");
  const [discountValue, setDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);

  // A purchase line needs a price as well as an item and a quantity.
  const valid = filledLines(lines).filter((l) => l.unitPrice.trim() !== "" && Number(l.unitPrice) >= 0);
  const canSubmit = !!supplierId && !!warehouseId && !!currencyId && valid.length > 0 && valid.length === filledLines(lines).length;

  const subtotal = valid.reduce((sum, l) => sum + toQty(l.qty)! * Number(l.unitPrice), 0);
  const total = applyDiscount(subtotal, discountType, discountValue);
  const currencyCode = currencies.find((c) => c.id === currencyId)?.code;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        supplierId,
        warehouseId,
        currencyId,
        ...(invoiceDate ? { invoiceDate } : {}),
        ...discountDto(discountType, discountValue),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: valid.map((l) => ({ itemId: l.itemId, qty: toQty(l.qty)!, unitPrice: Number(l.unitPrice) })),
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.purchaseInvoices.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("warehouse.shared.supplier")} required>
              <OptionSelect
                value={supplierId}
                onChange={setSupplierId}
                placeholder={t("warehouse.shared.selectSupplier")}
                options={suppliers.filter((s) => s.isActive !== false).map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
            <Field label={t("warehouse.shared.warehouse")} required>
              <OptionSelect
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder={t("warehouse.shared.selectWarehouse")}
                options={warehouseOptions(warehouses, true)}
              />
            </Field>
            <Field label={t("warehouse.shared.currency")} required>
              <OptionSelect
                value={currencyId}
                onChange={setCurrencyId}
                placeholder={t("warehouse.shared.selectCurrency")}
                options={currencies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
              />
            </Field>
            <Field label={t("warehouse.purchaseInvoices.invoiceDate")}>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </Field>
          </div>

          <Field label={t("warehouse.shared.items")} required>
            <LineItemsEditor lines={lines} onChange={setLines} items={items} withPrice />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("warehouse.shared.discount")}>
              <DiscountFields
                type={discountType}
                value={discountValue}
                onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }}
              />
            </Field>
            <div className="flex items-end justify-between rounded-lg border bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">{t("warehouse.shared.total")}</span>
              <span className="text-lg font-bold">{fmt.money(total, currencyCode)}</span>
            </div>
          </div>

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

export function PurchaseInvoiceDetailsDialog({ id, onClose }: DetailsProps) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouseName, itemName, itemSku } = useWarehouseLookups();
  const { data: suppliers = [] } = useWarehouseSuppliers();
  const { data: currencies = [] } = useWarehouseCurrencies();
  const { data: invoice, isLoading } = usePurchaseInvoice(id ?? "");

  const approve = useApprovePurchaseInvoice();
  const reject = useRejectPurchaseInvoice();
  const post = usePostPurchaseInvoice();

  const [confirm, setConfirm] = useState<"approve" | "post" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const currencyCode = invoice
    ? invoice.currency?.code ?? currencies.find((c) => c.id === invoice.currencyId)?.code
    : undefined;

  return (
    <>
      <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[760px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {t("warehouse.purchaseInvoices.detailsTitle")}
              {invoice && <span className="font-mono text-sm text-muted-foreground">#{refNo(invoice)}</span>}
              {invoice && <StatusBadge status={invoice.status} />}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !invoice ? (
            <DialogLoading />
          ) : (
            <div className="space-y-4">
              {/* Posting is the step that moves stock, so that is when a count matters. */}
              {invoice.status === "APPROVED" && <FrozenWarehouseNotice warehouseIds={[invoice.warehouseId]} />}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailItem label={t("warehouse.shared.supplier")}>
                  {invoice.supplier?.name ?? suppliers.find((s) => s.id === invoice.supplierId)?.name ?? "—"}
                </DetailItem>
                <DetailItem label={t("warehouse.shared.warehouse")}>
                  {warehouseName(invoice.warehouseId, invoice.warehouse)}
                </DetailItem>
                <DetailItem label={t("warehouse.purchaseInvoices.invoiceDate")}>
                  {fmt.date(invoice.invoiceDate ?? invoice.createdAt)}
                </DetailItem>
                <DetailItem label={t("warehouse.shared.currency")}>{currencyCode ?? "—"}</DetailItem>
                {invoice.exchangeRate !== undefined && (
                  <DetailItem label={t("warehouse.shared.exchangeRate")}>{fmt.qty(invoice.exchangeRate)}</DetailItem>
                )}
                {invoice.notes && <DetailItem label={t("warehouse.shared.notes")}>{invoice.notes}</DetailItem>}
                {invoice.rejectionReason && (
                  <DetailItem label={t("warehouse.shared.reason")}>{invoice.rejectionReason}</DetailItem>
                )}
              </div>

              <PricedLinesTable
                lines={invoice.items.map((l, i) => ({
                  key: l.id ?? `${l.itemId}-${i}`,
                  name: itemName(l.itemId, l.item),
                  sub: itemSku(l.itemId, l.item),
                  qty: Number(l.qty),
                  unitPrice: l.unitPrice,
                  lineTotal: l.lineTotal,
                }))}
                currencyCode={currencyCode}
                subtotal={invoice.subtotal}
                discountType={invoice.discountType}
                discountValue={invoice.discountValue}
                total={invoice.total}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t("warehouse.shared.close")}</Button>
            {invoice?.status === "DRAFT" && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.APPROVE}>
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  {t("warehouse.shared.reject")}
                </Button>
                <Button onClick={() => setConfirm("approve")}>{t("warehouse.purchaseInvoices.approve")}</Button>
              </ActionGuard>
            )}
            {invoice?.status === "APPROVED" && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.POST}>
                <Button onClick={() => setConfirm("post")}>{t("warehouse.purchaseInvoices.post")}</Button>
              </ActionGuard>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t(`warehouse.purchaseInvoices.${confirm === "post" ? "postConfirmTitle" : "approveConfirmTitle"}`)}
        description={t(`warehouse.purchaseInvoices.${confirm === "post" ? "postConfirmDescription" : "approveConfirmDescription"}`)}
        onConfirm={() => {
          if (invoice) (confirm === "post" ? post : approve).mutate(invoice.id);
          setConfirm(null);
        }}
      />

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("warehouse.purchaseInvoices.rejectTitle")}
        isPending={reject.isPending}
        onConfirm={async (reason) => {
          if (!invoice) return;
          try {
            await reject.mutateAsync({ id: invoice.id, reason: reason || undefined });
            setRejectOpen(false);
          } catch {
            // Error handled by mutation
          }
        }}
      />
    </>
  );
}
