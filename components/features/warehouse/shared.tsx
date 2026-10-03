"use client";

import { ReactNode, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useWarehouseItems, useWarehouses } from "@/lib/hooks/use-warehouse";
import { useInventoryCounts } from "@/lib/hooks/use-warehouse-operations";
import { Warehouse, WarehouseItem } from "@/lib/api/warehouse";
import { localizedName } from "./utils";

export const ALL = "all";

/**
 * Names for the ids that documents carry. A response may embed the related
 * record or only its id, so each resolver takes the embedded one first and
 * falls back to the cached master lists.
 */
export function useWarehouseLookups() {
  const locale = useLocale();
  const { data: warehouses = [] } = useWarehouses();
  const { data: items = [] } = useWarehouseItems();

  const findItem = (id?: string | null, embedded?: Partial<WarehouseItem> | null) =>
    items.find((i) => i.id === id) ?? (embedded?.name ? (embedded as WarehouseItem) : undefined);

  return {
    warehouses,
    items,
    warehouseName: (id?: string | null, embedded?: Pick<Warehouse, "name"> | null) =>
      embedded?.name ?? warehouses.find((w) => w.id === id)?.name ?? "—",
    itemName: (id?: string | null, embedded?: Partial<WarehouseItem> | null) => {
      const item = findItem(id, embedded);
      return item ? localizedName(item, locale) : "—";
    },
    itemSku: (id?: string | null, embedded?: Partial<WarehouseItem> | null) => findItem(id, embedded)?.sku ?? "",
  };
}

/** Quantities, amounts and dates, formatted for the active locale. */
export function useWarehouseFormat() {
  const format = useFormatter();
  const num = (v: unknown, max: number) =>
    v == null || v === "" || Number.isNaN(Number(v)) ? "—" : format.number(Number(v), { maximumFractionDigits: max });
  return {
    qty: (v: unknown) => num(v, 3),
    money: (v: unknown, currencyCode?: string | null) => {
      const s = num(v, 2);
      return s === "—" || !currencyCode ? s : `${s} ${currencyCode}`;
    },
    date: (v?: string | null) => (v ? format.dateTime(new Date(v), { dateStyle: "medium" }) : "—"),
    dateTime: (v?: string | null) =>
      v ? format.dateTime(new Date(v), { dateStyle: "medium", timeStyle: "short" }) : "—",
  };
}

/** A document's human number (`documentNo` on every type), else a short id. */
export function refNo(doc: { id: string; documentNo?: string | null }): string {
  return doc.documentNo || doc.id.slice(0, 8);
}

/** A positive number from text input, else undefined. */
export function toQty(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-700",
  SUBMITTED: "border-amber-300 bg-amber-50 text-amber-700",
  IN_TRANSIT: "border-amber-300 bg-amber-50 text-amber-700",
  IN_PROGRESS: "border-amber-300 bg-amber-50 text-amber-700",
  PARTIALLY_APPROVED: "border-sky-300 bg-sky-50 text-sky-700",
  PARTIALLY_ISSUED: "border-sky-300 bg-sky-50 text-sky-700",
  APPROVED: "border-blue-300 bg-blue-50 text-blue-700",
  SENT: "border-indigo-300 bg-indigo-50 text-indigo-700",
  ISSUED: "border-green-300 bg-green-50 text-green-700",
  POSTED: "border-green-300 bg-green-50 text-green-700",
  COMPLETED: "border-green-300 bg-green-50 text-green-700",
  ACCEPTED: "border-green-300 bg-green-50 text-green-700",
  REJECTED: "border-red-300 bg-red-50 text-red-700",
  CANCELLED: "border-slate-300 bg-slate-100 text-slate-500",
  SUPERSEDED: "border-slate-300 bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("warehouse.statuses");
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", STATUS_TONE[status])}>
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}

export function Field({
  label, required, hint, className, children,
}: { label: string; required?: boolean; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Label/value pair for the header block of a details dialog. */
export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium break-words">{children}</div>
    </div>
  );
}

interface OptionSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Adds a leading "all" entry (value ALL) with this label — for filters. */
  allLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function OptionSelect({
  value, onChange, options, allLabel, placeholder, className, disabled,
}: OptionSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Warehouse options for OptionSelect; inactive warehouses are left out of forms. */
export function warehouseOptions(warehouses: Warehouse[], activeOnly = false) {
  return warehouses
    .filter((w) => !activeOnly || w.isActive)
    .map((w) => ({ value: w.id, label: w.name }));
}

/**
 * While a count is IN_PROGRESS on a warehouse the backend refuses anything
 * that would change its balance. This says so up front, next to the form,
 * instead of leaving the user to find out from an error toast.
 */
export function FrozenWarehouseNotice({ warehouseIds }: { warehouseIds: (string | undefined | null)[] }) {
  const t = useTranslations("warehouse.shared");
  const { hasPermission, isAdmin } = usePermissions();
  const canRead = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_COUNTS.READ);
  const { data: counts = [] } = useInventoryCounts({ status: "IN_PROGRESS" }, canRead);

  const frozen = counts.some((c) => c.status === "IN_PROGRESS" && warehouseIds.includes(c.warehouseId));
  if (!frozen) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{t("frozen")}</p>
    </div>
  );
}

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label?: string;
  confirmText?: string;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
}

/** Confirmation that collects an optional free-text reason (reject flows). */
export function ReasonDialog({
  open, onOpenChange, title, label, confirmText, isPending, onConfirm,
}: ReasonDialogProps) {
  const t = useTranslations();
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setReason(""); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Field label={label ?? t("warehouse.shared.reasonOptional")}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant="destructive" disabled={isPending} onClick={() => onConfirm(reason.trim())}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText ?? t("warehouse.shared.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Centered spinner for a details dialog that is still loading its record. */
export function DialogLoading() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
