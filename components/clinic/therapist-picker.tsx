"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Multi-select of clinical staff by user id — the specialist therapists of an
 * appointment and the attendees of an internal meeting. `highlightIds` marks
 * people the server reported as busy.
 */
export function TherapistPicker({
  staff, value, onChange, placeholder, labelOf, highlightIds = [],
}: {
  staff: any[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  labelOf: (id: string) => string;
  highlightIds?: string[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-auto min-h-10 py-2">
          <span className={cn("truncate text-start", value.length === 0 && "text-muted-foreground")}>
            {value.length ? value.map(labelOf).join("، ") : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-1" align="start">
        {staff.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">—</p>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            {staff.map((emp: any) => {
              const val = emp.userId ?? emp.id;
              const active = value.includes(val);
              const busy = highlightIds.includes(val);
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => onChange(active ? value.filter((x) => x !== val) : [...value, val])}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-start",
                    busy && "text-destructive font-medium",
                  )}
                >
                  <Checkbox checked={active} className="pointer-events-none" />
                  <span className="flex-1 truncate">{emp.firstNameAr} {emp.lastNameAr}</span>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
