import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { warehousePricingApi, SetProstheticPricingDto, ProstheticPartPricing } from "@/lib/api/warehouse-pricing";
import type { PageParams } from "@/lib/api/warehouse-operations";
import { apiErrorMessage } from "@/lib/api/api-errors";

const KEY = "warehouse-pricing-prosthetics";

export function useProstheticsPricing(params?: PageParams & { search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => warehousePricingApi.listProsthetics(params),
  });
}

/**
 * Every priced part by item id — the quotation form uses it to show which lines
 * the server will price itself. Pages of 100 until the end. Off without the
 * view permission: the form then falls back to "leave the price blank".
 */
export function useProstheticsPricingMap(enabled = true) {
  return useQuery({
    queryKey: [KEY, "map"],
    queryFn: async () => {
      const map = new Map<string, ProstheticPartPricing>();
      for (let page = 1; ; page++) {
        const res = await warehousePricingApi.listProsthetics({ page, limit: 100 });
        res.items.forEach((p) => map.set(p.itemId, p));
        if (page >= res.totalPages || res.items.length === 0) break;
      }
      return map;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetProstheticPricing() {
  const qc = useQueryClient();
  const t = useTranslations("warehouse.prostheticsPricing");
  return useMutation({
    mutationFn: ({ itemId, dto }: { itemId: string; dto: SetProstheticPricingDto }) =>
      warehousePricingApi.setProsthetic(itemId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(t("saved"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("saveFailed"))),
  });
}
