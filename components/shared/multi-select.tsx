"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** How many chosen items to name before collapsing the rest into a counter. */
  maxBadges?: number;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  emptyText = "لا توجد نتائج",
  maxBadges = 3,
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = options.filter((o) => value.includes(o.value));
  const shown = selected.slice(0, maxBadges);
  const hidden = selected.length - shown.length;

  function toggle(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  }

  return (
    // modal: inside a Dialog the popover is portalled out of the dialog's focus
    // trap, and without its own trap the search box cannot be typed into.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          // h-auto so the badges can wrap onto a second line instead of clipping.
          className={cn("h-auto min-h-9 w-full justify-between gap-2 py-1.5 font-normal", className)}
        >
          <span className="flex flex-1 flex-wrap items-center gap-1 text-start">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {shown.map((o) => (
                  <Badge key={o.value} variant="secondary" className="gap-1 text-[11px] font-normal">
                    {o.label}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`إزالة ${o.label}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(o.value); }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
                {hidden > 0 && (
                  <Badge variant="outline" className="text-[11px] font-normal">+{hidden}</Badge>
                )}
              </>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = value.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    // Keyed by id, searched by label: two options may share a label.
                    value={o.value}
                    keywords={[o.label]}
                    onSelect={() => toggle(o.value)}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                    <span className="flex-1 truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
