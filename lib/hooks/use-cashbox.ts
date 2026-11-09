import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  cashboxApi, CashTransactionType, CreateCashBoxDto, CreateCashCountDto, DepositDto, DisbursementDto,
  HandoverDto, ReceiptDto, RefillDto, UpdateCashBoxDto,
} from "@/lib/api/cashbox";
import { apiErrorMessage } from "@/lib/api/api-errors";

const K = {
  currencies: "cashbox-currencies",
  boxes: "cashbox-boxes",
  balances: "cashbox-balances",
  transactions: "cashbox-transactions",
  counts: "cashbox-counts",
} as const;

/**
 * Every cashbox write: refresh what it touches, toast success, and on failure
 * show the server's message — it says why (e.g. the amount exceeds the balance).
 */
function useCashMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  invalidate: string[],
  successKey: "saved" | "created" | "done",
) {
  const qc = useQueryClient();
  const t = useTranslations("cashbox.toast");
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
      toast.success(t(successKey));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

// ── Currencies ──
export function useCashCurrencies() {
  return useQuery({ queryKey: [K.currencies], queryFn: cashboxApi.getCurrencies, staleTime: 5 * 60 * 1000 });
}
export function useCreateCashCurrency() {
  return useCashMutation(cashboxApi.createCurrency, [K.currencies], "created");
}

// ── Boxes ──
export function useCashBoxes() {
  return useQuery({ queryKey: [K.boxes], queryFn: cashboxApi.getBoxes });
}
export function useCashBox(id: string) {
  return useQuery({ queryKey: [K.boxes, id], queryFn: () => cashboxApi.getBox(id), enabled: !!id });
}
export function useCashBalances(boxId: string) {
  return useQuery({ queryKey: [K.balances, boxId], queryFn: () => cashboxApi.getBalances(boxId), enabled: !!boxId });
}
export function useCreateCashBox() {
  return useCashMutation((dto: CreateCashBoxDto) => cashboxApi.createBox(dto), [K.boxes], "created");
}
export function useUpdateCashBox() {
  return useCashMutation(
    ({ id, dto }: { id: string; dto: UpdateCashBoxDto }) => cashboxApi.updateBox(id, dto), [K.boxes], "saved",
  );
}
export function useSetMainCashBox() {
  return useCashMutation((id: string) => cashboxApi.setMainBox(id), [K.boxes], "saved");
}

// ── Transactions ──
export function useCashTransactions(params?: {
  cashBoxId?: string; transactionType?: CashTransactionType; page?: number; limit?: number;
}) {
  return useQuery({ queryKey: [K.transactions, params], queryFn: () => cashboxApi.getTransactions(params) });
}

/** One mutation for the four kinds; every one moves balances. */
export type CashMove =
  | { type: "DISBURSEMENT"; dto: DisbursementDto }
  | { type: "RECEIPT"; dto: ReceiptDto }
  | { type: "HANDOVER"; dto: HandoverDto }
  | { type: "REFILL"; dto: RefillDto }
  | { type: "DEPOSIT"; dto: DepositDto };

export function useCreateCashTransaction() {
  return useCashMutation(
    (move: CashMove) => {
      switch (move.type) {
        case "DISBURSEMENT": return cashboxApi.disburse(move.dto);
        case "RECEIPT": return cashboxApi.receive(move.dto);
        case "HANDOVER": return cashboxApi.handover(move.dto);
        case "REFILL": return cashboxApi.refill(move.dto);
        case "DEPOSIT": return cashboxApi.deposit(move.dto);
      }
    },
    [K.transactions, K.balances, K.counts],
    "done",
  );
}

// ── Counts ──
export function useCashCounts(params?: { cashBoxId?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: [K.counts, params], queryFn: () => cashboxApi.getCounts(params) });
}
export function useCreateCashCount() {
  return useCashMutation((dto: CreateCashCountDto) => cashboxApi.createCount(dto), [K.counts], "created");
}
