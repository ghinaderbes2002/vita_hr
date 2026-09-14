"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronLeft, Loader2, Search, UserRound } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { patientFullName } from "@/components/patient-app/patient-picker";
import { useCreatePatientAppAccount } from "@/lib/hooks/use-patient-app";
import { clinicPatientsApi, type Patient } from "@/lib/api/clinic-patients";

export const MIN_ACCOUNT_PASSWORD = 8;

const PAGE_SIZE = 30;
/** Start fetching the next page this many pixels before the list bottom. */
const LOAD_MORE_THRESHOLD = 120;

/**
 * Two steps in one dialog: pick the clinic patient from a suggested list, then
 * fill in the login details for them.
 */
export function CreateAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("patientApp.accounts");
  const tc = useTranslations("patientApp.common");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const create = useCreatePatientAppAccount();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPatient(null);
      setSearch("");
      setTerm("");
      setUsername("");
      setPassword("");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Suggestions show straight away and page in as the list scrolls; typing
  // narrows them.
  const {
    data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["patient-app", "account-patient-picker", term],
    queryFn: ({ pageParam }) =>
      clinicPatientsApi.list({ search: term || undefined, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: open && !patient,
  });
  const patients = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const onListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      hasNextPage && !isFetchingNextPage &&
      el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD
    ) {
      fetchNextPage();
    }
  };

  const tooShort = password.length > 0 && password.length < MIN_ACCOUNT_PASSWORD;
  const canSubmit =
    !!patient && username.trim().length > 0 && password.length >= MIN_ACCOUNT_PASSWORD && !create.isPending;

  const handleCreate = async () => {
    if (!canSubmit || !patient) return;
    try {
      await create.mutateAsync({ erpPatientId: patient.id, username: username.trim(), password });
      onOpenChange(false);
    } catch {
      // toast shown by the hook (e.g. the patient already has an account)
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!create.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? t("detailsTitle") : t("pickPatientTitle")}</DialogTitle>
        </DialogHeader>

        {!patient ? (
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tc("searchPatientPlaceholder")}
                className="ps-9"
              />
              {isFetching && !isLoading && !isFetchingNextPage && (
                <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-80 space-y-0.5 overflow-y-auto rounded-md border p-1" onScroll={onListScroll}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="m-1 h-11" />)
              ) : patients.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{tc("noResults")}</p>
              ) : (
                patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPatient(p)}
                    className="flex w-full items-center gap-3 rounded px-3 py-2 text-start hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <UserRound className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{patientFullName(p)}</p>
                      <p className="text-xs text-muted-foreground">
                        <span dir="ltr">#{p.patientNumber}</span>
                        {p.phone && <> · <span dir="ltr">{p.phone}</span></>}
                      </p>
                    </div>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))
              )}
              {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {hasNextPage && !isFetchingNextPage && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => fetchNextPage()}>
                  {tc("loadMore")}
                </Button>
              )}
            </div>
            {!isLoading && total > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("showing", { shown: patients.length, total })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{patientFullName(patient)}</p>
                <p className="text-xs text-muted-foreground">
                  <span dir="ltr">#{patient.patientNumber}</span>
                  {patient.phone && <> · <span dir="ltr">{patient.phone}</span></>}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPatient(null)} disabled={create.isPending}>
                {tc("change")}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>{t("username")} <span className="text-destructive">*</span></Label>
              <Input
                autoFocus
                dir="ltr"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("password")} <span className="text-destructive">*</span></Label>
              <Input
                dir="ltr"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
              <p className={tooShort ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {tc("minPassword", { min: MIN_ACCOUNT_PASSWORD })}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {patient ? (
            <>
              <Button variant="outline" onClick={() => setPatient(null)} disabled={create.isPending}>
                {tc("back")}
              </Button>
              <Button onClick={handleCreate} disabled={!canSubmit}>
                {create.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("submitCreate")}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
