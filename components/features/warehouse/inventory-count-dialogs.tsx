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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  useCancelInventoryCount, useCompleteInventoryCount, useInventoryCount,
  useRecordInventoryCount, useStartInventoryCount,
} from "@/lib/hooks/use-warehouse-operations";
import { Dec, InventoryCount } from "@/lib/api/warehouse-operations";
import { ItemCombobox } from "./line-items-editor";
import {
  DetailItem, DialogLoading, Field, OptionSelect, refNo, StatusBadge,
  useWarehouseFormat, useWarehouseLookups, warehouseOptions,
} from "./shared";

interface StartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form state lives in a body rendered inside <DialogContent>, which Radix
// unmounts on close — so each open starts clean with no manual reset.
export function InventoryCountStartDialog({ open, onOpenChange }: StartProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <InventoryCountStartForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InventoryCountStartForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const { warehouses } = useWarehouseLookups();
  const start = useStartInventoryCount();

  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!warehouseId) return;
    try {
      await start.mutateAsync({ warehouseId, ...(notes.trim() ? { notes: notes.trim() } : {}) });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.counts.startTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{t("warehouse.counts.freezeWarning")}</p>
          </div>
          <Field label={t("warehouse.shared.warehouse")} required>
            <OptionSelect
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={t("warehouse.shared.selectWarehouse")}
              options={warehouseOptions(warehouses, true)}
            />
          </Field>
          <Field label={t("warehouse.shared.notes")}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!warehouseId || start.isPending}>
            {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("warehouse.counts.start")}
          </Button>
        </DialogFooter>
    </>
  );
}

interface DetailsProps {
  id: string | null;
  onClose: () => void;
}

interface CountRow {
  itemId: string;
  systemQty?: Dec | null;
  recordedQty?: Dec | null;
  variance?: Dec | null;
}

