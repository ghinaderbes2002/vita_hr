"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCreateTransfer, useReceiveTransfer, useTransfer } from "@/lib/hooks/use-warehouse-operations";
import { filledLines, LineDraft, LineItemsEditor, newLine } from "./line-items-editor";
import {
  DetailItem, DialogLoading, Field, FrozenWarehouseNotice, OptionSelect, refNo,
  StatusBadge, toQty, useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "./shared";

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form state lives in a body rendered inside <DialogContent>, which Radix
// unmounts on close — so each open starts clean with no manual reset.
export function TransferCreateDialog({ open, onOpenChange }: CreateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90dvh] overflow-y-auto">
        <TransferCreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TransferCreateForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const { warehouses, items } = useWarehouseLookups();
  const create = useCreateTransfer();

  const [fromWarehouseId, setFrom] = useState("");
  const [toWarehouseId, setTo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);

  const valid = filledLines(lines);
  const sameWarehouse = !!fromWarehouseId && fromWarehouseId === toWarehouseId;
  const canSubmit = !!fromWarehouseId && !!toWarehouseId && !sameWarehouse && valid.length > 0;
  const options = warehouseOptions(warehouses, true);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        fromWarehouseId,
        toWarehouseId,
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
          <DialogTitle>{t("warehouse.transfers.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FrozenWarehouseNotice warehouseIds={[fromWarehouseId, toWarehouseId]} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("warehouse.transfers.fromWarehouse")} required>
              <OptionSelect
                value={fromWarehouseId}
                onChange={setFrom}
                placeholder={t("warehouse.shared.selectWarehouse")}
                options={options}
              />
            </Field>
            <Field label={t("warehouse.transfers.toWarehouse")} required>
              <OptionSelect
                value={toWarehouseId}
                onChange={setTo}
                placeholder={t("warehouse.shared.selectWarehouse")}
                options={options}
              />
            </Field>
          </div>
          {sameWarehouse && (
            <p className="text-sm text-destructive">{t("warehouse.transfers.sameWarehouseError")}</p>
          )}
          <Field label={t("warehouse.shared.items")} required>
            <LineItemsEditor lines={lines} onChange={setLines} items={items} />
          </Field>
          <Field label={t("warehouse.shared.notes")}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">{t("warehouse.transfers.autoCompleteHint")}</p>
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

export function TransferDetailsDialog({ id, onClose }: DetailsProps) {
  // Keyed by id: opening another transfer never inherits the receive mode.
  return <TransferDetails key={id ?? "closed"} id={id} onClose={onClose} />;
}

function TransferDetails({ id, onClose }: DetailsProps) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouseName, itemName, itemSku } = useWarehouseLookups();
  const { data: transfer, isLoading } = useTransfer(id ?? "");
  const receive = useReceiveTransfer();

  const [receiving, setReceiving] = useState(false);
  const [qtys, setQtys] = useState<Record<string, string>>({});

  const startReceive = () => {
    if (!transfer) return;
    setQtys(Object.fromEntries(transfer.items.map((l) => [l.itemId, String(Number(l.sentQty ?? l.requestedQty))])));
    setReceiving(true);
  };

  const handleReceive = async () => {
    if (!transfer) return;
    try {
      await receive.mutateAsync({
        id: transfer.id,
        items: transfer.items.map((l) => ({
          itemId: l.itemId,
          // A cleared field means nothing of that line arrived.
          receivedQty: Math.max(0, Number(qtys[l.itemId]) || 0),
        })),
      });
      setReceiving(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {t("warehouse.transfers.detailsTitle")}
            {transfer && <span className="font-mono text-sm text-muted-foreground">#{refNo(transfer)}</span>}
            {transfer && <StatusBadge status={transfer.status} />}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !transfer ? (
          <DialogLoading />
        ) : (
          <div className="space-y-4">
            {receiving && <FrozenWarehouseNotice warehouseIds={[transfer.toWarehouseId]} />}

            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <DetailItem label={t("warehouse.transfers.fromWarehouse")}>
                {warehouseName(transfer.fromWarehouseId, transfer.fromWarehouse)}
              </DetailItem>
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <DetailItem label={t("warehouse.transfers.toWarehouse")}>
                {warehouseName(transfer.toWarehouseId, transfer.toWarehouse)}
              </DetailItem>
              <div className="ms-auto">
                <DetailItem label={t("warehouse.shared.date")}>{fmt.dateTime(transfer.createdAt)}</DetailItem>
              </div>
            </div>

            {transfer.notes && <DetailItem label={t("warehouse.shared.notes")}>{transfer.notes}</DetailItem>}

            {receiving && (
              <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                {t("warehouse.transfers.receiveHint")}
              </p>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.shared.item")}</TableHead>
                    <TableHead>{t("warehouse.transfers.sentQty")}</TableHead>
                    <TableHead>{t("warehouse.transfers.receivedQty")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfer.items.map((l) => (
                    <TableRow key={l.id ?? l.itemId}>
                      <TableCell className="font-medium">
                        {itemName(l.itemId, l.item)}
                        <p className="font-mono text-xs text-muted-foreground">{itemSku(l.itemId, l.item)}</p>
                      </TableCell>
                      <TableCell>{fmt.qty(l.sentQty ?? l.requestedQty)}</TableCell>
                      <TableCell>
                        {receiving ? (
                          <Input
                            type="number" min={0} step="any" className="h-8 w-24"
                            value={qtys[l.itemId] ?? ""}
                            onChange={(e) => setQtys((s) => ({ ...s, [l.itemId]: e.target.value }))}
                          />
                        ) : (
                          fmt.qty(l.receivedQty)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {receiving ? (
            <>
              <Button variant="outline" onClick={() => setReceiving(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleReceive} disabled={receive.isPending}>
                {receive.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("warehouse.transfers.receive")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>{t("warehouse.shared.close")}</Button>
              {/* Only a transfer still on its way can be received. */}
              {transfer?.status === "IN_TRANSIT" && (
                <ActionGuard permission={PERMISSIONS.WAREHOUSE_TRANSFERS.RECEIVE}>
                  <Button onClick={startReceive}>{t("warehouse.transfers.receive")}</Button>
                </ActionGuard>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
