"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import {
  useApproveSalesInvoice, useCancelSalesInvoice, useSalesInvoice,
} from "@/lib/hooks/use-warehouse-operations";
import { PatientName } from "./patient-combobox";
import { PricedLinesTable } from "./pricing";
import {
  DetailItem, DialogLoading, refNo, StatusBadge, useWarehouseFormat, useWarehouseLookups,
} from "./shared";

interface DetailsProps {
  id: string | null;
  onClose: () => void;
}

export function SalesInvoiceDetailsDialog({ id, onClose }: DetailsProps) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { itemSku } = useWarehouseLookups();
  const { data: currencies = [] } = useWarehouseCurrencies();
  const { data: invoice, isLoading } = useSalesInvoice(id ?? "");

  const approve = useApproveSalesInvoice();
  const cancel = useCancelSalesInvoice();
  const [confirm, setConfirm] = useState<"approve" | "cancel" | null>(null);

  const currencyCode = invoice
    ? invoice.currency?.code ?? currencies.find((c) => c.id === invoice.currencyId)?.code
    : undefined;

  return (
    <>
      <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[780px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {t("warehouse.salesInvoices.detailsTitle")}
              {invoice && <span className="font-mono text-sm text-muted-foreground">#{refNo(invoice)}</span>}
              {invoice && <StatusBadge status={invoice.status} />}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !invoice ? (
            <DialogLoading />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailItem label={t("warehouse.shared.patient")}>
                  <PatientName patientId={invoice.patientId} />
                </DetailItem>
                <DetailItem label={t("warehouse.shared.date")}>{fmt.date(invoice.createdAt)}</DetailItem>
                <DetailItem label={t("warehouse.shared.currency")}>{currencyCode ?? "—"}</DetailItem>
                {invoice.exchangeRate !== undefined && (
                  <DetailItem label={t("warehouse.shared.exchangeRate")}>{fmt.qty(invoice.exchangeRate)}</DetailItem>
                )}
                {invoice.quotation?.documentNo && (
                  <DetailItem label={t("warehouse.salesInvoices.quotation")}>
                    <span className="font-mono">{invoice.quotation.documentNo}</span>
                  </DetailItem>
                )}
                <DetailItem label={t("warehouse.salesInvoices.paymentMethod")}>{invoice.paymentMethod || "—"}</DetailItem>
                <DetailItem label={t("warehouse.quotations.paymentTerms")}>{invoice.paymentTerms || "—"}</DetailItem>
              </div>

              {/* A frozen copy of the quotation at generation time. */}
              <PricedLinesTable
                lines={(invoice.items ?? []).map((l, i) => ({
                  key: l.id ?? `line-${i}`,
                  name: l.description,
                  sub: l.itemId ? itemSku(l.itemId, l.item) : undefined,
                  qty: Number(l.qty),
                  unitPrice: l.unitPrice,
                  discountType: l.discountType,
                  discountValue: l.discountValue,
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
            {invoice && invoice.status !== "CANCELLED" && (
              <ActionGuard permission={PERMISSIONS.WAREHOUSE_SALES_INVOICES.APPROVE}>
                <Button variant="destructive" onClick={() => setConfirm("cancel")}>
                  {t("warehouse.salesInvoices.cancel")}
                </Button>
                {invoice.status === "DRAFT" && (
                  <Button onClick={() => setConfirm("approve")}>{t("warehouse.shared.approve")}</Button>
                )}
              </ActionGuard>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t(`warehouse.salesInvoices.${confirm === "cancel" ? "cancelConfirmTitle" : "approveConfirmTitle"}`)}
        description={confirm === "cancel" ? t("messages.actionCantUndo") : undefined}
        variant={confirm === "cancel" ? "destructive" : "default"}
        onConfirm={() => {
          if (invoice) (confirm === "cancel" ? cancel : approve).mutate(invoice.id);
          setConfirm(null);
        }}
      />
    </>
  );
}
