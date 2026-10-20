"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { cn } from "@/lib/utils";

/**
 * Picks one employee to filter a list by — searchable by name (Arabic or
 * English) or employee number. Emits the employee id, or "" for everyone.
 */
export function EmployeeFilterCombobox({
  value, onChange, placeholder, allLabel, emptyLabel, className,
}: {
  value: string;
  onChange: (employeeId: string) => void;
  placeholder: string;
  /** The trigger's text when no one is picked. */
  allLabel: string;
  emptyLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useEmployeesBasicList();
  const employees = Array.isArray(data) ? data : [];
  const nameOf = (e: (typeof employees)[number]) => `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim();
  const selected = employees.find((e) => e.id === value);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-64 justify-between font-normal">
            <span className="flex min-w-0 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selected ? nameOf(selected) : allLabel}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {employees.map((e) => (
                  <CommandItem
                    key={e.id}
                    // What the search matches against: both names and the number.
                    value={`${nameOf(e)} ${e.firstNameEn ?? ""} ${e.lastNameEn ?? ""} ${e.employeeNumber ?? ""} ${e.id}`}
                    onSelect={() => { onChange(e.id === value ? "" : e.id); setOpen(false); }}
                  >
                    <Check className={cn("h-4 w-4", e.id === value ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{nameOf(e)}</span>
                    {e.employeeNumber && (
                      <span className="font-mono text-xs text-muted-foreground">{e.employeeNumber}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={allLabel} onClick={() => onChange("")}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
