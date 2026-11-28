import { apiClient } from "./client";

// Cash boxes: one MAIN box, any number of SUB boxes, each with a separate
// balance per currency. Balances are worked out live from the transactions.
// There is no base currency and no conversion between currencies.

export interface CashCurrency {
  id: string;
  code: string;
  name: string;
}

export type CashBoxType = "MAIN" | "SUB";

export interface CashBox {
  id: string;
  name: string;
  type: CashBoxType;
  custodianEmployeeId?: string | null;
  custodian?: { id: string; firstNameAr?: string; lastNameAr?: string; firstName?: string; lastName?: string } | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface CashBalance {
  currency: CashCurrency;
  balance: number;
}

/**
 * DISBURSEMENT: paid out to an employee. RECEIPT: taken in from a patient or a
 * sales customer. HANDOVER: a sub box hands cash to the main box. REFILL: the
 * main box tops a sub box up. DEPOSIT: cash put in from outside (an opening
 * balance, funding) — no patient or customer; counts like a receipt.
 */
export type CashTransactionType = "DISBURSEMENT" | "RECEIPT" | "HANDOVER" | "REFILL" | "DEPOSIT";
export const CASH_TRANSACTION_TYPES: CashTransactionType[] = ["DEPOSIT", "DISBURSEMENT", "RECEIPT", "HANDOVER", "REFILL"];

/**
 * Only COMPLETED counts in a balance. PENDING_CEO_APPROVAL: a disbursement
 * waiting for the CEO (nothing taken yet). PENDING_RECEIPT: money on its way in
 * — a receipt, or a handover/refill that already left the sender — until the
 * receiving box's custodian confirms it. A rejected receipt returns to the
 * sender by itself.
 */
export type CashTxStatus = "COMPLETED" | "PENDING_CEO_APPROVAL" | "PENDING_RECEIPT" | "REJECTED" | "CANCELLED";
export const CASH_TX_STATUSES: CashTxStatus[] = ["COMPLETED", "PENDING_CEO_APPROVAL", "PENDING_RECEIPT", "REJECTED", "CANCELLED"];

/** Per currency: coming in but not confirmed, and gone out but not confirmed by the receiver. */
export interface CashPendingAmounts {
  incoming: { currency?: CashCurrency | null; currencyCode?: string; amount: number }[];
  outgoing: { currency?: CashCurrency | null; currencyCode?: string; amount: number }[];
}

export interface CashTransaction {
  id: string;
  /** CB-<year>-<4 digits>: readable, unique, never changes. Don't sort by it (text order breaks past 9999). */
  referenceNumber?: string | null;
  transactionType: CashTransactionType;
  cashBoxId: string;
  cashBox?: Pick<CashBox, "id" | "name" | "type"> | null;
  /** The other box of a handover / refill (the main box); null otherwise. */
  relatedCashBoxId?: string | null;
  relatedCashBox?: Pick<CashBox, "id" | "name" | "type"> | null;
  amount: number;
  currencyId: string;
  currency?: CashCurrency | null;
  reason?: string | null;
  targetEmployeeId?: string | null;
  patientId?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  createdByUserId?: string | null;
  /** Missing on an API without states — treated as COMPLETED. */
  status?: CashTxStatus;
  requestedByName?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
  /**
   * Snapshots taken when each side's effect happened, in the transaction's
   * currency. balance* is the row's own box (cashBoxId); counterpart* is the
   * main box on a handover / refill. null until that side happens (pending).
   */
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  counterpartBalanceBefore?: number | null;
  counterpartBalanceAfter?: number | null;
  createdAt: string;
}

export interface CashCount {
  id: string;
  cashBoxId: string;
  cashBox?: Pick<CashBox, "id" | "name" | "type"> | null;
  currencyId: string;
  currency?: CashCurrency | null;
  /** What the transactions say should be there. */
  expectedBalance: number;
  /** What was counted. */
  actualBalance: number;
  /** actual − expected: positive is a surplus, negative a shortage. */
  variance: number;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateCashBoxDto {
  name: string;
  custodianEmployeeId: string;
  /** SUB by default. A new MAIN box turns the old one into a SUB. */
  type?: CashBoxType;
}

export interface UpdateCashBoxDto {
  name?: string;
  custodianEmployeeId?: string;
  isActive?: boolean;
}

interface MoveBase {
  cashBoxId: string;
  amount: number;
  currencyId: string;
  /** Required on every transaction. */
  reason: string;
}
/** requiresCeoApproval: held (nothing taken) until the CEO approves. */
export type DisbursementDto = MoveBase & { targetEmployeeId: string; requiresCeoApproval?: boolean };
/** Exactly one of patientId / customerId. */
export type ReceiptDto = MoveBase & ({ patientId: string; customerId?: never } | { customerId: string; patientId?: never });
/** cashBoxId is the SUB box; the main box is found by the server. */
export type HandoverDto = MoveBase;
/** cashBoxId is the SUB box being topped up from the main box. */
export type RefillDto = MoveBase;
/** Any box; no patient or customer. */
export type DepositDto = MoveBase;

export interface CreateCashCountDto {
  cashBoxId: string;
  currencyId: string;
  actualBalance: number;
  notes?: string;
}

const BASE = "/cashbox";

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
const unwrap = <T,>(data: unknown): T => ((data as { data?: T })?.data ?? data) as T;
const list = <T,>(data: unknown): T[] => {
  const d = unwrap<unknown>(data) as { items?: T[] } | T[];
  return Array.isArray(d) ? d : d?.items ?? [];
};
function paged<T>(data: unknown, map: (x: T) => T): Paged<T> {
  const d = unwrap<Partial<Paged<T>> | T[]>(data);
  if (Array.isArray(d)) return { items: d.map(map), page: 1, limit: d.length, total: d.length, totalPages: 1 };
  const items = (d?.items ?? []).map(map);
  return {
    items,
    page: d?.page ?? 1,
    limit: d?.limit ?? items.length,
    total: d?.total ?? items.length,
    totalPages: d?.totalPages ?? 1,
  };
}

// Amounts may come back as decimal strings.
const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number(v));
const normTx = (t: CashTransaction): CashTransaction => ({
  ...t,
  amount: num(t.amount),
  balanceBefore: numOrNull(t.balanceBefore),
  balanceAfter: numOrNull(t.balanceAfter),
  counterpartBalanceBefore: numOrNull(t.counterpartBalanceBefore),
  counterpartBalanceAfter: numOrNull(t.counterpartBalanceAfter),
});
const normCount = (c: CashCount): CashCount => ({
  ...c,
  expectedBalance: num(c.expectedBalance),
  actualBalance: num(c.actualBalance),
  variance: num(c.variance),
});

export const cashboxApi = {
  // ── Currencies ──
  getCurrencies: async (): Promise<CashCurrency[]> => list<CashCurrency>((await apiClient.get(`${BASE}/currencies`)).data),
  createCurrency: async (dto: { code: string; name: string }): Promise<CashCurrency> =>
    unwrap((await apiClient.post(`${BASE}/currencies`, dto)).data),

  // ── Boxes ──
  getBoxes: async (): Promise<CashBox[]> => list<CashBox>((await apiClient.get(`${BASE}/boxes`)).data),
  getBox: async (id: string): Promise<CashBox> => unwrap((await apiClient.get(`${BASE}/boxes/${id}`)).data),
  createBox: async (dto: CreateCashBoxDto): Promise<CashBox> => unwrap((await apiClient.post(`${BASE}/boxes`, dto)).data),
  updateBox: async (id: string, dto: UpdateCashBoxDto): Promise<CashBox> =>
    unwrap((await apiClient.patch(`${BASE}/boxes/${id}`, dto)).data),
  setMainBox: async (id: string): Promise<CashBox> => unwrap((await apiClient.post(`${BASE}/boxes/${id}/set-main`)).data),
  getBalances: async (id: string): Promise<CashBalance[]> =>
    list<CashBalance>((await apiClient.get(`${BASE}/boxes/${id}/balances`)).data).map((b) => ({ ...b, balance: num(b.balance) })),

  // ── Transactions ──
  getTransactions: async (params?: {
    cashBoxId?: string; transactionType?: CashTransactionType; page?: number; limit?: number;
    /** Inclusive days, yyyy-mm-dd; the same date in both picks one day. */
    dateFrom?: string; dateTo?: string;
    /** An unknown value is a 400, not ignored. */
    status?: CashTxStatus;
    /** Part of a reference number, any case (CB-2026-0001, "2026-00"). */
    search?: string;
  }): Promise<Paged<CashTransaction>> =>
    paged((await apiClient.get(`${BASE}/transactions`, { params })).data, normTx),

  // ── Decisions on a pending transaction ──
  /** Takes the money and completes it; 400 if the balance no longer covers it. */
  ceoApprove: async (id: string): Promise<CashTransaction> =>
    unwrap((await apiClient.patch(`${BASE}/transactions/${id}/ceo-approve`)).data),
  ceoReject: async (id: string, reason: string): Promise<CashTransaction> =>
    unwrap((await apiClient.patch(`${BASE}/transactions/${id}/ceo-reject`, { reason })).data),
  /** Only whoever recorded it, before the decision. */
  cancel: async (id: string): Promise<CashTransaction> =>
    unwrap((await apiClient.patch(`${BASE}/transactions/${id}/cancel`)).data),
  /** The receiving box's custodian (or cashbox.boxes.manage). */
  confirmReceipt: async (id: string): Promise<CashTransaction> =>
    unwrap((await apiClient.patch(`${BASE}/transactions/${id}/confirm-receipt`)).data),
  rejectReceipt: async (id: string, reason: string): Promise<CashTransaction> =>
    unwrap((await apiClient.patch(`${BASE}/transactions/${id}/reject-receipt`, { reason })).data),
  /**
   * A bare array, one row per currency with anything pending (none → []):
   * `{ currency, awaitingReceipt, inTransit }`. awaitingReceipt is coming in and
   * not yet in the balance; inTransit has already left it — never add it back.
   */
  getPending: async (boxId: string): Promise<CashPendingAmounts> => {
    const rows = list<{ currency?: CashCurrency | null; awaitingReceipt?: unknown; inTransit?: unknown }>(
      (await apiClient.get(`${BASE}/boxes/${boxId}/pending`)).data,
    );
    return {
      incoming: rows.map((r) => ({ currency: r.currency, amount: num(r.awaitingReceipt) })).filter((r) => r.amount),
      outgoing: rows.map((r) => ({ currency: r.currency, amount: num(r.inTransit) })).filter((r) => r.amount),
    };
  },
  disburse: async (dto: DisbursementDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/disbursement`, dto)).data),
  receive: async (dto: ReceiptDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/receipt`, dto)).data),
  handover: async (dto: HandoverDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/handover`, dto)).data),
  refill: async (dto: RefillDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/refill`, dto)).data),
  /** Needs cashbox.transactions.deposit. */
  deposit: async (dto: DepositDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/deposit`, dto)).data),

  // ── Counts ──
  getCounts: async (params?: { cashBoxId?: string; page?: number; limit?: number }): Promise<Paged<CashCount>> =>
    paged((await apiClient.get(`${BASE}/counts`, { params })).data, normCount),
  createCount: async (dto: CreateCashCountDto): Promise<CashCount> =>
    normCount(unwrap((await apiClient.post(`${BASE}/counts`, dto)).data)),
};