export function InventoryCountDetailsDialog({ id, onClose }: DetailsProps) {
  const t = useTranslations();
  const { data: count } = useInventoryCount(id ?? "");

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[820px] max-h-[90dvh] overflow-y-auto">
        {count && count.id === id ? (
          // Keyed by the count: its inputs are seeded once from what was
          // already recorded, so a background refetch never overwrites typing.
          <InventoryCountBody key={count.id} count={count} onClose={onClose} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("warehouse.counts.detailsTitle")}</DialogTitle>
            </DialogHeader>
            <DialogLoading />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InventoryCountBody({ count, onClose }: { count: InventoryCount; onClose: () => void }) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { items, warehouseName, itemName, itemSku } = useWarehouseLookups();
  const { hasPermission, isAdmin } = usePermissions();

  const inProgress = count.status === "IN_PROGRESS";
  const canRecord = inProgress && (isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_COUNTS.CREATE));

  const record = useRecordInventoryCount();
  const complete = useCompleteInventoryCount();
  const cancel = useCancelInventoryCount();

  const [actuals, setActuals] = useState<Record<string, string>>(() => Object.fromEntries(
    (count.items ?? []).filter((l) => l.actualQty != null).map((l) => [l.itemId, String(Number(l.actualQty))]),
  ));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(
    (count.items ?? []).filter((l) => l.note).map((l) => [l.itemId, l.note!]),
  ));
  // Items found on the shelf that the warehouse has no balance row for.
  const [extraItemIds, setExtraItemIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"complete" | "cancel" | null>(null);

  // The session comes pre-filled: one line per item the warehouse held when
  // it started, with systemQty snapshotted then. Anything else found on the
  // shelf is added here and recorded against a system quantity of 0.
  const rows: CountRow[] = [];
  const seen = new Set<string>();
  const push = (row: CountRow) => { if (!seen.has(row.itemId)) { seen.add(row.itemId); rows.push(row); } };
  (count.items ?? []).forEach((l) =>
    push({ itemId: l.itemId, systemQty: l.systemQty, recordedQty: l.actualQty, variance: l.differenceQty }),
  );
  if (inProgress) extraItemIds.forEach((itemId) => push({ itemId, systemQty: 0 }));

  const itemOf = (itemId: string) => count.items?.find((l) => l.itemId === itemId)?.item;

  const varianceOf = (row: CountRow): number | undefined => {
    const typed = actuals[row.itemId];
    if (inProgress && typed !== undefined && typed.trim() !== "") {
      return Number(typed) - Number(row.systemQty ?? 0);
    }
    if (row.variance != null) return Number(row.variance);
    if (row.recordedQty != null && row.systemQty != null) return Number(row.recordedQty) - Number(row.systemQty);
    return undefined;
  };

  const handleRecord = async () => {
    // Zero is a real count (the shelf is empty); only blanks are skipped.
    const lines = rows
      .filter((r) => (actuals[r.itemId] ?? "").trim() !== "" && Number(actuals[r.itemId]) >= 0)
      .map((r) => ({
        itemId: r.itemId,
        actualQty: Number(actuals[r.itemId]),
        ...(notes[r.itemId]?.trim() ? { note: notes[r.itemId].trim() } : {}),
      }));
    if (lines.length === 0) return;
    try {
      await record.mutateAsync({ id: count.id, items: lines });
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {t("warehouse.counts.detailsTitle")}
              <span className="font-mono text-sm text-muted-foreground">#{refNo(count)}</span>
              <StatusBadge status={count.status} />
            </DialogTitle>
          </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailItem label={t("warehouse.shared.warehouse")}>
                  {warehouseName(count.warehouseId, count.warehouse)}
                </DetailItem>
                <DetailItem label={t("warehouse.shared.date")}>{fmt.dateTime(count.createdAt)}</DetailItem>
                {count.completedAt && (
                  <DetailItem label={t("warehouse.counts.completedAt")}>{fmt.dateTime(count.completedAt)}</DetailItem>
                )}
                {count.notes && <DetailItem label={t("warehouse.shared.notes")}>{count.notes}</DetailItem>}
              </div>

              {inProgress && (
                <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {t("warehouse.counts.recordHint")}
                </p>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("warehouse.shared.item")}</TableHead>
                      <TableHead>{t("warehouse.counts.systemQty")}</TableHead>
                      <TableHead>{t("warehouse.counts.actualQty")}</TableHead>
                      <TableHead>{t("warehouse.counts.variance")}</TableHead>
                      {canRecord && <TableHead>{t("warehouse.shared.notes")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canRecord ? 5 : 4} className="h-20 text-center text-muted-foreground">
                          {t("warehouse.counts.noLines")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const variance = varianceOf(row);
                        return (
                          <TableRow key={row.itemId}>
                            <TableCell className="font-medium">
                              {itemName(row.itemId, itemOf(row.itemId))}
                              <p className="font-mono text-xs text-muted-foreground">{itemSku(row.itemId, itemOf(row.itemId))}</p>
                            </TableCell>
                            <TableCell>{fmt.qty(row.systemQty)}</TableCell>
                            <TableCell>
                              {canRecord ? (
                                <Input
                                  type="number" min={0} step="any" className="h-8 w-24"
                                  value={actuals[row.itemId] ?? ""}
                                  onChange={(e) => setActuals((s) => ({ ...s, [row.itemId]: e.target.value }))}
                                />
                              ) : (
                                fmt.qty(row.recordedQty)
                              )}
                            </TableCell>
                            <TableCell
                              dir="ltr"
                              className={`text-start font-mono font-bold ${
                                !variance ? "text-muted-foreground" : variance > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {variance === undefined ? "—" : `${variance > 0 ? "+" : ""}${fmt.qty(variance)}`}
                            </TableCell>
                            {canRecord && (
                              <TableCell>
                                <Input
                                  className="h-8 min-w-28"
                                  value={notes[row.itemId] ?? ""}
                                  onChange={(e) => setNotes((s) => ({ ...s, [row.itemId]: e.target.value }))}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {canRecord && (
                <Field label={t("warehouse.counts.addItem")}>
                  <ItemCombobox
                    items={items.filter((i) => !seen.has(i.id))}
                    value=""
                    onChange={(itemId) => setExtraItemIds((s) => [...s, itemId])}
                  />
                </Field>
              )}
            </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t("warehouse.shared.close")}</Button>
            {inProgress && (
              <>
                <ActionGuard permission={PERMISSIONS.WAREHOUSE_COUNTS.APPROVE}>
                  <Button variant="destructive" onClick={() => setConfirm("cancel")}>
                    {t("warehouse.counts.cancel")}
                  </Button>
                </ActionGuard>
                {canRecord && (
                  <Button variant="secondary" onClick={handleRecord} disabled={record.isPending}>
                    {record.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("warehouse.counts.saveCount")}
                  </Button>
                )}
                <ActionGuard permission={PERMISSIONS.WAREHOUSE_COUNTS.APPROVE}>
                  <Button onClick={() => setConfirm("complete")}>{t("warehouse.counts.complete")}</Button>
                </ActionGuard>
              </>
            )}
          </DialogFooter>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t(`warehouse.counts.${confirm === "cancel" ? "cancelConfirmTitle" : "completeConfirmTitle"}`)}
        description={t(`warehouse.counts.${confirm === "cancel" ? "cancelConfirmDescription" : "completeConfirmDescription"}`)}
        variant={confirm === "cancel" ? "destructive" : "default"}
        onConfirm={() => {
          (confirm === "cancel" ? cancel : complete).mutate(count.id);
          setConfirm(null);
        }}
      />
    </>
  );
}
