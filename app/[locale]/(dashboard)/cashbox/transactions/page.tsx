"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCashBoxes, useCashTransactions } from "@/lib/hooks/use-cashbox";
import { CASH_TRANSACTION_TYPES, CashTransactionType } from "@/lib/api/cashbox";
import { ALL, OptionSelect } from "@/components/features/warehouse/shared";
import { TransactionsTable } from "@/components/features/cashbox/cashbox-shared";
import { NewTransactionMenu } from "@/components/features/cashbox/cashbox-dialogs";

const LIMIT = 20;

export default function CashTransactionsPage() {
  return (
    <PageGuard permission={PERMISSIONS.CASHBOX.TRANSACTIONS_READ}>
      <CashTransactionsContent />
    </PageGuard>
  );
}

function CashTransactionsContent() {
  const t = useTranslations("cashbox");
  const { data: boxes = [] } = useCashBoxes();
  const [boxId, setBoxId] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCashTransactions({
    cashBoxId: boxId !== ALL ? boxId : undefined,
    transactionType: type !== ALL ? (type as CashTransactionType) : undefined,
    page,
    limit: LIMIT,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transactionsTitle")}
        description={t("transactionsDescription")}
        count={data?.total}
        actions={
          <ActionGuard permission={PERMISSIONS.CASHBOX.TRANSACTIONS_CREATE}>
            <NewTransactionMenu />
          </ActionGuard>
        }
      />
      <div className="flex flex-wrap gap-3">
        <OptionSelect
          value={boxId}
          onChange={(v) => { setBoxId(v); setPage(1); }}
          allLabel={t("allBoxes")}
          options={boxes.map((b) => ({ value: b.id, label: b.name }))}
          className="w-52"
        />
        <OptionSelect
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          allLabel={t("allTypes")}
          options={CASH_TRANSACTION_TYPES.map((k) => ({ value: k, label: t(`txType.${k}`) }))}
          className="w-48"
        />
      </div>
      <TransactionsTable transactions={data?.items ?? []} isLoading={isLoading} />
      {(data?.totalPages ?? 1) > 1 && (
        <Pagination page={page} totalPages={data!.totalPages} total={data!.total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
