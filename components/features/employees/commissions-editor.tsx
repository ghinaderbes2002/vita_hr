"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import type { EmployeeCommission } from "@/types";

/** Amounts stay strings while editing so a half-typed value isn't coerced to 0. */
export type CommissionRow = { amount: string; description: string };

export function toCommissionRows(commissions?: EmployeeCommission[] | null): CommissionRow[] {
  return (commissions ?? []).map((c) => ({
    amount: c.amount != null ? String(c.amount) : "",
    description: c.description ?? "",
  }));
}

/**
 * Drops blank rows and returns the payload shape the API expects. `description`
 * is always sent — the backend validates it as a string and rejects the key
 * being absent, so a blank one goes out as "".
 */
export function toCommissionPayload(rows: CommissionRow[]): EmployeeCommission[] {
  return rows
    .filter((r) => r.amount.trim() !== "" && !Number.isNaN(parseFloat(r.amount)))
    .map((r) => ({
      amount: parseFloat(r.amount),
      description: r.description.trim(),
    }));
}

export function commissionRowsInvalid(rows: CommissionRow[]): boolean {
  return rows.some((r) => {
    if (r.amount.trim() === "") return r.description.trim() !== ""; // description without amount
    const n = parseFloat(r.amount);
    return Number.isNaN(n) || n < 0;
  });
}

export function commissionRowsTotal(rows: CommissionRow[]): number {
  return toCommissionPayload(rows).reduce((s, c) => s + c.amount, 0);
}

interface Props {
  rows: CommissionRow[];
  onRowsChange: (rows: CommissionRow[]) => void;
}

export function CommissionsEditor({ rows, onRowsChange }: Props) {
  function add() {
    onRowsChange([...rows, { amount: "", description: "" }]);
  }
  function remove(i: number) {
    onRowsChange(rows.filter((_, idx) => idx !== i));
  }
  function update(i: number, key: keyof CommissionRow, value: string) {
    onRowsChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  const total = commissionRowsTotal(rows);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            className="w-28"
            placeholder="المبلغ"
            value={row.amount}
            onChange={(e) => update(i, "amount", e.target.value)}
          />
          <Input
            className="flex-1"
            placeholder="الشرح (اختياري)"
            value={row.description}
            onChange={(e) => update(i, "description", e.target.value)}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          إضافة عمولة
        </Button>
        {rows.length > 0 && (
          <span className="text-sm">
            <span className="text-muted-foreground">المجموع: </span>
            <span className="font-semibold">${total.toLocaleString("en-US")}</span>
          </span>
        )}
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-amber-600">القائمة فارغة — سيتم حذف جميع العمولات الحالية</p>
      )}
    </div>
  );
}
