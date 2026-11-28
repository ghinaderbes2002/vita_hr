"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { DateRangeFilter, EMPTY_DATE_FILTER, dateFilterParams, type DateFilterValue } from "@/components/features/cashbox/date-range-filter";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCashBoxes, useCashTransactions } from "@/lib/hooks/use-cashbox";
import { CASH_TRANSACTION_TYPES, CASH_TX_STATUSES, CashTransactionType, CashTxStatus } from "@/lib/api/cashbox";
import { CASH_TX_STATUS_LABEL } from "@/components/features/cashbox/cash-tx-status";
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
  // A notification link opens the list on one reference number: ?search=CB-2026-0001.
  const [search, setSearch] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  // ?status=PENDING_CEO_APPROVAL (the CEO's queue) arrives from a notification link.
  const [status, setStatus] = useState(() => {
    if (typeof window === "undefined") return ALL;
    const s = new URLSearchParams(window.location.search).get("status");
    return s && (CASH_TX_STATUSES as string[]).includes(s) ? s : ALL;
  });
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
  const { data, isLoading } = useCashTransactions({
    cashBoxId: boxId !== ALL ? boxId : undefined,
    transactionType: type !== ALL ? (type as CashTransactionType) : undefined,
    ...dateFilterParams(dates),
    status: status !== ALL ? (status as CashTxStatus) : undefined,
    search: debouncedSearch || undefined,
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
          <NewTransactionMenu />
        }
      />
      <div className="flex flex-wrap gap-3">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث برقم المرجع (CB-…)"
            className="ps-9"
            dir="ltr"
          />
        </div>
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
        <OptionSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          allLabel="كل الحالات"
          options={CASH_TX_STATUSES.map((k) => ({ value: k, label: CASH_TX_STATUS_LABEL[k] }))}
          className="w-52"
        />
        <DateRangeFilter value={dates} onChange={(v) => { setDates(v); setPage(1); }} />
      </div>
      <TransactionsTable transactions={data?.items ?? []} isLoading={isLoading} />
      {(data?.totalPages ?? 1) > 1 && (
        <Pagination page={page} totalPages={data!.totalPages} total={data!.total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
