"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCheck, Crown, Pencil, Plus, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useCashBoxes, useSetMainCashBox } from "@/lib/hooks/use-cashbox";
import type { CashBox } from "@/lib/api/cashbox";
import { BoxBalances, BoxTypeBadge, useCustodianName } from "@/components/features/cashbox/cashbox-shared";
import { CashBoxDialog, CashCountDialog, NewTransactionMenu } from "@/components/features/cashbox/cashbox-dialogs";
import { cn } from "@/lib/utils";

export default function CashBoxesPage() {
  return (
    <PageGuard permission={PERMISSIONS.CASHBOX.BOXES_READ}>
      <CashBoxesContent />
    </PageGuard>
  );
}

function CashBoxesContent() {
  const t = useTranslations("cashbox");
  const locale = useLocale();
  const custodianName = useCustodianName();
  const { data: boxes = [], isLoading } = useCashBoxes();
  const setMain = useSetMainCashBox();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashBox | null>(null);
  const [countOpen, setCountOpen] = useState(false);
  const [mainTarget, setMainTarget] = useState<CashBox | null>(null);

  // The main box first, then the rest; inactive ones last.
  const sorted = [...boxes].sort((a, b) =>
    Number(b.type === "MAIN") - Number(a.type === "MAIN") || Number(b.isActive !== false) - Number(a.isActive !== false));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("boxesTitle")}
        description={t("boxesDescription")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActionGuard permission={PERMISSIONS.CASHBOX.COUNTS_CREATE}>
              <Button variant="outline" className="gap-2" onClick={() => setCountOpen(true)}>
                <ClipboardCheck className="h-4 w-4" />
                {t("count.addTitle")}
              </Button>
            </ActionGuard>
            <ActionGuard permission={PERMISSIONS.CASHBOX.BOXES_MANAGE}>
              <Button variant="outline" className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                {t("box.addTitle")}
              </Button>
            </ActionGuard>
            <ActionGuard permission={PERMISSIONS.CASHBOX.TRANSACTIONS_CREATE}>
              <NewTransactionMenu />
            </ActionGuard>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground" />} title={t("noBoxes")} description={t("noBoxesHint")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((box) => (
            <Card
              key={box.id}
              className={cn("relative transition-shadow hover:shadow-md", box.type === "MAIN" && "border-primary/50", box.isActive === false && "opacity-60")}
            >
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/${locale}/cashbox/${box.id}`} className="min-w-0 after:absolute after:inset-0">
                    <p className="truncate font-semibold">{box.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {custodianName(box)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    {box.isActive === false && <Badge variant="outline" className="text-xs">{t("box.inactive")}</Badge>}
                    <BoxTypeBadge type={box.type} />
                  </div>
                </div>
                <BoxBalances boxId={box.id} className="text-lg" />
                {/* Above the card's full-size link, so these stay clickable. */}
                <ActionGuard permission={PERMISSIONS.CASHBOX.BOXES_MANAGE}>
                  <div className="relative z-10 flex flex-wrap gap-1 border-t pt-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => { setEditing(box); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                      {t("edit")}
                    </Button>
                    {box.type === "SUB" && box.isActive !== false && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setMainTarget(box)}>
                        <Crown className="h-3.5 w-3.5" />
                        {t("box.setMain")}
                      </Button>
                    )}
                  </div>
                </ActionGuard>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CashBoxDialog open={dialogOpen} onOpenChange={setDialogOpen} box={editing} />
      <CashCountDialog open={countOpen} onOpenChange={setCountOpen} />
      <ConfirmDialog
        open={!!mainTarget}
        onOpenChange={(o) => { if (!o) setMainTarget(null); }}
        title={t("box.setMainTitle")}
        description={t("box.setMainDescription", { name: mainTarget?.name ?? "" })}
        onConfirm={() => {
          if (mainTarget) setMain.mutate(mainTarget.id);
          setMainTarget(null);
        }}
      />
    </div>
  );
}
