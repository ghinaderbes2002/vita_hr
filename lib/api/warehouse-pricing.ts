import { apiClient } from "./client";

/** Which purchase price a part's selling price is built on. */
export type PriceBasis = "LAST_PURCHASE" | "HIGHEST_PURCHASE";

/** A profit on top of the fixed amount: a percentage of the basis, or a flat sum. */
export type ProfitType = "FIXED" | "PERCENT";

/**
 * The one pricing rule for every prosthetics part (any item with a partCode).
 * A quotation line for a part is priced as: that part's own last or highest
 * purchase price + markupAmount + profit. A part never bought has no basis and
 * is priced by hand.
 */
export interface ProstheticsPricingSettings {
  /** null while the settings were never saved. */
  id: string | null;
  priceBasis: PriceBasis;
  /** The fixed amount; added together with the profit, not instead of it. */
  markupAmount: number;
  /** null = no profit on top. */
  profitType: ProfitType | null;
  /** A percentage for PERCENT, an amount for FIXED. */
  profitValue: number | null;
  updatedByUserId?: string | null;
  updatedAt?: string | null;
}

export interface SaveProstheticsPricingSettingsDto {
  /** Required, ≥ 0. */
  markupAmount: number;
  priceBasis?: PriceBasis;
  profitType?: ProfitType;
  profitValue?: number;
}

/** The same sum the server does, for a worked example: basis + fixed amount + profit. */
export function computeFinalPrice(
  basis: number | null, markupAmount: number, profitType: ProfitType | null, profitValue: number | null,
): number | null {
  if (basis == null) return null;
  const profit = !profitType || profitValue == null ? 0
    : profitType === "PERCENT" ? (basis * profitValue) / 100 : profitValue;
  return basis + markupAmount + profit;
}

const URL = "/warehouse/pricing/prosthetics/settings";

const num = (v: unknown): number | null => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** Decimals may come back as strings; everything numeric is read as a number. */
const normalize = (s: Partial<ProstheticsPricingSettings> | null | undefined): ProstheticsPricingSettings => ({
  id: s?.id ?? null,
  priceBasis: s?.priceBasis ?? "LAST_PURCHASE",
  markupAmount: num(s?.markupAmount) ?? 0,
  profitType: s?.profitType ?? null,
  profitValue: num(s?.profitValue),
  updatedByUserId: s?.updatedByUserId ?? null,
  updatedAt: s?.updatedAt ?? null,
});

export const warehousePricingApi = {
  getProstheticsSettings: async (): Promise<ProstheticsPricingSettings> => {
    const { data } = await apiClient.get(URL);
    return normalize(data?.data ?? data);
  },

  saveProstheticsSettings: async (dto: SaveProstheticsPricingSettingsDto): Promise<ProstheticsPricingSettings> => {
    const { data } = await apiClient.put(URL, dto);
    return normalize(data?.data ?? data);
  },
};
