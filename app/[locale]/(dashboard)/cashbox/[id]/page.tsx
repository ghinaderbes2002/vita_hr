"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ClipboardCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useCashBox, useCashCounts, useCashTransactions } from "@/lib/hooks/use-cashbox";
import { CASH_TRANSACTION_TYPES, CashTransactionType } from "@/lib/api/cashbox";
import { OptionSelect, ALL } from "@/components/features/warehouse/shared";
import {
  BoxBalances, BoxTypeBadge, CountsTable, TransactionsTable, useCustodianName,
} from "@/components/features/cashbox/cashbox-shared";
import { CashCountDialog, NewTransactionMenu } from "@/components/features/cashbox/cashbox-dialogs";

const LIMIT = 20;

export default function CashBoxDetailsPage() {
  return (
    <PageGuard permission={PERMISSIONS.CASHBOX.BOXES_READ}>
      <CashBoxDetails />
    </PageGuard>
  );
}

function CashBoxDetails() {
  const t = useTranslations("cashbox");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const custodianName = useCustodianName();
  const { hasPermission, isAdmin } = usePermissions();
  const canReadTx = isAdmin() || hasPermission(PERMISSIONS.CASHBOX.TRANSACTIONS_READ);
  const canReadCounts = isAdmin() || hasPermission(PERMISSIONS.CASHBOX.COUNTS_READ);

  const { data: box, isLoading } = useCashBox(id);
  const [txType, setTxType] = useState(ALL);
  const [txPage, setTxPage] = useState(1);
  const [countsPage, setCountsPage] = useState(1);
  const [countOpen, setCountOpen] = useState(false);

  const { data: txData, isLoading: txLoading } = useCashTransactions({
    cashBoxId: id,
    transactionType: txType !== ALL ? (txType as CashTransactionType) : undefined,
    page: txPage,
    limit: LIMIT,
  });
  const { data: countsData, isLoading: countsLoading } = useCashCounts({ cashBoxId: id, page: countsPage, limit: LIMIT });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!box) return <p className="text-sm text-muted-foreground">{t("boxNotFound")}</p>;

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/cashbox`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
        {t("boxesTitle")}
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{box.name}</h1>
              <BoxTypeBadge type={box.type} />
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {t("fields.custodian")}: {custodianName(box)}
            </p>
            <BoxBalances boxId={box.id} className="pt-1 text-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionGuard permission={PERMISSIONS.CASHBOX.COUNTS_CREATE}>
              <Button variant="outline" className="gap-2" onClick={() => setCountOpen(true)}>
                <ClipboardCheck className="h-4 w-4" />
                {t("count.addTitle")}
              </Button>
            </ActionGuard>
            <NewTransactionMenu defaultBoxId={box.id} boxType={box.type} />
          </div>
        </CardContent>
      </Card>

      {/* Radix Tabs sets dir="ltr" on itself unless told, which flipped the
          tabs, the filter and the tables inside it. */}
      <Tabs defaultValue={canReadTx ? "transactions" : "counts"} dir={locale === "ar" ? "rtl" : "ltr"}>
        <TabsList>
          {canReadTx && <TabsTrigger value="transactions">{t("transactionsTitle")}</TabsTrigger>}
          {canReadCounts && <TabsTrigger value="counts">{t("countsTitle")}</TabsTrigger>}
        </TabsList>
        {canReadTx && (
          <TabsContent value="transactions" className="space-y-3">
            <OptionSelect
              value={txType}
              onChange={(v) => { setTxType(v); setTxPage(1); }}
              allLabel={t("allTypes")}
              options={CASH_TRANSACTION_TYPES.map((k) => ({ value: k, label: t(`txType.${k}`) }))}
              className="w-48"
            />
            <TransactionsTable transactions={txData?.items ?? []} isLoading={txLoading} showBox={false} />
            {(txData?.totalPages ?? 1) > 1 && (
              <Pagination page={txPage} totalPages={txData!.totalPages} total={txData!.total} limit={LIMIT} onPageChange={setTxPage} />
            )}
          </TabsContent>
        )}
        {canReadCounts && (
          <TabsContent value="counts" className="space-y-3">
            <CountsTable counts={countsData?.items ?? []} isLoading={countsLoading} showBox={false} />
            {(countsData?.totalPages ?? 1) > 1 && (
              <Pagination page={countsPage} totalPages={countsData!.totalPages} total={countsData!.total} limit={LIMIT} onPageChange={setCountsPage} />
            )}
          </TabsContent>
        )}
      </Tabs>

      <CashCountDialog open={countOpen} onOpenChange={setCountOpen} defaultBoxId={box.id} />
    </div>
  );
}
