"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCashCurrencies } from "@/lib/hooks/use-cashbox";
import { CashCurrencyDialog } from "@/components/features/cashbox/cashbox-dialogs";

export default function CashCurrenciesPage() {
  return (
    <PageGuard permission={PERMISSIONS.CASHBOX.BOXES_READ}>
      <CashCurrenciesContent />
    </PageGuard>
  );
}

function CashCurrenciesContent() {
  const t = useTranslations("cashbox");
  const { data: currencies = [], isLoading } = useCashCurrencies();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("currenciesTitle")}
        description={t("currenciesDescription")}
        actions={
          <ActionGuard permission={PERMISSIONS.CASHBOX.BOXES_MANAGE}>
            <Button className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("currency.addTitle")}
            </Button>
          </ActionGuard>
        }
      />
      <div className="max-w-xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">{t("fields.code")}</TableHead>
              <TableHead>{t("fields.name")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : currencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <EmptyState icon={<Coins className="h-8 w-8 text-muted-foreground" />} title={t("noCurrencies")} />
                </TableCell>
              </TableRow>
            ) : (
              currencies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CashCurrencyDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
