import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  warehouseApi,
  Clearable,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseUnitDto,
  CreateWarehouseCategoryDto,
  UpdateWarehouseCategoryDto,
  CreateWarehouseSupplierDto,
  UpdateWarehouseSupplierDto,
  CreateWarehouseItemDto,
  UpdateWarehouseItemDto,
  WarehouseItemListParams,
  CreateWarehouseCurrencyDto,
} from "@/lib/api/warehouse";
import { apiErrorMessage } from "@/lib/api/api-errors";

const STALE_TIME = 1000 * 60 * 5;

// Every warehouse mutation reports the same way: a translated success toast,
// and on failure the API's own message (already in Arabic) or a fallback.
function useWarehouseToasts() {
  const t = useTranslations("warehouse.toast");
  return {
    t,
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  };
}

// ── Warehouses ──
export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouse-warehouses"],
    queryFn: () => warehouseApi.getWarehouses(),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (dto: CreateWarehouseDto) => warehouseApi.createWarehouse(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-warehouses"] });
      toast.success(t("created"));
    },
    onError,
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Clearable<UpdateWarehouseDto> }) =>
      warehouseApi.updateWarehouse(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-warehouses"] });
      toast.success(t("updated"));
    },
    onError,
  });
}

// ── Units ──
export function useWarehouseUnits() {
  return useQuery({
    queryKey: ["warehouse-units"],
    queryFn: () => warehouseApi.getUnits(),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarehouseUnit() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (dto: WarehouseUnitDto) => warehouseApi.createUnit(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-units"] });
      toast.success(t("created"));
    },
    onError,
  });
}

export function useUpdateWarehouseUnit() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Clearable<Partial<WarehouseUnitDto>> }) =>
      warehouseApi.updateUnit(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-units"] });
      // Items embed their unit.
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast.success(t("updated"));
    },
    onError,
  });
}

// ── Categories ──
export function useWarehouseCategories() {
  return useQuery({
    queryKey: ["warehouse-categories"],
    queryFn: () => warehouseApi.getCategories(),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarehouseCategory() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (dto: CreateWarehouseCategoryDto) => warehouseApi.createCategory(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-categories"] });
      toast.success(t("created"));
    },
    onError,
  });
}

export function useUpdateWarehouseCategory() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Clearable<UpdateWarehouseCategoryDto> }) =>
      warehouseApi.updateCategory(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-categories"] });
      // Items embed their category.
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast.success(t("updated"));
    },
    onError,
  });
}

// ── Suppliers ──
export function useWarehouseSuppliers() {
  return useQuery({
    queryKey: ["warehouse-suppliers"],
    queryFn: () => warehouseApi.getSuppliers(),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarehouseSupplier() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (dto: CreateWarehouseSupplierDto) => warehouseApi.createSupplier(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-suppliers"] });
      toast.success(t("created"));
    },
    onError,
  });
}

export function useUpdateWarehouseSupplier() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Clearable<UpdateWarehouseSupplierDto> }) =>
      warehouseApi.updateSupplier(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-suppliers"] });
      toast.success(t("updated"));
    },
    onError,
  });
}

// ── Items ──
export function useWarehouseItems(params?: WarehouseItemListParams) {
  return useQuery({
    queryKey: ["warehouse-items", params],
    queryFn: () => warehouseApi.getItems(params),
  });
}

export function useCreateWarehouseItem() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (dto: CreateWarehouseItemDto) => warehouseApi.createItem(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast.success(t("created"));
    },
    onError,
  });
}

export function useUpdateWarehouseItem() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Clearable<UpdateWarehouseItemDto> }) =>
      warehouseApi.updateItem(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast.success(t("updated"));
    },
    onError,
  });
}

export function useDeleteWarehouseItem() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (id: string) => warehouseApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      toast.success(t("deleted"));
    },
    onError,
  });
}

// ── Currencies ──
export function useWarehouseCurrencies() {
  return useQuery({
    queryKey: ["warehouse-currencies"],
    queryFn: () => warehouseApi.getCurrencies(),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarehouseCurrency() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (dto: CreateWarehouseCurrencyDto) => warehouseApi.createCurrency(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-currencies"] });
      toast.success(t("created"));
    },
    onError,
  });
}

export function useSetBaseCurrency() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: (id: string) => warehouseApi.setBaseCurrency(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-currencies"] });
      toast.success(t("baseCurrencySet"));
    },
    onError,
  });
}

export function useExchangeRates(currencyId: string) {
  return useQuery({
    queryKey: ["warehouse-exchange-rates", currencyId],
    queryFn: () => warehouseApi.getExchangeRates(currencyId),
    enabled: !!currencyId,
  });
}

export function useAddExchangeRate() {
  const qc = useQueryClient();
  const { t, onError } = useWarehouseToasts();
  return useMutation({
    mutationFn: ({ currencyId, rate }: { currencyId: string; rate: number }) =>
      warehouseApi.addExchangeRate(currencyId, rate),
    onSuccess: (_data, { currencyId }) => {
      qc.invalidateQueries({ queryKey: ["warehouse-exchange-rates", currencyId] });
      toast.success(t("rateAdded"));
    },
    onError,
  });
}
