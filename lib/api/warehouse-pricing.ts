import { apiClient } from "./client";
import type { Paginated, PageParams } from "./warehouse-operations";

/** Which purchase price a part's selling price is built on. */
export type PriceBasis = "LAST_PURCHASE" | "HIGHEST_PURCHASE";

/** A profit on top of the fixed amount: a percentage of the basis, or a flat sum. */
export type ProfitType = "FIXED" | "PERCENT";

/**
 * A prosthetics part (any item with a partCode, bought or not) and how it is
 * priced: basis + fixed amount + profit, the last two added together.
 */
export interface ProstheticPartPricing {
  itemId: string;
  sku?: string | null;
  partCode?: string | null;
  name?: string | null;
  nameAr?: string | null;
  /** From posted purchase invoices; null for a part never bought. */
  lastPurchasePrice: number | null;
  highestPurchasePrice: number | null;
  priceBasis: PriceBasis;
  /** The fixed amount; 0 until one is set. */
  markupAmount: number;
  /** null = no profit on top. */
  profitType: ProfitType | null;
  /** A percentage for PERCENT, an amount for FIXED. */
  profitValue: number | null;
  /** basis + markupAmount + profit; null while there is no basis (never bought). */
  finalPrice: number | null;
}

export interface SetProstheticPricingDto {
  /** Required, ≥ 0. */
  markupAmount: number;
  /** Left out, the saved basis stays (LAST_PURCHASE the first time). */
  priceBasis?: PriceBasis;
  profitType?: ProfitType;
  profitValue?: number;
}

/** The same sum the server does, for a live preview: basis + fixed amount + profit. */
export function computeFinalPrice(
  basis: number | null, markupAmount: number, profitType: ProfitType | null, profitValue: number | null,
): number | null {
  if (basis == null) return null;
  const profit = !profitType || profitValue == null ? 0
    : profitType === "PERCENT" ? (basis * profitValue) / 100 : profitValue;
  return basis + markupAmount + profit;
}

const BASE = "/warehouse/pricing/prosthetics";

const num = (v: unknown): number | null => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** Decimals may come back as strings; everything numeric is read as a number. */
const normalize = (p: ProstheticPartPricing): ProstheticPartPricing => ({
  ...p,
  lastPurchasePrice: num(p.lastPurchasePrice),
  highestPurchasePrice: num(p.highestPurchasePrice),
  markupAmount: num(p.markupAmount) ?? 0,
  profitType: p.profitType ?? null,
  profitValue: num(p.profitValue),
  finalPrice: num(p.finalPrice),
  priceBasis: p.priceBasis ?? "LAST_PURCHASE",
});

export const warehousePricingApi = {
  listProsthetics: async (
    params?: PageParams & { search?: string },
  ): Promise<Paginated<ProstheticPartPricing>> => {
    const { data } = await apiClient.get(BASE, { params });
    const d = data?.data ?? data;
    const items: ProstheticPartPricing[] = (d?.items ?? (Array.isArray(d) ? d : [])).map(normalize);
    return {
      items,
      page: d?.page ?? 1,
      limit: d?.limit ?? items.length,
      total: d?.total ?? items.length,
      totalPages: d?.totalPages ?? 1,
    };
  },

  setProsthetic: async (itemId: string, dto: SetProstheticPricingDto): Promise<ProstheticPartPricing> => {
    const { data } = await apiClient.put(`${BASE}/${itemId}`, dto);
    return normalize(data?.data ?? data);
  },
};
