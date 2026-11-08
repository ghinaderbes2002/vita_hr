"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import { useCreateQuotation, useUpdateQuotation } from "@/lib/hooks/use-warehouse-operations";
import {
  DiscountType, Quotation, QUOTATION_LINE_TYPES, QuotationItemInput, QuotationLineType,
} from "@/lib/api/warehouse-operations";
import { ItemCombobox } from "./line-items-editor";
import { ClientKind, ClientPicker } from "./patient-combobox";
import { applyDiscount, discountDto, DiscountFields } from "./pricing";
import { Field, OptionSelect, toQty, useWarehouseFormat, useWarehouseLookups } from "./shared";
import { localizedName } from "./utils";

export interface QuotationLineDraft {
  key: string;
  // Present when editing an existing line (used by adjust-prices).
  id?: string;
  lineType: QuotationLineType;
  itemId: string;
  description: string;
  qty: string;
  unitPrice: string;
}

let seq = 0;
export const newQuotationLine = (init?: Partial<QuotationLineDraft>): QuotationLineDraft => ({
  key: `q-${++seq}`,
  lineType: "ITEM",
  itemId: "",
  description: "",
  qty: "1",
  unitPrice: "",
  ...init,
});

// Lines carry no discount any more — only the quotation total does — so an
// older line's own discount is not brought into the form.
export const quotationLinesFrom = (quotation: Quotation): QuotationLineDraft[] =>
  quotation.items.map((l) => newQuotationLine({
    id: l.id,
    lineType: l.lineType ?? "ITEM",
    itemId: l.itemId ?? "",
    description: l.description ?? "",
    // Decimal strings ("2.000") are normalised before they reach an input.
    qty: String(Number(l.qty)),
    unitPrice: l.unitPrice != null ? String(Number(l.unitPrice)) : "",
  }));

/** A line's total, or undefined while it can't be worked out (no price yet). */
export function lineAmount(l: QuotationLineDraft): number | undefined {
  const qty = toQty(l.qty);
  if (qty === undefined) return undefined;
  if (l.unitPrice.trim() === "" || Number(l.unitPrice) < 0) return undefined;
  return qty * Number(l.unitPrice);
}

/**
 * Which ITEM lines are prosthetics parts (items with a partCode). The server
 * prices a part itself from part pricing settings — basis + fixed amount +
 * profit — so its price may be left blank. Only a part never bought has no
 * basis; that one needs a typed price, and the server says so if it is missing.
 */
export function usePartLines() {
  const { items } = useWarehouseLookups();
  const isPart = (l: Pick<QuotationLineDraft, "lineType" | "itemId">) =>
    l.lineType === "ITEM" && !!l.itemId && !!items.find((i) => i.id === l.itemId)?.partCode;
  return { isPart };
}

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set to edit an existing DRAFT; omitted to create. */
  quotation?: Quotation;
}

