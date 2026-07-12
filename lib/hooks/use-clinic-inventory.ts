import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicInventoryApi, CreateItemDto, InventoryListParams, ItemRequestStatus, TransactionType } from "@/lib/api/clinic-inventory";
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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      toast.success(variables.isRequest ? "تم إرسال طلب الصنف — بانتظار موافقة المسؤول" : "تمت إضافة الصنف");
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

// True when APPROVED was rejected because the requested part has no matching
// inventory item yet — the admin must add it to the catalog first. Callers use
// this to open the "add new item" dialog instead of showing an error toast.
export function isItemNotInInventoryError(e: any): boolean {
  const code = e?.response?.data?.code;
  const msg: string = e?.response?.data?.message ?? "";
  return code === "ITEM_NOT_IN_INVENTORY" || code === "ITEM_NOT_FOUND" || /غير موجود في المخزون/.test(msg);
}

export function useReviewItemRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes, linkedInventoryItemId }: { id: string; status: ItemRequestStatus; notes?: string; linkedInventoryItemId?: string }) =>
      clinicInventoryApi.reviewRequest(id, { status, notes, linkedInventoryItemId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
      qc.invalidateQueries({ queryKey: ["clinic-inventory-low-stock"] });
      toast.success("تم تحديث حالة الطلب");
    },
    onError: (e: any) => {
      // Backend rejects APPROVED when stock is zero / item missing (400).
      // Guide the admin to pick «لا يوجد» (NOT_AVAILABLE) instead of just echoing the raw message.
      if (e?.response?.data?.code === "INSUFFICIENT_STOCK") {
        toast.error("لا يمكن اعتماد الطلب — المخزون غير كافٍ. يرجى اختيار «لا يوجد» بدلاً من الاعتماد.", {
          duration: 6000,
        });
        return;
      }
      // "Item not in inventory" also opens the add-item dialog at the call
      // site; we still show the backend message here so both appear together.
      toast.error(e?.response?.data?.message || "فشل تحديث الطلب");
    },
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
