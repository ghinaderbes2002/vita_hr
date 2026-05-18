import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salaryAdvancesApi, CreateSalaryAdvanceDto } from "@/lib/api/salary-advances";
import { toast } from "sonner";

export function useSalaryAdvances(params?: {
  employeeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["salary-advances", params],
    queryFn: () => salaryAdvancesApi.getAll(params),
  });
}

export function useSalaryAdvance(id: string) {
  return useQuery({
    queryKey: ["salary-advance", id],
    queryFn: () => salaryAdvancesApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSalaryAdvanceDto) =>
      salaryAdvancesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      toast.success("تم إنشاء السلفة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ أثناء إنشاء السلفة",
      );
    },
  });
}

export function useUpdateSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: Partial<CreateSalaryAdvanceDto>;
    }) => salaryAdvancesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      toast.success("تم تحديث السلفة");
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

export function useCancelSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      salaryAdvancesApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      queryClient.invalidateQueries({ queryKey: ["salary-advance"] });
      toast.success("تم إلغاء السلفة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ أثناء الإلغاء",
      );
    },
  });
}

export function useDeleteSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salaryAdvancesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      toast.success("تم حذف السلفة");
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
