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
  DetailItem, DialogLoading, Field, FrozenWarehouseNotice, OptionSelect, purchaseInvoiceStatusKey, ReasonDialog, refNo,
  SearchableOptionSelect,
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

  // The storekeeper records items and quantities only: the finance manager prices
  // the invoice when approving it, so no price is ever sent from here.
  const valid = filledLines(lines);
  const canSubmit = !!supplierId && !!warehouseId && !!currencyId && valid.length > 0;

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
        items: valid.map((l) => ({ itemId: l.itemId, qty: toQty(l.qty)! })),
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
              <SearchableOptionSelect
                value={supplierId}
                onChange={setSupplierId}
                placeholder={t("warehouse.shared.selectSupplier")}
                searchPlaceholder={t("warehouse.shared.searchSupplier")}
                emptyText={t("warehouse.shared.noSuppliers")}
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
            <p className="text-xs text-muted-foreground">{t("warehouse.purchaseInvoices.priceOptionalHint")}</p>
            <LineItemsEditor lines={lines} onChange={setLines} items={items} withPrice priceLocked allowCreateItem />
          </Field>

          {/* No total here: nothing is priced until the finance manager approves. */}
          <Field label={t("warehouse.shared.discount")}>
            <DiscountFields
              type={discountType}
              value={discountValue}
              onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }}
            />
          </Field>

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

  const [confirm, setConfirm] = useState<"post" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  // Pricing happens on approval. One price per item, as the API takes it; a
  // price already on the invoice is offered as the starting value.
  const [pricing, setPricing] = useState<Record<string, string> | null>(null);
  const openPricing = () => {
    if (!invoice) return;
    const start: Record<string, string> = {};
    invoice.items.forEach((l) => {
      if (start[l.itemId] === undefined) start[l.itemId] = Number(l.unitPrice) > 0 ? String(Number(l.unitPrice)) : "";
    });
    setPricing(start);
  };
  const pricedSubtotal = invoice && pricing
    ? invoice.items.reduce((sum, l) => sum + Number(l.qty) * (Number(pricing[l.itemId]) || 0), 0)
    : 0;
  const pricingComplete = !!pricing && Object.values(pricing).every((v) => v.trim() !== "" && Number(v) > 0);
  const submitPricing = async () => {
    if (!invoice || !pricing || !pricingComplete) return;
    try {
      await approve.mutateAsync({
        id: invoice.id,
        items: Object.entries(pricing).map(([itemId, v]) => ({ itemId, unitPrice: Number(v) })),
      });
      setPricing(null);
    } catch {
      // Error handled by mutation
    }
  };

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
              {invoice && <StatusBadge status={invoice.status} label={t(purchaseInvoiceStatusKey(invoice.status))} />}
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
                <Button onClick={openPricing}>{t("warehouse.purchaseInvoices.priceAndApprove")}</Button>
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
        title={t("warehouse.purchaseInvoices.postConfirmTitle")}
        description={t("warehouse.purchaseInvoices.postConfirmDescription")}
        onConfirm={() => {
          if (invoice) post.mutate(invoice.id);
          setConfirm(null);
        }}
      />

      <Dialog open={!!pricing} onOpenChange={(o) => { if (!o && !approve.isPending) setPricing(null); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("warehouse.purchaseInvoices.priceAndApprove")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("warehouse.purchaseInvoices.pricingHint")}</p>
          {invoice && pricing && (
            <div className="space-y-3">
              <div className="rounded-md border divide-y">
                {invoice.items.map((l, i) => (
                  <div key={l.id ?? `${l.itemId}-${i}`} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{itemName(l.itemId, l.item)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("warehouse.shared.quantity")}: {fmt.qty(l.qty)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      dir="ltr"
                      className="h-9 w-32"
                      placeholder={t("warehouse.shared.unitPrice")}
                      value={pricing[l.itemId] ?? ""}
                      onChange={(e) => setPricing((p) => p && ({ ...p, [l.itemId]: e.target.value }))}
                    />
                    <span className="w-28 text-end text-sm tabular-nums">
                      {fmt.money(Number(l.qty) * (Number(pricing[l.itemId]) || 0), currencyCode)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t("warehouse.shared.total")}</span>
                <span className="font-semibold tabular-nums">
                  {fmt.money(applyDiscount(pricedSubtotal, invoice.discountType, invoice.discountValue), currencyCode)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricing(null)} disabled={approve.isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitPricing} disabled={!pricingComplete || approve.isPending}>
              {approve.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("warehouse.purchaseInvoices.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
