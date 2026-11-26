"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateMode = "all" | "day" | "range";

export interface DateFilterValue {
  mode: DateMode;
  /** The single day (mode "day") or the range start (mode "range"), yyyy-mm-dd. */
  from: string;
  /** The range end (mode "range"), yyyy-mm-dd. */
  to: string;
}

export const EMPTY_DATE_FILTER: DateFilterValue = { mode: "all", from: "", to: "" };

/** The API's dateFrom / dateTo (inclusive days). A single day sends the same date twice. */
export function dateFilterParams(v: DateFilterValue): { dateFrom?: string; dateTo?: string } {
  if (v.mode === "day") return v.from ? { dateFrom: v.from, dateTo: v.from } : {};
  if (v.mode === "range") return { ...(v.from ? { dateFrom: v.from } : {}), ...(v.to ? { dateTo: v.to } : {}) };
  return {};
}

/** Filter by one day or a from–to range. */
export function DateRangeFilter({
  value, onChange,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}) {
  const set = (patch: Partial<DateFilterValue>) => onChange({ ...value, ...patch });
  const active = value.mode !== "all" && (value.from || value.to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.mode} onValueChange={(m) => onChange({ mode: m as DateMode, from: "", to: "" })}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل التواريخ</SelectItem>
          <SelectItem value="day">يوم محدد</SelectItem>
          <SelectItem value="range">من تاريخ إلى تاريخ</SelectItem>
        </SelectContent>
      </Select>

      {value.mode === "day" && (
        <Input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} className="w-40" aria-label="اليوم" />
      )}

      {value.mode === "range" && (
        <>
          <span className="text-sm text-muted-foreground">من</span>
          <Input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => set({ from: e.target.value })}
            className="w-40"
            aria-label="من تاريخ"
          />
          <span className="text-sm text-muted-foreground">إلى</span>
          <Input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => set({ to: e.target.value })}
            className="w-40"
            aria-label="إلى تاريخ"
          />
        </>
      )}

      {active && (
        <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => onChange(EMPTY_DATE_FILTER)}>
          <X className="h-3.5 w-3.5" /> مسح
        </Button>
      )}
    </div>
  );
}
