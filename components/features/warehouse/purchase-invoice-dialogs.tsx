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
import { useExchangeRates, useWarehouseCurrencies, useWarehouseSuppliers } from "@/lib/hooks/use-warehouse";
import {
  useApprovePurchaseInvoice, useCreatePurchaseInvoice, usePostPurchaseInvoice,
  usePurchaseInvoice, useRejectPurchaseInvoice,
  useCancelPurchaseInvoice, useRejectCancelPurchaseInvoice, useRequestCancelPurchaseInvoice,
} from "@/lib/hooks/use-warehouse-operations";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { apiErrorCode, apiErrorMessage } from "@/lib/api/api-errors";
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
  const create = useCreatePurchaseInvoice();

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);

  // The storekeeper records items and quantities only: the finance manager sets
  // the currency, prices and discount when approving, so none is sent from here.
  const valid = filledLines(lines);
  const canSubmit = !!supplierId && !!warehouseId && valid.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        supplierId,
        warehouseId,
        ...(invoiceDate ? { invoiceDate } : {}),
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
            <Field label={t("warehouse.purchaseInvoices.invoiceDate")}>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </Field>
          </div>

          <Field label={t("warehouse.shared.items")} required>
            <p className="text-xs text-muted-foreground">{t("warehouse.purchaseInvoices.priceOptionalHint")}</p>
            <LineItemsEditor lines={lines} onChange={setLines} items={items} withPrice priceLocked allowCreateItem />
          </Field>

          {/* No currency, discount or total here: all of it is set on approval. */}
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

  // Cancelling: the warehouse side (create permission) asks, the finance side
  // (approve permission) decides — or cancels outright without being asked.
  const { hasPermission, isAdmin } = usePermissions();
  const canDecide = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.APPROVE);
  const canRequest = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_PURCHASE_INVOICES.CREATE);
  const requestCancel = useRequestCancelPurchaseInvoice();
  const cancel = useCancelPurchaseInvoice();
  const rejectCancel = useRejectCancelPurchaseInvoice();
  const [cancelFlow, setCancelFlow] = useState<"request" | "cancel" | "reject" | null>(null);
  // Kept in the dialog: on a posted invoice the refusal names the item that is
  // no longer in stock, and a toast would be gone before it is read.
  const [cancelError, setCancelError] = useState<string | null>(null);
  const openCancelFlow = (flow: "request" | "cancel" | "reject") => { setCancelError(null); setCancelFlow(flow); };
  const runCancelFlow = async (reason: string) => {
    if (!invoice || !cancelFlow) return;
    const vars = { id: invoice.id, reason: reason || undefined };
    try {
      if (cancelFlow === "request") await requestCancel.mutateAsync(vars);
      else if (cancelFlow === "cancel") await cancel.mutateAsync(vars);
      else await rejectCancel.mutateAsync(vars);
      setCancelFlow(null);
    } catch (e) {
      // The server's message is the one that names the item; the code's own
      // wording is the fallback when there is none.
      setCancelError(
        apiErrorMessage(e, apiErrorCode(e) === "INSUFFICIENT_STOCK_FOR_CANCEL"
          ? t("warehouse.purchaseInvoices.insufficientStockForCancel")
          : t("warehouse.opToast.error")),
      );
    }
  };
  const cancelPending = requestCancel.isPending || cancel.isPending || rejectCancel.isPending;
  // Pricing happens on approval. One price per item, as the API takes it; a
  // price already on the invoice is offered as the starting value.
  const [pricing, setPricing] = useState<Record<string, string> | null>(null);
  // Currency and discount are chosen here too. Whatever is on the invoice is the
  // starting value; a discount left empty means none, as the server keeps nothing.
  const [approveCurrencyId, setApproveCurrencyId] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType | "">("");
  const [discountValue, setDiscountValue] = useState("");
  // Optional per-invoice rate (units of the invoice currency per 1 USD). Empty
  // means the latest general rate, which the server picks itself.
  const [manualRate, setManualRate] = useState("");
  const openPricing = () => {
    if (!invoice) return;
    const start: Record<string, string> = {};
    invoice.items.forEach((l) => {
      if (start[l.itemId] === undefined) start[l.itemId] = Number(l.unitPrice) > 0 ? String(Number(l.unitPrice)) : "";
    });
    setPricing(start);
    setApproveCurrencyId(invoice.currencyId ?? "");
    setDiscountType(invoice.discountType ?? "");
    setDiscountValue(invoice.discountValue != null && Number(invoice.discountValue) > 0 ? String(Number(invoice.discountValue)) : "");
    setManualRate("");
  };
  const pricedSubtotal = invoice && pricing
    ? invoice.items.reduce((sum, l) => sum + Number(l.qty) * (Number(pricing[l.itemId]) || 0), 0)
    : 0;
  const approveCurrencyCode = currencies.find((c) => c.id === approveCurrencyId)?.code;
  // A dollar invoice needs no rate; any other currency may take its own. The
  // rate typed in always means "how many Syrian pounds make 1 USD", whatever the
  // invoice currency — it only feeds totalUSD.
  const needsRate = !!approveCurrencyId && approveCurrencyCode?.toUpperCase() !== "USD";
  const rateNumber = Number(manualRate);
  const rateValid = !needsRate || manualRate.trim() === "" || (Number.isFinite(rateNumber) && rateNumber > 0);
  // Left empty, the server falls back on the dollar's own general rate (pounds
  // per 1 USD) — not the invoice currency's — so that is the one to show.
  const usdCurrencyId = currencies.find((c) => c.code?.toUpperCase() === "USD")?.id ?? "";
  const { data: usdRates = [] } = useExchangeRates(needsRate && pricing ? usdCurrencyId : "");
  const latestGeneralRate = [...usdRates].sort(
    (a, b) => new Date(b.effectiveFrom ?? b.createdAt ?? 0).getTime() - new Date(a.effectiveFrom ?? a.createdAt ?? 0).getTime(),
  )[0]?.rate;
  // The dollar preview divides by pounds-per-dollar, so it is only right for a
  // pound invoice; another currency would need its own rate to pounds first.
  const effectiveRate = manualRate.trim() !== "" ? rateNumber : Number(latestGeneralRate);
  const showUsdPreview = needsRate && rateValid && approveCurrencyCode?.toUpperCase() === "SYP" &&
    Number.isFinite(effectiveRate) && effectiveRate > 0;
  const pricingComplete = !!pricing && !!approveCurrencyId && rateValid &&
    Object.values(pricing).every((v) => v.trim() !== "" && Number(v) > 0);
  const pricedTotal = applyDiscount(pricedSubtotal, discountType, discountValue);
  const submitPricing = async () => {
    if (!invoice || !pricing || !pricingComplete) return;
    try {
      await approve.mutateAsync({
        id: invoice.id,
        dto: {
          currencyId: approveCurrencyId,
          ...discountDto(discountType, discountValue),
          ...(needsRate && manualRate.trim() !== "" ? { exchangeRate: rateNumber } : {}),
          items: Object.entries(pricing).map(([itemId, v]) => ({ itemId, unitPrice: Number(v) })),
        },
      });
      setPricing(null);
    } catch {
      // Error handled by mutation
    }
  };

  const currencyCode = invoice
    ? invoice.currency?.code ?? currencies.find((c) => c.id === invoice.currencyId)?.code
    : undefined;
  // Until approval there is no currency, and subtotal/total come back as 0:
  // shown as "not priced yet" rather than as a real zero.
  const priced = !!invoice?.currencyId;

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
                {/* The rate this invoice was converted at (the one typed in on approval, if
                    any). exchangeRate is the general base-currency rate, kept as a fallback
                    only for invoices approved before usdExchangeRate existed. */}
                {(invoice.usdExchangeRate ?? invoice.exchangeRate) != null && currencyCode?.toUpperCase() !== "USD" && (
                  <DetailItem label={t("warehouse.shared.exchangeRate")}>
                    {fmt.qty(invoice.usdExchangeRate ?? invoice.exchangeRate)}
                  </DetailItem>
                )}
                {/* Frozen at approval; null when the system has no USD rate to convert with. */}
                {priced && currencyCode?.toUpperCase() !== "USD" && (
                  <DetailItem label={t("warehouse.purchaseInvoices.totalUSD")}>
                    {invoice.totalUSD != null ? fmt.money(invoice.totalUSD, "USD") : "—"}
                  </DetailItem>
                )}
                {invoice.notes && <DetailItem label={t("warehouse.shared.notes")}>{invoice.notes}</DetailItem>}
                {invoice.rejectionReason && (
                  <DetailItem label={t("warehouse.shared.reason")}>{invoice.rejectionReason}</DetailItem>
                )}
              </div>

              {/* The open request while finance decides, and the final word once cancelled. */}
              {invoice.status === "CANCEL_REQUESTED" && (
                <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-950/40">
                  <p className="font-medium text-orange-900 dark:text-orange-200">
                    {t("warehouse.purchaseInvoices.cancelRequested")}
                    {invoice.cancelRequestedAt && <span className="font-normal"> · {fmt.dateTime(invoice.cancelRequestedAt)}</span>}
                  </p>
                  <p className="mt-1 text-orange-900/80 dark:text-orange-200/80">
                    {t("warehouse.purchaseInvoices.cancelReason")}: {invoice.cancelRequestReason || t("warehouse.purchaseInvoices.noReason")}
                  </p>
                </div>
              )}
              {invoice.status === "CANCELLED" && invoice.cancelledAt && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p className="font-medium">
                    {t("warehouse.purchaseInvoices.cancelled")} · {fmt.dateTime(invoice.cancelledAt)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t("warehouse.purchaseInvoices.cancelReason")}: {invoice.cancellationReason || t("warehouse.purchaseInvoices.noReason")}
                  </p>
                </div>
              )}

              {!priced && (
                <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {t("warehouse.purchaseInvoices.notPriced")}
                </p>
              )}
              <PricedLinesTable
                lines={invoice.items.map((l, i) => ({
                  key: l.id ?? `${l.itemId}-${i}`,
                  name: itemName(l.itemId, l.item),
                  sub: itemSku(l.itemId, l.item),
                  qty: Number(l.qty),
                  unitPrice: priced ? l.unitPrice : undefined,
                  lineTotal: priced ? l.lineTotal : undefined,
                }))}
                currencyCode={currencyCode}
                subtotal={priced ? invoice.subtotal : undefined}
                discountType={invoice.discountType}
                discountValue={invoice.discountValue}
                total={priced ? invoice.total : undefined}
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
            {(invoice?.status === "APPROVED" || invoice?.status === "POSTED") && (
              // Finance cancels outright; the warehouse side can only ask.
              canDecide ? (
                <Button variant="destructive" onClick={() => openCancelFlow("cancel")}>
                  {t("warehouse.purchaseInvoices.cancelInvoice")}
                </Button>
              ) : canRequest ? (
                <Button variant="outline" className="border-destructive/50 text-destructive hover:text-destructive"
                  onClick={() => openCancelFlow("request")}>
                  {t("warehouse.purchaseInvoices.requestCancel")}
                </Button>
              ) : null
            )}
            {invoice?.status === "CANCEL_REQUESTED" && canDecide && (
              <>
                <Button variant="outline" onClick={() => openCancelFlow("reject")}>
                  {t("warehouse.purchaseInvoices.rejectCancel")}
                </Button>
                <Button variant="destructive" onClick={() => openCancelFlow("cancel")}>
                  {t("warehouse.purchaseInvoices.approveCancel")}
                </Button>
              </>
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
              <Field label={t("warehouse.shared.currency")} required>
                <OptionSelect
                  value={approveCurrencyId}
                  onChange={setApproveCurrencyId}
                  placeholder={t("warehouse.shared.selectCurrency")}
                  options={currencies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                />
                <p className="text-xs text-muted-foreground">{t("warehouse.purchaseInvoices.exchangeRateHint")}</p>
              </Field>
              {needsRate && (
                <Field label={t("warehouse.purchaseInvoices.manualRate")}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    dir="ltr"
                    className="h-9"
                    value={manualRate}
                    onChange={(e) => setManualRate(e.target.value)}
                    placeholder={latestGeneralRate != null ? String(Number(latestGeneralRate)) : undefined}
                  />
                  <p className={`text-xs ${rateValid ? "text-muted-foreground" : "text-destructive"}`}>
                    {t("warehouse.purchaseInvoices.manualRateHint")}
                  </p>
                  {manualRate.trim() === "" && (
                    <p className="text-xs text-muted-foreground">
                      {latestGeneralRate != null
                        ? t("warehouse.purchaseInvoices.latestRate", { rate: fmt.qty(latestGeneralRate) })
                        : t("warehouse.purchaseInvoices.noLatestRate")}
                    </p>
                  )}
                </Field>
              )}
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
                      {fmt.money(Number(l.qty) * (Number(pricing[l.itemId]) || 0), approveCurrencyCode)}
                    </span>
                  </div>
                ))}
              </div>
              <Field label={t("warehouse.shared.discount")}>
                <DiscountFields
                  type={discountType}
                  value={discountValue}
                  onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }}
                />
                <p className="text-xs text-muted-foreground">{t("warehouse.purchaseInvoices.noDiscountHint")}</p>
              </Field>
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t("warehouse.shared.total")}</span>
                <span className="font-semibold tabular-nums">
                  {fmt.money(pricedTotal, approveCurrencyCode)}
                </span>
              </div>
              {showUsdPreview && (
                <div className="flex items-center justify-between px-3 text-sm">
                  <span className="text-muted-foreground">{t("warehouse.purchaseInvoices.totalUSD")}</span>
                  <span className="tabular-nums">≈ {fmt.money(pricedTotal / effectiveRate, "USD")}</span>
                </div>
              )}
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

      <ReasonDialog
        open={!!cancelFlow}
        onOpenChange={(o) => { if (!o && !cancelPending) setCancelFlow(null); }}
        title={t(
          cancelFlow === "request" ? "warehouse.purchaseInvoices.requestCancelTitle"
            : cancelFlow === "reject" ? "warehouse.purchaseInvoices.rejectCancelTitle"
              : "warehouse.purchaseInvoices.cancelTitle",
        )}
        hint={t(
          cancelFlow === "request" ? "warehouse.purchaseInvoices.requestCancelHint"
            : cancelFlow === "reject" ? "warehouse.purchaseInvoices.rejectCancelHint"
              : "warehouse.purchaseInvoices.cancelHint",
        )}
        // Only an actual cancel of a posted invoice touches stock. postedAt
        // survives a pending request, so it tells what the invoice was.
        warning={cancelFlow === "cancel" && invoice?.postedAt ? t("warehouse.purchaseInvoices.postedCancelWarning") : undefined}
        error={cancelError}
        confirmText={t(
          cancelFlow === "request" ? "warehouse.purchaseInvoices.requestCancel"
            : cancelFlow === "reject" ? "warehouse.purchaseInvoices.rejectCancel"
              : invoice?.status === "CANCEL_REQUESTED" ? "warehouse.purchaseInvoices.approveCancel"
                : "warehouse.purchaseInvoices.cancelInvoice",
        )}
        isPending={cancelPending}
        onConfirm={runCancelFlow}
      />
    </>
  );
}
