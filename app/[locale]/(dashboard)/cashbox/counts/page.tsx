"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCashBoxes, useCashCounts } from "@/lib/hooks/use-cashbox";
import { ALL, OptionSelect } from "@/components/features/warehouse/shared";
import { CountsTable } from "@/components/features/cashbox/cashbox-shared";
import { CashCountDialog } from "@/components/features/cashbox/cashbox-dialogs";

const LIMIT = 20;

export default function CashCountsPage() {
  return (
    <PageGuard permission={PERMISSIONS.CASHBOX.COUNTS_READ}>
      <CashCountsContent />
    </PageGuard>
  );
}

function CashCountsContent() {
  const t = useTranslations("cashbox");
  const { data: boxes = [] } = useCashBoxes();
  const [boxId, setBoxId] = useState(ALL);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCashCounts({ cashBoxId: boxId !== ALL ? boxId : undefined, page, limit: LIMIT });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("countsTitle")}
        description={t("countsDescription")}
        count={data?.total}
        actions={
          <ActionGuard permission={PERMISSIONS.CASHBOX.COUNTS_CREATE}>
            <Button className="gap-2" onClick={() => setOpen(true)}>
              <ClipboardCheck className="h-4 w-4" />
              {t("count.addTitle")}
            </Button>
          </ActionGuard>
        }
      />
      <OptionSelect
        value={boxId}
        onChange={(v) => { setBoxId(v); setPage(1); }}
        allLabel={t("allBoxes")}
        options={boxes.map((b) => ({ value: b.id, label: b.name }))}
        className="w-52"
      />
      <CountsTable counts={data?.items ?? []} isLoading={isLoading} />
      {(data?.totalPages ?? 1) > 1 && (
        <Pagination page={page} totalPages={data!.totalPages} total={data!.total} limit={LIMIT} onPageChange={setPage} />
      )}
      <CashCountDialog open={open} onOpenChange={setOpen} defaultBoxId={boxId !== ALL ? boxId : undefined} />
    </div>
  );
}
