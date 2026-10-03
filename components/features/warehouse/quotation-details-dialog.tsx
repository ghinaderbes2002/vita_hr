"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import {
  useAcceptQuotation, useAdjustQuotationPrices, useApproveQuotation, useCreateSalesInvoice,
  useNewQuotationVersion, useQuotation, useRejectQuotation, useSendQuotation,
} from "@/lib/hooks/use-warehouse-operations";
import { DiscountType, Quotation } from "@/lib/api/warehouse-operations";
import { PatientName } from "./patient-combobox";
import { applyDiscount, discountDto, DiscountFields, PricedLinesTable } from "./pricing";
import {
  lineAmount, QuotationFormDialog, QuotationLineDraft, quotationLinesFrom,
} from "./quotation-form-dialog";
import {
  DetailItem, DialogLoading, Field, ReasonDialog, refNo, StatusBadge,
  useWarehouseFormat, useWarehouseLookups,
} from "./shared";

interface DetailsProps {
  id: string | null;
  onClose: () => void;
  /** A new version is a different quotation — lets the list follow it. */
  onNavigate: (id: string) => void;
}

type Confirm = "approve" | "send" | "newVersion";

export function QuotationDetailsDialog({ id, onClose, onNavigate }: DetailsProps) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { itemSku } = useWarehouseLookups();
  const { data: currencies = [] } = useWarehouseCurrencies();
  const { data: quotation, isLoading } = useQuotation(id ?? "");

  const approve = useApproveQuotation();
  const send = useSendQuotation();
  const accept = useAcceptQuotation();
  const reject = useRejectQuotation();
  const newVersion = useNewQuotationVersion();

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [acceptedByName, setAcceptedByName] = useState("");

  const status = quotation?.status;
  const currencyCode = quotation
    ? quotation.currency?.code ?? currencies.find((c) => c.id === quotation.currencyId)?.code
    : undefined;

  const runConfirm = async () => {
    if (!quotation || !confirm) return;
    const action = confirm;
    setConfirm(null);
    try {
      if (action === "approve") await approve.mutateAsync(quotation.id);
      else if (action === "send") await send.mutateAsync(quotation.id);
      else {
        const created = await newVersion.mutateAsync(quotation.id);
        if (created?.id) onNavigate(created.id);
      }
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
      <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[820px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {t("warehouse.quotations.detailsTitle")}
              {quotation && <span className="font-mono text-sm text-muted-foreground">#{refNo(quotation)}</span>}
              {quotation?.version != null && (
                <span className="text-sm font-normal text-muted-foreground">
                  {t("warehouse.quotations.versionN", { version: quotation.version })}
                </span>
              )}
              {quotation && <StatusBadge status={quotation.status} />}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !quotation ? (
            <DialogLoading />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailItem label={t("warehouse.shared.patient")}>
                  <PatientName patientId={quotation.patientId} />
                </DetailItem>
                <DetailItem label={t("warehouse.shared.date")}>{fmt.date(quotation.createdAt)}</DetailItem>
                <DetailItem label={t("warehouse.quotations.validUntil")}>{fmt.date(quotation.validUntil)}</DetailItem>
                <DetailItem label={t("warehouse.shared.currency")}>{currencyCode ?? "—"}</DetailItem>
                {quotation.paymentTerms && (
                  <DetailItem label={t("warehouse.quotations.paymentTerms")}>{quotation.paymentTerms}</DetailItem>
                )}
                {quotation.acceptedByName && (
                  <DetailItem label={t("warehouse.quotations.acceptedByName")}>{quotation.acceptedByName}</DetailItem>
                )}
                {quotation.notes && <DetailItem label={t("warehouse.shared.notes")}>{quotation.notes}</DetailItem>}
                {quotation.rejectionReason && (
                  <DetailItem label={t("warehouse.shared.reason")}>{quotation.rejectionReason}</DetailItem>
                )}
              </div>

              <PricedLinesTable
                lines={quotation.items.map((l, i) => ({
                  key: l.id ?? `line-${i}`,
                  name: l.description,
                  sub: [
                    l.lineType ? t(`warehouse.quotations.lineTypes.${l.lineType}`) : "",
                    l.itemId ? itemSku(l.itemId, l.item) : "",
                  ].filter(Boolean).join(" · "),
                  qty: Number(l.qty),
                  unitPrice: l.unitPrice,
                  discountType: l.discountType,
                  discountValue: l.discountValue,
                  lineTotal: l.lineTotal,
                }))}
                currencyCode={currencyCode}
                subtotal={quotation.subtotal}
                discountType={quotation.discountType}
                discountValue={quotation.discountValue}
                total={quotation.total}
              />
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={onClose}>{t("warehouse.shared.close")}</Button>

            {/* An approved quotation is never edited in place — a new version
                supersedes it and starts again as a draft. */}
            {status && status !== "DRAFT" && status !== "SUPERSEDED" && status !== "CANCELLED" && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_QUOTATIONS.CREATE}>
                <Button variant="outline" onClick={() => setConfirm("newVersion")} disabled={newVersion.isPending}>
                  {t("warehouse.quotations.newVersion")}
                </Button>
              </ActionGuard>
            )}

            {status === "DRAFT" && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_QUOTATIONS.CREATE}>
                <Button variant="outline" onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>
              </ActionGuard>
            )}

            {/* Only before the quotation goes out, and only with visible prices. */}
            {(status === "DRAFT" || status === "APPROVED") && quotation?.total !== undefined && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_QUOTATIONS.EDIT_PRICES}>
                <Button variant="outline" onClick={() => setPricesOpen(true)}>
                  {t("warehouse.quotations.adjustPrices")}
                </Button>
              </ActionGuard>
            )}

            <ActionGuard permission={PERMISSIONS.WAREHOUSE_QUOTATIONS.APPROVE}>
              {(status === "DRAFT" || status === "APPROVED" || status === "SENT") && (
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  {t("warehouse.shared.reject")}
                </Button>
              )}
              {status === "DRAFT" && (
                <Button onClick={() => setConfirm("approve")} disabled={approve.isPending}>
                  {t("warehouse.shared.approve")}
                </Button>
              )}
              {status === "APPROVED" && (
                <Button onClick={() => setConfirm("send")} disabled={send.isPending}>
                  {t("warehouse.quotations.send")}
                </Button>
              )}
              {status === "SENT" && (
                <Button onClick={() => { setAcceptedByName(""); setAcceptOpen(true); }}>
                  {t("warehouse.quotations.accept")}
                </Button>
              )}
            </ActionGuard>

            {status === "ACCEPTED" && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_SALES_INVOICES.CREATE}>
                <Button onClick={() => setInvoiceOpen(true)}>{t("warehouse.quotations.generateInvoice")}</Button>
              </ActionGuard>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? t(`warehouse.quotations.confirm.${confirm}.title`) : ""}
        description={confirm ? t(`warehouse.quotations.confirm.${confirm}.description`) : undefined}
        onConfirm={runConfirm}
      />

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("warehouse.quotations.rejectTitle")}
        isPending={reject.isPending}
        onConfirm={async (reason) => {
          if (!quotation) return;
          try {
            await reject.mutateAsync({ id: quotation.id, reason: reason || undefined });
            setRejectOpen(false);
          } catch {
            // Error handled by mutation
          }
        }}
      />

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("warehouse.quotations.acceptTitle")}</DialogTitle>
          </DialogHeader>
          <Field label={`${t("warehouse.quotations.acceptedByName")} (${t("common.optional")})`}>
            <Input value={acceptedByName} onChange={(e) => setAcceptedByName(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={accept.isPending}
              onClick={async () => {
                if (!quotation) return;
                try {
                  await accept.mutateAsync({ id: quotation.id, acceptedByName: acceptedByName.trim() || undefined });
                  setAcceptOpen(false);
                } catch {
                  // Error handled by mutation
                }
              }}
            >
              {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("warehouse.quotations.accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quotation && (
        <>
          <QuotationFormDialog open={editOpen} onOpenChange={setEditOpen} quotation={quotation} />
          <AdjustPricesDialog open={pricesOpen} onOpenChange={setPricesOpen} quotation={quotation} currencyCode={currencyCode} />
          <GenerateInvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} quotation={quotation} />
        </>
      )}
    </>
  );
}

