"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import {
  useApproveMaterialRequest, useCreateMaterialRequest, useIssueMaterialRequest,
  useMaterialRequest, useRejectMaterialRequest,
} from "@/lib/hooks/use-warehouse-operations";
import { MaterialRequestLine } from "@/lib/api/warehouse-operations";
import { filledLines, LineDraft, LineItemsEditor, newLine } from "./line-items-editor";
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
export function MaterialRequestCreateDialog({ open, onOpenChange }: CreateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90dvh] overflow-y-auto">
        <MaterialRequestCreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MaterialRequestCreateForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations();
  const { warehouses, items } = useWarehouseLookups();
  const create = useCreateMaterialRequest();

  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);

  const valid = filledLines(lines);
  const canSubmit = !!warehouseId && valid.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        warehouseId,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: valid.map((l) => ({ itemId: l.itemId, requestedQty: toQty(l.qty)! })),
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>{t("warehouse.materialRequests.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={t("warehouse.shared.warehouse")} required>
            <OptionSelect
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={t("warehouse.shared.selectWarehouse")}
              options={warehouseOptions(warehouses, true)}
            />
          </Field>
          <Field label={t("warehouse.shared.items")} required>
            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              items={items}
              qtyLabel={t("warehouse.materialRequests.requestedQty")}
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

// "approve" and "issue" turn the lines into an editable quantity column, so a
// request can be approved or issued in part.
type Mode = "view" | "approve" | "issue";

export function MaterialRequestDetailsDialog({ id, onClose }: DetailsProps) {
  // Keyed by id: opening another request starts in view mode again.
  return <MaterialRequestDetails key={id ?? "closed"} id={id} onClose={onClose} />;
}

function MaterialRequestDetails({ id, onClose }: DetailsProps) {
  const t = useTranslations();
  const fmt = useWarehouseFormat();
  const { warehouseName, itemName, itemSku } = useWarehouseLookups();
  const { data: request, isLoading } = useMaterialRequest(id ?? "");

  const approve = useApproveMaterialRequest();
  const reject = useRejectMaterialRequest();
  const issue = useIssueMaterialRequest();

  const [mode, setMode] = useState<Mode>("view");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState(false);

  const remainingToIssue = (l: MaterialRequestLine) =>
    Math.max(0, Number(l.approvedQty ?? 0) - Number(l.issuedQty ?? 0));

  const startMode = (next: Mode) => {
    if (!request) return;
    setQtys(Object.fromEntries(request.items.map((l) => [
      l.itemId,
      String(next === "approve" ? Number(l.requestedQty) : remainingToIssue(l)),
    ])));
    setMode(next);
  };

  const handleConfirm = async () => {
    if (!request) return;
    // A blank or zero quantity leaves that line out of this round.
    const entries = request.items
      .map((l) => ({ itemId: l.itemId, qty: toQty(qtys[l.itemId] ?? "") }))
      .filter((e): e is { itemId: string; qty: number } => e.qty !== undefined);
    if (entries.length === 0) return;
    try {
      if (mode === "approve") {
        await approve.mutateAsync({
          id: request.id,
          items: entries.map((e) => ({ itemId: e.itemId, approvedQty: e.qty })),
        });
      } else {
        await issue.mutateAsync({
          id: request.id,
          items: entries.map((e) => ({ itemId: e.itemId, issuedQty: e.qty })),
        });
      }
      setMode("view");
    } catch {
      // Error handled by mutation
    }
  };

  const status = request?.status;
  const canApprove = status === "SUBMITTED";
  const canIssue = status === "APPROVED" || status === "PARTIALLY_APPROVED" || status === "PARTIALLY_ISSUED";
  const busy = approve.isPending || issue.isPending;

  return (
    <>
      <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[720px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {t("warehouse.materialRequests.detailsTitle")}
              {request && <span className="font-mono text-sm text-muted-foreground">#{refNo(request)}</span>}
              {request && <StatusBadge status={request.status} />}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !request ? (
            <DialogLoading />
          ) : (
            <div className="space-y-4">
              {mode !== "view" && <FrozenWarehouseNotice warehouseIds={[request.warehouseId]} />}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailItem label={t("warehouse.shared.warehouse")}>
                  {warehouseName(request.warehouseId, request.warehouse)}
                </DetailItem>
                <DetailItem label={t("warehouse.shared.date")}>{fmt.dateTime(request.createdAt)}</DetailItem>
                {request.referenceType && (
                  <DetailItem label={t("warehouse.materialRequests.referenceType")}>
                    {t.has(`warehouse.materialRequests.referenceTypes.${request.referenceType}`)
                      ? t(`warehouse.materialRequests.referenceTypes.${request.referenceType}`)
                      : request.referenceType}
                  </DetailItem>
                )}
                {request.notes && (
                  <DetailItem label={t("warehouse.shared.notes")}>{request.notes}</DetailItem>
                )}
                {request.rejectionReason && (
                  <DetailItem label={t("warehouse.shared.reason")}>{request.rejectionReason}</DetailItem>
                )}
              </div>

              {mode !== "view" && (
                <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {mode === "approve"
                    ? t("warehouse.materialRequests.approveHint")
                    : t("warehouse.materialRequests.issueHint")}
                </p>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("warehouse.shared.item")}</TableHead>
                      <TableHead>{t("warehouse.materialRequests.requestedQty")}</TableHead>
                      <TableHead>{t("warehouse.materialRequests.approvedQty")}</TableHead>
                      <TableHead>{t("warehouse.materialRequests.issuedQty")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((l) => {
                      const input = (
                        <Input
                          type="number" min={0} step="any" className="h-8 w-24"
                          value={qtys[l.itemId] ?? ""}
                          onChange={(e) => setQtys((s) => ({ ...s, [l.itemId]: e.target.value }))}
                        />
                      );
                      return (
                        <TableRow key={l.id ?? l.itemId}>
                          <TableCell className="font-medium">
                            {itemName(l.itemId, l.item)}
                            <p className="font-mono text-xs text-muted-foreground">{itemSku(l.itemId, l.item)}</p>
                          </TableCell>
                          <TableCell>{fmt.qty(l.requestedQty)}</TableCell>
                          <TableCell>{mode === "approve" ? input : fmt.qty(l.approvedQty)}</TableCell>
                          <TableCell>{mode === "issue" ? input : fmt.qty(l.issuedQty)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            {mode === "view" ? (
              <>
                <Button variant="outline" onClick={onClose}>{t("warehouse.shared.close")}</Button>
                {/* Approve, reject and issue all sit behind the one approve permission. */}
                <ActionGuard permission={PERMISSIONS.WAREHOUSE_MATERIAL_REQUESTS.APPROVE}>
                  {canApprove && (
                    <>
                      <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                        {t("warehouse.shared.reject")}
                      </Button>
                      <Button onClick={() => startMode("approve")}>{t("warehouse.shared.approve")}</Button>
                    </>
                  )}
                  {canIssue && (
                    <Button onClick={() => startMode("issue")}>{t("warehouse.materialRequests.issue")}</Button>
                  )}
                </ActionGuard>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setMode("view")}>{t("common.cancel")}</Button>
                <Button onClick={handleConfirm} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "approve" ? t("warehouse.shared.approve") : t("warehouse.materialRequests.issue")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("warehouse.materialRequests.rejectTitle")}
        isPending={reject.isPending}
        onConfirm={async (reason) => {
          if (!request) return;
          try {
            await reject.mutateAsync({ id: request.id, reason: reason || undefined });
            setRejectOpen(false);
          } catch {
            // Error handled by mutation
          }
        }}
      />
    </>
  );
}
