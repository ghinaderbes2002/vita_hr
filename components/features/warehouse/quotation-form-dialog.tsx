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
import { useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import { useCreateQuotation, useUpdateQuotation } from "@/lib/hooks/use-warehouse-operations";
import {
  DiscountType, Quotation, QUOTATION_LINE_TYPES, QuotationItemInput, QuotationLineType,
} from "@/lib/api/warehouse-operations";
import { ItemCombobox } from "./line-items-editor";
import { PatientCombobox } from "./patient-combobox";
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
  discountType: DiscountType | "";
  discountValue: string;
}

let seq = 0;
export const newQuotationLine = (init?: Partial<QuotationLineDraft>): QuotationLineDraft => ({
  key: `q-${++seq}`,
  lineType: "ITEM",
  itemId: "",
  description: "",
  qty: "1",
  unitPrice: "",
  discountType: "",
  discountValue: "",
  ...init,
});

export const quotationLinesFrom = (quotation: Quotation): QuotationLineDraft[] =>
  quotation.items.map((l) => newQuotationLine({
    id: l.id,
    lineType: l.lineType ?? "ITEM",
    itemId: l.itemId ?? "",
    description: l.description ?? "",
    // Decimal strings ("2.000") are normalised before they reach an input.
    qty: String(Number(l.qty)),
    unitPrice: l.unitPrice != null ? String(Number(l.unitPrice)) : "",
    discountType: l.discountType ?? "",
    discountValue: l.discountValue != null ? String(Number(l.discountValue)) : "",
  }));

/** A line's total after its own discount, or undefined while it is incomplete. */
export function lineAmount(l: QuotationLineDraft): number | undefined {
  const qty = toQty(l.qty);
  if (qty === undefined || l.unitPrice.trim() === "" || Number(l.unitPrice) < 0) return undefined;
  return applyDiscount(qty * Number(l.unitPrice), l.discountType, l.discountValue);
}

const isComplete = (l: QuotationLineDraft) =>
  lineAmount(l) !== undefined && l.description.trim() !== "" && (l.lineType !== "ITEM" || !!l.itemId);

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

  const [patientId, setPatientId] = useState(quotation?.patientId ?? "");
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

  const canSubmit = !!patientId && !!currencyId && lines.length > 0 && lines.every(isComplete);
  const subtotal = lines.reduce((sum, l) => sum + (lineAmount(l) ?? 0), 0);
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
        unitPrice: Number(l.unitPrice),
        ...discountDto(l.discountType, l.discountValue),
      })),
    };
    try {
      if (isEdit) {
        // The patient and the currency are fixed once the quotation exists.
        await update.mutateAsync({ id: quotation.id, dto: details });
      } else {
        await create.mutateAsync({ patientId, currencyId, ...details });
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
            <Field label={t("warehouse.shared.patient")} required>
              <PatientCombobox value={patientId} onChange={setPatientId} disabled={isEdit} />
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
                      placeholder={t("warehouse.shared.unitPrice")}
                      aria-label={t("warehouse.shared.unitPrice")}
                    />
                    <div className="w-64 max-w-full">
                      <DiscountFields
                        type={line.discountType}
                        value={line.discountValue}
                        onChange={(type, value) => updateLine(line.key, { discountType: type, discountValue: value })}
                      />
                    </div>
                    <span className="ms-auto text-sm font-medium">{fmt.money(lineAmount(line), currencyCode)}</span>
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
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
    </>
  );
}
