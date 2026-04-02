import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deductionPoliciesApi,
  CreateDeductionPolicyData,
} from "@/lib/api/deduction-policies";
import { toast } from "sonner";

export function useDeductionPolicies(all = false) {
  return useQuery({
    queryKey: ["deduction-policies", all],
    queryFn: () => deductionPoliciesApi.getAll(all),
  });
}

export function useCreateDeductionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeductionPolicyData) => deductionPoliciesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deduction-policies"] });
      toast.success("تم إنشاء السياسة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useUpdateDeductionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDeductionPolicyData> }) =>
      deductionPoliciesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deduction-policies"] });
      toast.success("تم تحديث السياسة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteDeductionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deductionPoliciesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deduction-policies"] });
      toast.success("تم حذف السياسة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أو السياسة مستخدمة");
    },
  });
}
