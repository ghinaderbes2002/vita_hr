"use client";

import { useState } from "react";
import { Ban, Check, CheckCircle2, Clock, Hourglass, Loader2, PackageX, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCashBoxes, useCashDecision, useCashPending } from "@/lib/hooks/use-cashbox";
import { useWarehouseFormat } from "@/components/features/warehouse/shared";
import type { CashTransaction, CashTxStatus } from "@/lib/api/cashbox";

export const CASH_TX_STATUS_LABEL: Record<CashTxStatus, string> = {
  COMPLETED: "منفّذة",
  PENDING_CEO_APPROVAL: "بانتظار موافقة المدير",
  PENDING_RECEIPT: "بانتظار تأكيد الاستلام",
  REJECTED: "مرفوضة",
  CANCELLED: "ملغاة",
};

const STYLE: Record<CashTxStatus, { cls: string; icon: typeof Clock }> = {
  COMPLETED: { cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300", icon: CheckCircle2 },
  PENDING_CEO_APPROVAL: { cls: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300", icon: Hourglass },
  PENDING_RECEIPT: { cls: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300", icon: Clock },
  REJECTED: { cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300", icon: XCircle },
  CANCELLED: { cls: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400", icon: Ban },
};

/** A transaction's state; one without a status (older API) reads as done. */
export function CashTxStatusBadge({ tx }: { tx: CashTransaction }) {
  const status = tx.status ?? "COMPLETED";
  const s = STYLE[status] ?? STYLE.COMPLETED;
  const Icon = s.icon;
  const detail = [
    tx.decidedByName && `${status === "REJECTED" ? "رفضها" : status === "CANCELLED" ? "ألغاها" : "قرّرها"}: ${tx.decidedByName}`,
    tx.rejectReason && `السبب: ${tx.rejectReason}`,
  ].filter(Boolean).join(" — ");
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs whitespace-nowrap", s.cls)} title={detail || undefined}>
      <Icon className="h-3 w-3" />
      {CASH_TX_STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * What the viewer may do with a pending transaction:
 *  - waiting for the CEO → approve / reject (cashbox.ceo-approve)
 *  - waiting for receipt → confirm / "didn't arrive" (the receiving box's
 *    custodian, or cashbox.boxes.manage when they're away)
 *  - either, and the viewer recorded it → cancel
 * The server checks all of it again; this only hides buttons that would 403.
 */
export function CashTxActions({ tx }: { tx: CashTransaction }) {
  const user = useAuthStore((s) => s.user);
  const { hasPermission, isAdmin } = usePermissions();
  const { data: boxes = [] } = useCashBoxes();
  const decide = useCashDecision();
  const [rejecting, setRejecting] = useState<"ceoReject" | "rejectReceipt" | null>(null);
  const [reason, setReason] = useState("");

  const status = tx.status ?? "COMPLETED";
  if (status !== "PENDING_CEO_APPROVAL" && status !== "PENDING_RECEIPT") return null;

  const canCeo = isAdmin() || hasPermission(PERMISSIONS.CASHBOX.CEO_APPROVE);
  const canManage = isAdmin() || hasPermission(PERMISSIONS.CASHBOX.BOXES_MANAGE);
  // A handover goes into the main box; a receipt or refill into the row's own box.
  const receivingBox = tx.transactionType === "HANDOVER"
    ? boxes.find((b) => b.type === "MAIN")
    : boxes.find((b) => b.id === tx.cashBoxId);
  const isReceiver = !!receivingBox?.custodianEmployeeId
    && (receivingBox.custodianEmployeeId === user?.employeeId || receivingBox.custodianEmployeeId === user?.id);
  const isRequester = !!tx.createdByUserId && tx.createdByUserId === user?.id;

  const busy = decide.isPending;
  const submitReject = async () => {
    if (!rejecting || !reason.trim()) return;
    try {
      await decide.mutateAsync({ action: rejecting, id: tx.id, reason: reason.trim() });
      setRejecting(null);
      setReason("");
    } catch { /* toasted */ }
  };

  const btn = "h-7 gap-1 px-2 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {status === "PENDING_CEO_APPROVAL" && canCeo && (
        <>
          <Button size="sm" className={cn(btn, "bg-emerald-600 text-white hover:bg-emerald-700")} disabled={busy}
            onClick={() => decide.mutate({ action: "ceoApprove", id: tx.id })}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} موافقة
          </Button>
          <Button size="sm" variant="outline" className={cn(btn, "text-destructive hover:text-destructive")} disabled={busy}
            onClick={() => setRejecting("ceoReject")}>
            <X className="h-3 w-3" /> رفض
          </Button>
        </>
      )}
      {status === "PENDING_RECEIPT" && (isReceiver || canManage) && (
        <>
          <Button size="sm" className={cn(btn, "bg-emerald-600 text-white hover:bg-emerald-700")} disabled={busy}
            onClick={() => decide.mutate({ action: "confirmReceipt", id: tx.id })}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} تأكيد الاستلام
          </Button>
          <Button size="sm" variant="outline" className={cn(btn, "text-destructive hover:text-destructive")} disabled={busy}
            onClick={() => setRejecting("rejectReceipt")}>
            <PackageX className="h-3 w-3" /> لم يصل
          </Button>
        </>
      )}
      {isRequester && (
        <Button size="sm" variant="ghost" className={cn(btn, "text-muted-foreground")} disabled={busy}
          onClick={() => {
            if (window.confirm("إلغاء هذه الحركة؟ إن كان المبلغ قد سُلّم فعلاً فلا تلغِها — اطلب من المستلم تأكيدها أو رفضها.")) {
              decide.mutate({ action: "cancel", id: tx.id });
            }
          }}>
          <Ban className="h-3 w-3" /> إلغاء
        </Button>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o && !busy) { setRejecting(null); setReason(""); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{rejecting === "ceoReject" ? "رفض أمر الصرف" : "المبلغ لم يصل"}</DialogTitle>
            <DialogDescription>
              {rejecting === "ceoReject"
                ? "لن يُصرف المبلغ، ويُبلَّغ من طلبه بالسبب."
                : "لن يدخل المبلغ رصيد الصندوق. في التسليم والتعبئة يعود للصندوق المرسِل تلقائياً."}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب (إلزامي)" />
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => { setRejecting(null); setReason(""); }}>تراجع</Button>
            <Button variant="destructive" disabled={busy || !reason.trim()} onClick={submitReject}>
              {busy && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Under a box's balance: money on its way in (not confirmed by this box's
 * custodian yet) and money sent out that the receiver hasn't confirmed.
 * Neither is part of the balance above it.
 */
export function BoxPendingAmounts({ boxId }: { boxId: string }) {
  const fmt = useWarehouseFormat();
  const { data } = useCashPending(boxId);
  const line = (rows: { currency?: { code?: string } | null; currencyCode?: string; amount: number }[]) =>
    rows.filter((r) => r.amount).map((r) => fmt.money(r.amount, r.currency?.code ?? r.currencyCode)).join(" · ");
  const incoming = data ? line(data.incoming) : "";
  const outgoing = data ? line(data.outgoing) : "";
  if (!incoming && !outgoing) return null;
  return (
    <div className="space-y-0.5 text-xs">
      {incoming && (
        <p className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <Clock className="h-3 w-3" /> بانتظار الاستلام: <span className="font-semibold tabular-nums">{incoming}</span>
        </p>
      )}
      {outgoing && (
        <p className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
          <Hourglass className="h-3 w-3" /> قيد التسليم: <span className="font-semibold tabular-nums">{outgoing}</span>
        </p>
      )}
    </div>
  );
}
