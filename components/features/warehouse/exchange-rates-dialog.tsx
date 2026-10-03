"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useAddExchangeRate, useExchangeRates } from "@/lib/hooks/use-warehouse";
import { WarehouseCurrency } from "@/lib/api/warehouse";

interface ExchangeRatesDialogProps {
  currency: WarehouseCurrency | null;
  onOpenChange: (open: boolean) => void;
}

export function ExchangeRatesDialog({ currency, onOpenChange }: ExchangeRatesDialogProps) {
  const t = useTranslations();
  const format = useFormatter();
  const [rate, setRate] = useState("");

  const { data: rates = [], isLoading } = useExchangeRates(currency?.id ?? "");
  const addRate = useAddExchangeRate();

  const rateValue = Number(rate);
  const canSubmit = rate.trim() !== "" && rateValue > 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currency || !canSubmit) return;
    try {
      await addRate.mutateAsync({ currencyId: currency.id, rate: rateValue });
      setRate("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog
      open={!!currency}
      onOpenChange={(o) => {
        if (!o) setRate("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("warehouse.currencies.ratesTitle", { code: currency?.code ?? "" })}</DialogTitle>
        </DialogHeader>

        {currency?.isBaseCurrency ? (
          // The API rejects a rate for the base currency (BASE_CURRENCY_RATE_FIXED).
          <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            {t("warehouse.currencies.baseRateFixed")}
          </p>
        ) : (
          <div className="space-y-4">
            <ActionGuard permission={PERMISSIONS.WAREHOUSE_CURRENCIES.MANAGE}>
              <form onSubmit={handleAdd} className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  dir="ltr"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder={t("warehouse.currencies.rate")}
                  aria-label={t("warehouse.currencies.rate")}
                />
                <Button type="submit" disabled={!canSubmit || addRate.isPending} className="shrink-0">
                  {addRate.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  {t("warehouse.currencies.addRate")}
                </Button>
              </form>
            </ActionGuard>

            <div className="rounded-md border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.currencies.rate")}</TableHead>
                    <TableHead>{t("warehouse.currencies.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : rates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                        {t("warehouse.currencies.noRates")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rates.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">
                          {format.number(Number(r.rate), { maximumFractionDigits: 6 })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.effectiveFrom ?? r.createdAt
                            ? format.dateTime(new Date((r.effectiveFrom ?? r.createdAt)!), { dateStyle: "medium", timeStyle: "short" })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
