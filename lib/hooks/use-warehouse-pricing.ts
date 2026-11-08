import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { warehousePricingApi, SaveProstheticsPricingSettingsDto } from "@/lib/api/warehouse-pricing";
import { apiErrorMessage } from "@/lib/api/api-errors";

const KEY = "warehouse-pricing-prosthetics";

export function useProstheticsPricingSettings(enabled = true) {
  return useQuery({
    queryKey: [KEY, "settings"],
    queryFn: () => warehousePricingApi.getProstheticsSettings(),
    enabled,
  });
}

export function useSaveProstheticsPricingSettings() {
  const qc = useQueryClient();
  const t = useTranslations("warehouse.prostheticsPricing");
  return useMutation({
    mutationFn: (dto: SaveProstheticsPricingSettingsDto) => warehousePricingApi.saveProstheticsSettings(dto),
    onSuccess: (saved) => {
      qc.setQueryData([KEY, "settings"], saved);
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(t("saved"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("saveFailed"))),
  });
}
