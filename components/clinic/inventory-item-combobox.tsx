"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InventoryItemFormDialog } from "@/components/clinic/inventory-item-form-dialog";

interface InventoryItem {
  id: string;
  name: string;
  code?: string | null;
  currentStock?: number | null;
}

interface InventoryItemComboboxProps {
  items: InventoryItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

// Searchable replacement for a plain <Select> when the option list is long —
// filters by both name and code as the user types.
export function InventoryItemCombobox({
  items,
  value,
  onChange,
  placeholder = "اختر من المخزون...",
  className,
}: InventoryItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const selected = items.find((it) => it.id === value);

  return (
    <>
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
              {selected ? `${selected.name}${selected.code ? ` — ${selected.code}` : ""}` : placeholder}
            </span>
            {selected && selected.currentStock != null && (
              <span className={cn("ms-2 shrink-0 text-xs", selected.currentStock > 0 ? "text-muted-foreground" : "text-destructive")}>
                متوفر: {selected.currentStock}
              </span>
            )}
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder="ابحث بالاسم أو الكود..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-2">
                  <span className="text-sm text-muted-foreground">لا يوجد صنف مطابق</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { setOpen(false); setAddItemOpen(true); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة صنف جديد
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.code ?? ""}`}
                    onSelect={() => { onChange(item.id === value ? "" : item.id); setOpen(false); }}
                  >
                    <Check className={cn("me-2 h-4 w-4", item.id === value ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{item.name}{item.code ? ` — ${item.code}` : ""}</span>
                    {item.currentStock != null && (
                      <span className={cn("ms-2 shrink-0 text-xs", item.currentStock > 0 ? "text-muted-foreground" : "text-destructive")}>
                        متوفر: {item.currentStock}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <InventoryItemFormDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        initialCode={search}
        onCreated={(item) => { onChange(item.id); setSearch(""); }}
      />
    </>
  );
}
