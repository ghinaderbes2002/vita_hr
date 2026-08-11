"use client";

// Picks the referring doctor / hospital / association from the sources
// directory. The name is always kept; the id is only kept when the name came
// from a real record, so a freehand name still reaches the backend.
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReferralSources } from "@/lib/hooks/use-clinic-referrals";
import { ReferralSourceType } from "@/lib/api/clinic-referrals";

export interface ReferralSourcePick {
  /** null = the name was typed by hand and matches no registered source. */
  referralSourceId: string | null;
  referralDetails: string;
}

export function ReferralSourceCombobox({
  type,
  value,
  onChange,
  placeholder = "ابحث بالاسم...",
}: {
  type: ReferralSourceType;
  value: ReferralSourcePick;
  onChange: (v: ReferralSourcePick) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Only fetch while the list is open — the patient form has this collapsed
  // most of the time.
  const { data, isLoading } = useReferralSources(
    { type, search: debouncedSearch || undefined, limit: 20 },
    { enabled: open },
  );
  const sources = data?.items ?? [];

  const pickFreeText = () => {
    const name = search.trim();
    if (!name) return;
    onChange({ referralSourceId: null, referralDetails: name });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between font-normal", !value.referralDetails && "text-muted-foreground")}
        >
          <span className="truncate">{value.referralDetails || placeholder}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* The API does the filtering, so cmdk's own matching is turned off. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-2">
                <span className="text-sm text-muted-foreground">
                  {isLoading ? "جاري البحث..." : "لا يوجد مصدر مطابق"}
                </span>
                {!isLoading && search.trim() && (
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={pickFreeText}>
                    <PenLine className="h-3.5 w-3.5" />
                    استخدام «{search.trim()}» كاسم حر
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {sources.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onChange({ referralSourceId: s.id, referralDetails: s.name });
                    setOpen(false);
                  }}
                >
                  <Check className={cn("me-2 h-4 w-4", s.id === value.referralSourceId ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">
                    {s.name}
                    {s.specialty && <span className="text-muted-foreground"> — {s.specialty}</span>}
                    {s.city && <span className="text-xs text-muted-foreground"> ({s.city})</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
