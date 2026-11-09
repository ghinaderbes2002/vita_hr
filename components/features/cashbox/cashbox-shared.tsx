"use client";

import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useCashBalances } from "@/lib/hooks/use-cashbox";
import type { CashBox, CashBoxType, CashCount, CashTransaction, CashTransactionType } from "@/lib/api/cashbox";
import { ClientName } from "@/components/features/warehouse/patient-combobox";
import { useWarehouseFormat } from "@/components/features/warehouse/shared";
import { cn } from "@/lib/utils";

/** An employee's Arabic name by id, from the shared basic list. */
export function useEmployeeName() {
  const { data } = useEmployeesBasicList();
  const employees = Array.isArray(data) ? data : [];
  return (id?: string | null) => {
    if (!id) return "—";
    const e = employees.find((x) => x.id === id || x.userId === id);
    return e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() || "—" : "—";
  };
}

/** The custodian's name: embedded on the box when the API sends it, else looked up. */
export function useCustodianName() {
  const nameOf = useEmployeeName();
  return (box: Pick<CashBox, "custodian" | "custodianEmployeeId">) => {
    const c = box.custodian;
    const embedded = c ? `${c.firstNameAr ?? c.firstName ?? ""} ${c.lastNameAr ?? c.lastName ?? ""}`.trim() : "";
    return embedded || nameOf(box.custodianEmployeeId);
  };
}

export function BoxTypeBadge({ type }: { type: CashBoxType }) {
  const t = useTranslations("cashbox");
  return (
    <Badge variant="outline" className={cn("text-xs", type === "MAIN" ? "border-primary/40 bg-primary/10 text-primary" : "")}>
      {type === "MAIN" ? t("boxType.MAIN") : t("boxType.SUB")}
    </Badge>
  );
}

const TX_STYLE: Record<CashTransactionType, { cls: string; icon: typeof Wallet }> = {
  DISBURSEMENT: { cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300", icon: ArrowUpRight },
  RECEIPT: { cls: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300", icon: ArrowDownLeft },
  HANDOVER: { cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300", icon: ArrowLeftRight },
  REFILL: { cls: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300", icon: ArrowLeftRight },
};

export function TxTypeBadge({ type }: { type: CashTransactionType }) {
  const t = useTranslations("cashbox");
  const s = TX_STYLE[type] ?? TX_STYLE.HANDOVER;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", s.cls)}>
      <Icon className="h-3 w-3" />
      {t(`txType.${type}`)}
    </Badge>
  );
}

/** One line per currency; each currency's balance stands alone (no conversion). */
export function BoxBalances({ boxId, className }: { boxId: string; className?: string }) {
  const t = useTranslations("cashbox");
  const fmt = useWarehouseFormat();
  const { data: balances, isLoading } = useCashBalances(boxId);
  if (isLoading) return <Skeleton className={cn("h-6 w-32", className)} />;
  const shown = (balances ?? []).filter((b) => b.balance !== 0);
  if (shown.length === 0) return <p className={cn("text-sm text-muted-foreground", className)}>{t("noBalance")}</p>;
  return (
    <div className={cn("space-y-0.5", className)}>
      {shown.map((b) => (
        <p key={b.currency.id} className={cn("tabular-nums font-semibold", b.balance < 0 && "text-destructive")}>
          {fmt.money(b.balance, b.currency.code)}
        </p>
      ))}
    </div>
  );
}

/** Who the money went to or came from. */
function Counterpart({ tx }: { tx: CashTransaction }) {
  const t = useTranslations("cashbox");
  const nameOf = useEmployeeName();
  if (tx.transactionType === "DISBURSEMENT") return <>{nameOf(tx.targetEmployeeId)}</>;
  if (tx.transactionType === "RECEIPT") {
    return <ClientName patientId={tx.patientId} customerId={tx.customerId} customer={tx.customer} />;
  }
  // Moves between boxes: the other end is always the main box.
  return <span className="text-muted-foreground">{t("mainBox")}</span>;
}

export function TransactionsTable({
  transactions, isLoading, showBox = true,
}: {
  transactions: CashTransaction[];
  isLoading?: boolean;
  /** Off on a single box's page, where the box is already known. */
  showBox?: boolean;
}) {
  const t = useTranslations("cashbox");
  const fmt = useWarehouseFormat();
  const columns = showBox ? 7 : 6;
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.date")}</TableHead>
            <TableHead>{t("fields.type")}</TableHead>
            {showBox && <TableHead>{t("fields.box")}</TableHead>}
            <TableHead>{t("fields.amount")}</TableHead>
            <TableHead>{t("fields.counterpart")}</TableHead>
            <TableHead>{t("fields.reason")}</TableHead>
            <TableHead>{t("fields.reference")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns}>
                <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground" />} title={t("noTransactions")} />
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.dateTime(tx.createdAt)}</TableCell>
                <TableCell><TxTypeBadge type={tx.transactionType} /></TableCell>
                {showBox && <TableCell className="text-sm">{tx.cashBox?.name ?? "—"}</TableCell>}
                <TableCell className="whitespace-nowrap font-semibold tabular-nums">
                  {fmt.money(tx.amount, tx.currency?.code)}
                </TableCell>
                <TableCell className="text-sm"><Counterpart tx={tx} /></TableCell>
                <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={tx.reason ?? undefined}>
                  {tx.reason || "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{tx.id.slice(0, 8)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function CountsTable({
  counts, isLoading, showBox = true,
}: {
  counts: CashCount[];
  isLoading?: boolean;
  showBox?: boolean;
}) {
  const t = useTranslations("cashbox");
  const fmt = useWarehouseFormat();
  const columns = showBox ? 6 : 5;
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.date")}</TableHead>
            {showBox && <TableHead>{t("fields.box")}</TableHead>}
            <TableHead>{t("fields.expected")}</TableHead>
            <TableHead>{t("fields.actual")}</TableHead>
            <TableHead>{t("fields.variance")}</TableHead>
            <TableHead>{t("fields.notes")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : counts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns}>
                <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground" />} title={t("noCounts")} />
              </TableCell>
            </TableRow>
          ) : (
            counts.map((c) => {
              const code = c.currency?.code;
              return (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt.dateTime(c.createdAt)}</TableCell>
                  {showBox && <TableCell className="text-sm">{c.cashBox?.name ?? "—"}</TableCell>}
                  <TableCell className="tabular-nums">{fmt.money(c.expectedBalance, code)}</TableCell>
                  <TableCell className="tabular-nums">{fmt.money(c.actualBalance, code)}</TableCell>
                  <TableCell>
                    <VarianceBadge variance={c.variance} code={code} />
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={c.notes ?? undefined}>
                    {c.notes || "—"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** Positive is a surplus, negative a shortage, zero matches. */
export function VarianceBadge({ variance, code }: { variance: number; code?: string | null }) {
  const t = useTranslations("cashbox");
  const fmt = useWarehouseFormat();
  if (variance === 0) {
    return <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700">{t("variance.match")}</Badge>;
  }
  const surplus = variance > 0;
  return (
    <Badge
      variant="outline"
      className={cn("text-xs tabular-nums", surplus ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700")}
    >
      {surplus ? t("variance.surplus") : t("variance.shortage")} {fmt.money(Math.abs(variance), code)}
    </Badge>
  );
}
