import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesCommissionsApi, CreateSalesCommissionDto } from "@/lib/api/sales-commissions";
import { toast } from "sonner";

export function useSalesCommissions(params?: {
  employeeId?: string;
  year?: number;
  month?: number;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["sales-commissions", params],
    queryFn: () => salesCommissionsApi.getAll(params),
  });
}

export function useSalesCommission(id: string) {
  return useQuery({
    queryKey: ["sales-commission", id],
    queryFn: () => salesCommissionsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateSalesCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSalesCommissionDto) =>
      salesCommissionsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-commissions"] });
      toast.success("تم إنشاء العمولة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ أثناء إنشاء العمولة",
      );
    },
  });
}

export function useUpdateSalesCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: Partial<CreateSalesCommissionDto>;
    }) => salesCommissionsApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-commissions"] });
      toast.success("تم تحديث العمولة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ",
      );
    },
  });
}

export function useConfirmSalesCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesCommissionsApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-commissions"] });
      toast.success("تم اعتماد العمولة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ أثناء الاعتماد",
      );
    },
  });
}

export function useDeleteSalesCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesCommissionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-commissions"] });
      toast.success("تم حذف العمولة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ",
      );
    },
  });
}
