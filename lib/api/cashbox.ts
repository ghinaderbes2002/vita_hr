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
 * main box tops a sub box up.
 */
export type CashTransactionType = "DISBURSEMENT" | "RECEIPT" | "HANDOVER" | "REFILL";
export const CASH_TRANSACTION_TYPES: CashTransactionType[] = ["DISBURSEMENT", "RECEIPT", "HANDOVER", "REFILL"];

export interface CashTransaction {
  id: string;
  transactionType: CashTransactionType;
  cashBoxId: string;
  cashBox?: Pick<CashBox, "id" | "name" | "type"> | null;
  amount: number;
  currencyId: string;
  currency?: CashCurrency | null;
  reason?: string | null;
  targetEmployeeId?: string | null;
  patientId?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  createdByUserId?: string | null;
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
export type DisbursementDto = MoveBase & { targetEmployeeId: string };
/** Exactly one of patientId / customerId. */
export type ReceiptDto = MoveBase & ({ patientId: string; customerId?: never } | { customerId: string; patientId?: never });
/** cashBoxId is the SUB box; the main box is found by the server. */
export type HandoverDto = MoveBase;
/** cashBoxId is the SUB box being topped up from the main box. */
export type RefillDto = MoveBase;

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
const normTx = (t: CashTransaction): CashTransaction => ({ ...t, amount: num(t.amount) });
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
  }): Promise<Paged<CashTransaction>> =>
    paged((await apiClient.get(`${BASE}/transactions`, { params })).data, normTx),
  disburse: async (dto: DisbursementDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/disbursement`, dto)).data),
  receive: async (dto: ReceiptDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/receipt`, dto)).data),
  handover: async (dto: HandoverDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/handover`, dto)).data),
  refill: async (dto: RefillDto): Promise<CashTransaction> =>
    unwrap((await apiClient.post(`${BASE}/transactions/refill`, dto)).data),

  // ── Counts ──
  getCounts: async (params?: { cashBoxId?: string; page?: number; limit?: number }): Promise<Paged<CashCount>> =>
    paged((await apiClient.get(`${BASE}/counts`, { params })).data, normCount),
  createCount: async (dto: CreateCashCountDto): Promise<CashCount> =>
    normCount(unwrap((await apiClient.post(`${BASE}/counts`, dto)).data)),
};
