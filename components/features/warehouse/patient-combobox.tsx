"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClinicPatient, useClinicPatients } from "@/lib/hooks/use-clinic-patients";

// The warehouse service has no customer entity: quotations and sales invoices
// point at a patient of the existing patients service by id only.

/** A patient's name for an id; falls back to a short id while loading or if hidden. */
export function PatientName({ patientId }: { patientId?: string | null }) {
  const { data: patient } = useClinicPatient(patientId ?? "");
  if (!patientId) return <>—</>;
  if (!patient) return <span className="font-mono text-xs text-muted-foreground">{patientId.slice(0, 8)}</span>;
  return <>{patient.firstName} {patient.lastName}</>;
}

interface PatientComboboxProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

// Server-side search — the patient list is paginated, so it cannot be
// filtered in the browser like the item picker.
export function PatientCombobox({ value, onChange, disabled }: PatientComboboxProps) {
  const t = useTranslations("warehouse.shared");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isFetching } = useClinicPatients({ search: search.trim() || undefined, limit: 20 }, open);
  const patients = data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-9 w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          <span className="truncate">{value ? <PatientName patientId={value} /> : t("selectPatient")}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={t("searchPatient")} />
          <CommandList>
            {isFetching && patients.length === 0 ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty>{t("noPatients")}</CommandEmpty>
            )}
            <CommandGroup>
              {patients.map((p) => (
                <CommandItem key={p.id} value={p.id} onSelect={() => { onChange(p.id); setOpen(false); }}>
                  <Check className={cn("h-4 w-4", p.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{p.firstName} {p.lastName}</span>
                  <span className="ms-auto font-mono text-xs text-muted-foreground">{p.patientNumber}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
