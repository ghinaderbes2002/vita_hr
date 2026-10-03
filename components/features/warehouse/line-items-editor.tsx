"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WarehouseItem } from "@/lib/api/warehouse";
import { RETURN_CONDITIONS, ReturnCondition } from "@/lib/api/warehouse-operations";
import { OptionSelect, toQty } from "./shared";
import { localizedName } from "./utils";

interface ItemComboboxProps {
  items: WarehouseItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

// Searchable item picker — the catalog is too long for a plain <Select>.
// Matches on name (both languages), SKU and part code.
export function ItemCombobox({ items, value, onChange, className }: ItemComboboxProps) {
  const t = useTranslations("warehouse.shared");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">
            {selected ? `${localizedName(selected, locale)} — ${selected.sku}` : t("selectItem")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchItem")} />
          <CommandList>
            <CommandEmpty>{t("noItems")}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.nameAr ?? ""} ${item.sku} ${item.partCode ?? ""}`}
                  onSelect={() => { onChange(item.id); setOpen(false); }}
                >
                  <Check className={cn("h-4 w-4", item.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{localizedName(item, locale)}</span>
                  <span className="ms-auto font-mono text-xs text-muted-foreground">{item.sku}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface LineDraft {
  key: string;
  itemId: string;
  qty: string;
  unitPrice: string;
  condition: ReturnCondition | "";
  note: string;
}

let lineSeq = 0;
export const newLine = (init?: Partial<LineDraft>): LineDraft => ({
  key: `line-${++lineSeq}`,
  itemId: "",
  qty: "1",
  unitPrice: "",
  condition: "",
  note: "",
  ...init,
});

/** Lines that have both an item and a positive quantity. */
export const filledLines = (lines: LineDraft[]) => lines.filter((l) => l.itemId && toQty(l.qty) !== undefined);

interface LineItemsEditorProps {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  items: WarehouseItem[];
  qtyLabel?: string;
  withPrice?: boolean;
  withCondition?: boolean;
  withNote?: boolean;
}

// The item/quantity rows shared by every document form: material requests,
// purchase invoices, transfers and returns differ only in the extra columns.
export function LineItemsEditor({
  lines, onChange, items, qtyLabel, withPrice, withCondition, withNote,
}: LineItemsEditorProps) {
  const t = useTranslations("warehouse");
  const update = (key: string, patch: Partial<LineDraft>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.key} className="flex flex-wrap items-start gap-2 rounded-lg border p-2">
            <div className="min-w-48 flex-1">
              <ItemCombobox items={items} value={line.itemId} onChange={(itemId) => update(line.key, { itemId })} />
            </div>
            <Input
              type="number"
              min={0}
              step="any"
              value={line.qty}
              onChange={(e) => update(line.key, { qty: e.target.value })}
              placeholder={qtyLabel ?? t("shared.quantity")}
              aria-label={qtyLabel ?? t("shared.quantity")}
              className="w-24"
            />
            {withPrice && (
              <Input
                type="number"
                min={0}
                step="any"
                value={line.unitPrice}
                onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                placeholder={t("shared.unitPrice")}
                aria-label={t("shared.unitPrice")}
                className="w-28"
              />
            )}
            {withCondition && (
              <OptionSelect
                value={line.condition}
                onChange={(v) => update(line.key, { condition: v as ReturnCondition })}
                placeholder={t("returns.condition")}
                className="w-36"
                options={RETURN_CONDITIONS.map((c) => ({ value: c, label: t(`returns.conditions.${c}`) }))}
              />
            )}
            {withNote && (
              <Input
                value={line.note}
                onChange={(e) => update(line.key, { note: e.target.value })}
                placeholder={t("shared.notes")}
                aria-label={t("shared.notes")}
                className="min-w-32 flex-1"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
              aria-label={t("shared.removeLine")}
              disabled={lines.length === 1}
              onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([...lines, newLine()])}>
        <Plus className="h-3.5 w-3.5" />
        {t("shared.addLine")}
      </Button>
    </div>
  );
}
