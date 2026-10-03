"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Coins, Plus, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useSetBaseCurrency, useWarehouseCurrencies } from "@/lib/hooks/use-warehouse";
import { WarehouseCurrency } from "@/lib/api/warehouse";
import { CurrencyDialog } from "@/components/features/warehouse/currency-dialog";
import { ExchangeRatesDialog } from "@/components/features/warehouse/exchange-rates-dialog";

export default function WarehouseCurrenciesPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_CURRENCIES.READ}>
      <CurrenciesContent />
    </PageGuard>
  );
}

function CurrenciesContent() {
  const t = useTranslations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ratesFor, setRatesFor] = useState<WarehouseCurrency | null>(null);
  const [baseTarget, setBaseTarget] = useState<WarehouseCurrency | null>(null);

  const { data: currencies = [], isLoading } = useWarehouseCurrencies();
  const setBase = useSetBaseCurrency();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("warehouse.currencies.title")}
        description={t("warehouse.currencies.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WAREHOUSE_CURRENCIES.MANAGE}>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("warehouse.currencies.add")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("warehouse.currencies.fields.code")}</TableHead>
              <TableHead>{t("warehouse.currencies.fields.name")}</TableHead>
              <TableHead />
              <TableHead className="w-[1%] whitespace-nowrap">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : currencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState
                    icon={<Coins className="h-8 w-8 text-muted-foreground" />}
                    title={t("warehouse.currencies.empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              currencies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    {c.isBaseCurrency && <Badge>{t("warehouse.currencies.base")}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRatesFor(c)}>
                        <TrendingUp className="h-3.5 w-3.5" />
                        {t("warehouse.currencies.rates")}
                      </Button>
                      {!c.isBaseCurrency && (
                        <ActionGuard permission={PERMISSIONS.WAREHOUSE_CURRENCIES.MANAGE}>
                          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setBaseTarget(c)}>
                            <Star className="h-3.5 w-3.5" />
                            {t("warehouse.currencies.setBase")}
                          </Button>
                        </ActionGuard>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CurrencyDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ExchangeRatesDialog currency={ratesFor} onOpenChange={(o) => !o && setRatesFor(null)} />

      <ConfirmDialog
        open={!!baseTarget}
        onOpenChange={(o) => !o && setBaseTarget(null)}
        title={t("warehouse.currencies.setBaseTitle", { code: baseTarget?.code ?? "" })}
        description={t("warehouse.currencies.setBaseDescription")}
        onConfirm={() => { if (baseTarget) setBase.mutate(baseTarget.id); setBaseTarget(null); }}
      />
    </div>
  );
}
