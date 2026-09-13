"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClinicPatient, useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import type { Patient } from "@/lib/api/clinic-patients";

export const patientFullName = (p?: Pick<Patient, "firstName" | "lastName"> | null) =>
  p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "";

/**
 * Picks a clinic (ERP) patient. The patient-app service keys everything by the
 * ERP patient id, so this is the entry point of every per-patient screen.
 */
export function PatientPicker({
  value,
  onChange,
  placeholder,
}: {
  value: Patient | null;
  onChange: (patient: Patient | null) => void;
  placeholder?: string;
}) {
  const t = useTranslations("patientApp.common");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const searching = !value && term.length >= 2;
  const { data, isFetching } = useClinicPatients({ search: term, limit: 10 }, searching);
  const results = data?.items ?? [];

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{patientFullName(value)}</p>
            <p className="text-xs text-muted-foreground">
              <span dir="ltr">#{value.patientNumber}</span>
              {value.phone && <> · <span dir="ltr">{value.phone}</span></>}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1"
          onClick={() => { onChange(null); setSearch(""); setTerm(""); }}
        >
          <X className="h-4 w-4" />
          {t("change")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder ?? t("searchPatientPlaceholder")}
        className="ps-9"
      />
      {isFetching && (
        <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {searching && !isFetching && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start text-sm hover:bg-accent"
              >
                <span className="truncate font-medium">{patientFullName(p)}</span>
                <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">
                  #{p.patientNumber}{p.phone ? ` · ${p.phone}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Shows an ERP patient's name from their id; falls back to a short id. */
export function PatientName({ id, name }: { id: string; name?: string | null }) {
  const t = useTranslations("patientApp.common");
  const { data } = useClinicPatient(name ? "" : id);
  return <>{name || patientFullName(data) || t("patientFallback", { id: id.slice(0, 8) })}</>;
}
