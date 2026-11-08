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
import { useInfiniteQuery } from "@tanstack/react-query";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { salesCustomersApi } from "@/lib/api/sales-customers";

const PAGE_SIZE = 30;

// Quotations and sales invoices point at a clinic patient by id, or at a sales
// customer (see ClientPicker below).

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

  // One page at a time, the next one fetched as the list is scrolled to its end —
  // a single fixed page left every patient past the first 20 out of reach.
  const term = search.trim() || undefined;
  const { data, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["clinic-patients", "picker", term],
    queryFn: ({ pageParam }) => clinicPatientsApi.list({ search: term, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: open,
  });
  const patients = data?.pages.flatMap((p) => p.items) ?? [];
  const onListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasNextPage && !isFetchingNextPage && el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      fetchNextPage();
    }
  };

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
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={t("searchPatient")} />
          <CommandList onScroll={onListScroll}>
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
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Sales customers ──────────────────────────────────────────────────────────
// A quotation or sales invoice is for either a clinic patient or a sales
// customer (/referrals/customers) — never both.

export type ClientKind = "patient" | "customer";

/** Whose document it is, for a list cell or a details row. */
export function ClientName({ patientId, customerId, customer }: {
  patientId?: string | null;
  customerId?: string | null;
  customer?: { name?: string | null } | null;
}) {
  if (customerId || customer) {
    const name = customer?.name;
    return name
      ? <>{name}</>
      : <span className="font-mono text-xs text-muted-foreground">{customerId?.slice(0, 8) ?? "—"}</span>;
  }
  return <PatientName patientId={patientId} />;
}

interface CustomerComboboxProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** The current customer's name, when it is already known (e.g. on edit). */
  selectedName?: string | null;
}

/** Server-side search with paging, like the patient picker. */
export function CustomerCombobox({ value, onChange, disabled, selectedName }: CustomerComboboxProps) {
  const t = useTranslations("warehouse.shared");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // The customers list has no lookup by id for everyone, so the name picked
  // here is remembered rather than fetched back.
  const [pickedName, setPickedName] = useState<string | null>(null);

  const term = search.trim() || undefined;
  const { data, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["sales-customers", "picker", term],
    queryFn: ({ pageParam }) => salesCustomersApi.list({ search: term, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (all.length < last.totalPages ? all.length + 1 : undefined),
    enabled: open,
  });
  const customers = data?.pages.flatMap((p) => p.items) ?? [];
  const onListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasNextPage && !isFetchingNextPage && el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      fetchNextPage();
    }
  };
  const label = value ? (pickedName ?? selectedName ?? customers.find((c) => c.id === value)?.name ?? value.slice(0, 8)) : null;

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
          <span className="truncate">{label ?? t("selectCustomer")}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={t("searchCustomer")} />
          <CommandList onScroll={onListScroll}>
            {isFetching && customers.length === 0 ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty>{t("noCustomers")}</CommandEmpty>
            )}
            <CommandGroup>
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => { onChange(c.id); setPickedName(c.name); setOpen(false); }}
                >
                  <Check className={cn("h-4 w-4", c.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{c.name}</span>
                  <span className="ms-auto font-mono text-xs text-muted-foreground" dir="ltr">{c.contactNumber}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ClientPickerProps {
  kind: ClientKind;
  /** Switching clears the choice: an id of one kind means nothing to the other. */
  onKindChange: (kind: ClientKind) => void;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  selectedCustomerName?: string | null;
}

/**
 * Patient-or-customer toggle and the matching picker on one line, the same
 * height as the other filters and fields beside it.
 */
export function ClientPicker({ kind, onKindChange, value, onChange, disabled, selectedCustomerName }: ClientPickerProps) {
  const t = useTranslations("warehouse.shared");
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 shrink-0 items-center rounded-md border bg-muted/40 p-0.5" role="radiogroup">
        {(["patient", "customer"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            disabled={disabled}
            onClick={() => { if (k !== kind) { onKindChange(k); onChange(""); } }}
            className={cn(
              "h-full rounded px-3 text-xs font-medium transition-colors disabled:opacity-50",
              kind === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k === "patient" ? t("clientPatient") : t("clientCustomer")}
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        {kind === "patient"
          ? <PatientCombobox value={value} onChange={onChange} disabled={disabled} />
          : <CustomerCombobox value={value} onChange={onChange} disabled={disabled} selectedName={selectedCustomerName} />}
      </div>
    </div>
  );
}