interface SubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation;
}

// Prices and discounts only — quantities and lines stay as they are. This is
// the one edit allowed on an APPROVED quotation without opening a new version.
function AdjustPricesDialog({
  open, onOpenChange, quotation, currencyCode,
}: SubDialogProps & { currencyCode?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90dvh] overflow-y-auto">
        <AdjustPricesForm quotation={quotation} currencyCode={currencyCode} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface SubFormProps {
  quotation: Quotation;
  onDone: () => void;
}

function AdjustPricesForm({ quotation, currencyCode, onDone }: SubFormProps & { currencyCode?: string }) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const adjust = useAdjustQuotationPrices();

  const [lines, setLines] = useState<QuotationLineDraft[]>(() => quotationLinesFrom(quotation));
  const [discountType, setDiscountType] = useState<DiscountType | "">(quotation.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(
    quotation.discountValue != null ? String(Number(quotation.discountValue)) : "",
  );

  const updateLine = (key: string, patch: Partial<QuotationLineDraft>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const canSubmit = lines.every((l) => lineAmount(l) !== undefined);
  const total = applyDiscount(lines.reduce((sum, l) => sum + (lineAmount(l) ?? 0), 0), discountType, discountValue);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await adjust.mutateAsync({
        id: quotation.id,
        dto: {
          ...discountDto(discountType, discountValue),
          // Keyed by the quotation line's own id.
          items: lines.filter((l) => l.id).map((l) => ({
            quotationItemId: l.id!,
            unitPrice: Number(l.unitPrice),
            ...discountDto(l.discountType, l.discountValue),
          })),
        },
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.quotations.adjustPricesTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{line.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("warehouse.shared.quantity")}: {fmt.qty(line.qty)}
                  </p>
                </div>
                <Input
                  type="number" min={0} step="any" className="w-28"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                  aria-label={t("warehouse.shared.unitPrice")}
                />
                <div className="w-64 max-w-full">
                  <DiscountFields
                    type={line.discountType}
                    value={line.discountValue}
                    onChange={(type, value) => updateLine(line.key, { discountType: type, discountValue: value })}
                  />
                </div>
              </div>
            ))}
          </div>
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

// Sales invoices are never typed in by hand: one is generated from an
// ACCEPTED quotation, and the backend refuses a second one for the same
// quotation (ALREADY_INVOICED).
function GenerateInvoiceDialog({ open, onOpenChange, quotation }: SubDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <GenerateInvoiceForm quotation={quotation} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function GenerateInvoiceForm({ quotation, onDone }: SubFormProps) {
  const t = useTranslations();
  const createInvoice = useCreateSalesInvoice();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(quotation.paymentTerms ?? "");

  const handleSubmit = async () => {
    try {
      await createInvoice.mutateAsync({
        quotationId: quotation.id,
        ...(paymentMethod.trim() ? { paymentMethod: paymentMethod.trim() } : {}),
        ...(paymentTerms.trim() ? { paymentTerms: paymentTerms.trim() } : {}),
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.quotations.generateInvoiceTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("warehouse.quotations.generateInvoiceHint")}</p>
          <Field label={t("warehouse.salesInvoices.paymentMethod")}>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </Field>
          <Field label={t("warehouse.quotations.paymentTerms")}>
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={createInvoice.isPending}>
            {createInvoice.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("warehouse.quotations.generateInvoice")}
          </Button>
        </DialogFooter>
    </>
  );
}
