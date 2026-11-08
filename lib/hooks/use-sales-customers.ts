import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  salesCustomersApi,
  CreateSalesCustomerDto,
  SalesCustomerParams,
  UpdateSalesCustomerDto,
} from "@/lib/api/sales-customers";

const KEY = "sales-customers";

type ApiError = { response?: { data?: { message?: string } } };
const messageOf = (e: unknown, fallback: string) => (e as ApiError)?.response?.data?.message || fallback;

export function useSalesCustomers(params?: SalesCustomerParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => salesCustomersApi.list(params),
    enabled,
  });
}

export function useCreateSalesCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSalesCustomerDto) => salesCustomersApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تمت إضافة العميل");
    },
    onError: (e: unknown) => toast.error(messageOf(e, "فشل الإضافة")),
  });
}

export function useUpdateSalesCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSalesCustomerDto }) => salesCustomersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تم تحديث بيانات العميل");
    },
    onError: (e: unknown) => toast.error(messageOf(e, "فشل التحديث")),
  });
}

export function useDeleteSalesCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesCustomersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تم حذف العميل");
    },
    onError: (e: unknown) => toast.error(messageOf(e, "فشل الحذف")),
  });
}
