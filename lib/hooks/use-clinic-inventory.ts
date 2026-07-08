import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicInventoryApi, CreateItemDto, InventoryListParams, TransactionType } from "@/lib/api/clinic-inventory";
import { toast } from "sonner";

export function useInventoryCategories() {
  return useQuery({
    queryKey: ["clinic-inventory-categories"],
    queryFn: () => clinicInventoryApi.getCategories(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInventorySuppliers() {
  return useQuery({
    queryKey: ["clinic-inventory-suppliers"],
    queryFn: () => clinicInventoryApi.getSuppliers(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInventoryItems(params?: InventoryListParams) {
  return useQuery({
    queryKey: ["clinic-inventory-items", params],
    queryFn: () => clinicInventoryApi.listItems(params),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["clinic-inventory-item", id],
    queryFn: () => clinicInventoryApi.getItemById(id),
    enabled: !!id,
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ["clinic-inventory-low-stock"],
    queryFn: () => clinicInventoryApi.getLowStockAlerts(),
  });
}

export function useInventoryTransactions(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["clinic-inventory-transactions", params],
    queryFn: () => clinicInventoryApi.getAllTransactions(params),
  });
}

export function useItemHistory(itemId: string) {
  return useQuery({
    queryKey: ["clinic-inventory-item-history", itemId],
    queryFn: () => clinicInventoryApi.getItemHistory(itemId),
    enabled: !!itemId,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateItemDto) => clinicInventoryApi.createItem(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      toast.success("تم إرسال طلب الصنف — بانتظار موافقة المسؤول");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateItemDto> }) =>
      clinicInventoryApi.updateItem(id, dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-item", data.id] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      toast.success("تم تحديث القطعة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicInventoryApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-low-stock"] });
      toast.success("تم حذف الصنف");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حذف الصنف"),
  });
}

export function useImportInventoryExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => clinicInventoryApi.importExcel(file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-low-stock"] });
      if (result.skipped > 0) {
        toast.warning(`تم استيراد ${result.created} صنف، وتخطي ${result.skipped}`);
      } else {
        toast.success(`تم استيراد ${result.created} صنف بنجاح`);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل استيراد الملف"),
  });
}

export function useAddInventoryTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type, quantity, notes, caseId }: { id: string; type: TransactionType; quantity: number; notes?: string; caseId?: string }) =>
      clinicInventoryApi.addTransaction(id, { type, quantity, notes, caseId }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-item", id] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-item-history", id] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-low-stock"] });
      toast.success("تمت العملية");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل العملية"),
  });
}