// Form state lives in a body rendered inside <DialogContent>, which Radix
// unmounts on close — so each open starts from the quotation as it is now
// (or from a blank form) with no manual reset.
export function QuotationFormDialog({ open, onOpenChange, quotation }: QuotationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90dvh] overflow-y-auto">
        <QuotationForm quotation={quotation} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function QuotationForm({ quotation, onDone }: { quotation?: Quotation; onDone: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const fmt = useWarehouseFormat();
  const { items } = useWarehouseLookups();
  const { data: currencies = [] } = useWarehouseCurrencies();
  const create = useCreateQuotation();
  const update = useUpdateQuotation();
  const isEdit = !!quotation;

  // A quotation is for a patient or a sales customer — exactly one.
  const [clientKind, setClientKind] = useState<ClientKind>(quotation?.customerId ? "customer" : "patient");
  const [clientId, setClientId] = useState(quotation?.customerId ?? quotation?.patientId ?? "");
  const [currencyId, setCurrencyId] = useState(quotation?.currencyId ?? "");
  const [validUntil, setValidUntil] = useState(quotation?.validUntil?.slice(0, 10) ?? "");
  const [paymentTerms, setPaymentTerms] = useState(quotation?.paymentTerms ?? "");
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [discountType, setDiscountType] = useState<DiscountType | "">(quotation?.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(
    quotation?.discountValue != null ? String(Number(quotation.discountValue)) : "",
  );
  const [lines, setLines] = useState<QuotationLineDraft[]>(() =>
    quotation && quotation.items.length > 0 ? quotationLinesFrom(quotation) : [newQuotationLine()],
  );

  const updateLine = (key: string, patch: Partial<QuotationLineDraft>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const { isPart } = usePartLines();
  const priceGiven = (l: QuotationLineDraft) => l.unitPrice.trim() !== "" && Number(l.unitPrice) >= 0;
  const isComplete = (l: QuotationLineDraft) =>
    toQty(l.qty) !== undefined && l.description.trim() !== "" && (l.lineType !== "ITEM" || !!l.itemId) &&
    (priceGiven(l) || isPart(l));

  const canSubmit = !!clientId && !!currencyId && lines.length > 0 && lines.every(isComplete);
  const amounts = lines.map((l) => lineAmount(l));
  // A blank price the server will fill in leaves the total unknown until saved.
  const totalKnown = amounts.every((a) => a !== undefined);
  const subtotal = amounts.reduce<number>((sum, a) => sum + (a ?? 0), 0);
  const total = applyDiscount(subtotal, discountType, discountValue);
  const currencyCode = currencies.find((c) => c.id === currencyId)?.code;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const details = {
      ...(validUntil ? { validUntil } : {}),
      ...(paymentTerms.trim() ? { paymentTerms: paymentTerms.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...discountDto(discountType, discountValue),
      items: lines.map((l): QuotationItemInput => ({
        lineType: l.lineType,
        ...(l.lineType === "ITEM" ? { itemId: l.itemId } : {}),
        description: l.description.trim(),
        qty: toQty(l.qty)!,
        // A typed price is always sent: the server ignores it for a part it can
        // price and uses it for one never bought. A blank part price is left to it.
        ...(priceGiven(l) ? { unitPrice: Number(l.unitPrice) } : {}),
      })),
    };
    try {
      if (isEdit) {
        // The currency is fixed once the quotation exists. The owner may change:
        // sending one id switches to it (the server clears the other); an
        // unchanged owner is left out, which keeps it as it was.
        const ownerWas = quotation.customerId ? `customer:${quotation.customerId}` : `patient:${quotation.patientId ?? ""}`;
        const ownerChanged = `${clientKind}:${clientId}` !== ownerWas;
        await update.mutateAsync({
          id: quotation.id,
          dto: {
            ...(ownerChanged ? (clientKind === "customer" ? { customerId: clientId } : { patientId: clientId }) : {}),
            ...details,
          },
        });
      } else {
        await create.mutateAsync({
          ...(clientKind === "customer" ? { customerId: clientId } : { patientId: clientId }),
          currencyId,
          ...details,
        });
      }
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("warehouse.quotations.edit") : t("warehouse.quotations.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("warehouse.shared.client")} required>
              <ClientPicker
                kind={clientKind}
                onKindChange={setClientKind}
                value={clientId}
                onChange={setClientId}
                selectedCustomerName={quotation?.customer?.name}
              />
            </Field>
            <Field
              label={t("warehouse.shared.currency")}
              required
              hint={isEdit ? t("warehouse.quotations.lockedHint") : undefined}
            >
              <OptionSelect
                value={currencyId}
                onChange={setCurrencyId}
                disabled={isEdit}
                placeholder={t("warehouse.shared.selectCurrency")}
                options={currencies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
              />
            </Field>
            <Field label={t("warehouse.quotations.validUntil")}>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Field label={t("warehouse.quotations.paymentTerms")}>
              <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </Field>
          </div>

          <Field label={t("warehouse.shared.items")} required>
            <p className="text-xs text-muted-foreground">{t("warehouse.quotations.priceOptionalHint")}</p>
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.key} className="space-y-2 rounded-lg border p-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <OptionSelect
                      value={line.lineType}
                      onChange={(v) => updateLine(line.key, { lineType: v as QuotationLineType, itemId: "" })}
                      options={QUOTATION_LINE_TYPES.map((lt) => ({ value: lt, label: t(`warehouse.quotations.lineTypes.${lt}`) }))}
                      className="w-32"
                    />
                    {line.lineType === "ITEM" && (
                      <div className="min-w-48 flex-1">
                        <ItemCombobox
                          items={items}
                          value={line.itemId}
                          onChange={(itemId) => {
                            const item = items.find((i) => i.id === itemId);
                            // The description is required; start it from the item's name.
                            updateLine(line.key, {
                              itemId,
                              description: line.description.trim() || (item ? localizedName(item, locale) : ""),
                            });
                          }}
                        />
                      </div>
                    )}
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      placeholder={t("warehouse.quotations.lineDescription")}
                      aria-label={t("warehouse.quotations.lineDescription")}
                      className="min-w-48 flex-1"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      aria-label={t("warehouse.shared.removeLine")}
                      disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number" min={0} step="any" className="w-24"
                      value={line.qty}
                      onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                      placeholder={t("warehouse.shared.quantity")}
                      aria-label={t("warehouse.shared.quantity")}
                    />
                    <Input
                      type="number" min={0} step="any" className="w-28"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                      // A part left blank is priced by the server from part pricing settings.
                      placeholder={isPart(line) ? t("warehouse.quotations.autoPrice") : t("warehouse.shared.unitPrice")}
                      aria-label={t("warehouse.shared.unitPrice")}
                      title={isPart(line) ? t("warehouse.quotations.autoPriceHint") : undefined}
                    />
                    {isPart(line) && (
                      <Badge variant="outline" className="text-[10px]" title={t("warehouse.quotations.autoPriceHint")}>
                        {t("warehouse.quotations.autoPrice")}
                      </Badge>
                    )}
                    <span className="ms-auto text-sm font-medium">
                      {lineAmount(line) !== undefined ? fmt.money(lineAmount(line), currencyCode) : isPart(line) ? t("warehouse.quotations.autoPrice") : "—"}
                    </span>
                  </div>
                </div>
              ))}
              <Button
                type="button" variant="outline" size="sm" className="gap-1.5"
                onClick={() => setLines((ls) => [...ls, newQuotationLine()])}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("warehouse.shared.addLine")}
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("warehouse.shared.discount")}>
              <DiscountFields
                type={discountType}
                value={discountValue}
                onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }}
              />
              <p className="text-xs text-muted-foreground">{t("warehouse.quotations.discountNeedsApproval")}</p>
            </Field>
            <div className="flex items-end justify-between rounded-lg border bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">{t("warehouse.shared.total")}</span>
              <span className="text-lg font-bold">
                {totalKnown ? fmt.money(total, currencyCode) : t("warehouse.quotations.totalPending")}
              </span>
            </div>
          </div>

          <Field label={t("warehouse.shared.notes")}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
    </>
  );
}
