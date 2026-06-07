"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export const ALLOWANCE_TYPES = [
  { value: "FOOD",                label: "طعام" },
  { value: "PREVIOUS_EXPERIENCE", label: "خبرة سابقة" },
  { value: "ACADEMIC_DEGREE",     label: "شهادة علمية" },
  { value: "WORK_NATURE",         label: "طبيعة عمل" },
  { value: "RESPONSIBILITY",      label: "مسؤولية" },
  { value: "RESIDENCE",           label: "سكن" },
] as const;

export const ALLOWANCE_AR: Record<string, string> = Object.fromEntries(
  ALLOWANCE_TYPES.map(a => [a.value, a.label]),
);

export type AllowanceRow = { type: string; amount: string };

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  rows: AllowanceRow[];
  onRowsChange: (rows: AllowanceRow[]) => void;
}

export function AllowancesEditor({ enabled, onEnabledChange, rows, onRowsChange }: Props) {
  function add() {
    onRowsChange([...rows, { type: "", amount: "" }]);
  }
  function remove(i: number) {
    onRowsChange(rows.filter((_, idx) => idx !== i));
  }
  function update(i: number, key: "type" | "amount", value: string) {
    onRowsChange(rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="editAllowances"
          checked={enabled}
          onChange={(e) => {
            onEnabledChange(e.target.checked);
            if (!e.target.checked) onRowsChange([]);
          }}
          className="rounded accent-primary"
        />
        <Label htmlFor="editAllowances" className="cursor-pointer font-normal text-sm">
          تعديل البدلات
        </Label>
      </div>

      {enabled && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={row.type || "__NONE__"}
                onValueChange={(v) => update(i, "type", v === "__NONE__" ? "" : v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="نوع البدل" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWANCE_TYPES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                className="w-28"
                placeholder="المبلغ"
                value={row.amount}
                onChange={(e) => update(i, "amount", e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            إضافة بدل
          </Button>
          {rows.length === 0 && (
            <p className="text-xs text-amber-600">القائمة فارغة — سيتم حذف جميع البدلات الحالية</p>
          )}
        </div>
      )}
    </div>
  );
}
