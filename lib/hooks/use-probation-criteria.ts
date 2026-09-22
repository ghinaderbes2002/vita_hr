import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  probationCriteriaApi,
  CreateProbationCriteriaData,
  UpdateProbationCriteriaData,
} from "@/lib/api/probation-criteria";
import { toast } from "sonner";

export function useProbationCriteria(enabled = true) {
  return useQuery({
    queryKey: ["probation-criteria"],
    queryFn: () => probationCriteriaApi.getAll(),
    enabled,
  });
}

/** Preview of the questions one employee's evaluation will include. */
export function useProbationCriteriaForEmployee(employeeId: string) {
  return useQuery({
    queryKey: ["probation-criteria", { employeeId }],
    queryFn: () => probationCriteriaApi.getAll({ employeeId }),
    enabled: !!employeeId,
  });
}

export function useCreateProbationCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProbationCriteriaData) => probationCriteriaApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["probation-criteria"] });
      toast.success("تمت إضافة السؤال");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useUpdateProbationCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProbationCriteriaData }) =>
      probationCriteriaApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["probation-criteria"] });
      toast.success("تم تعديل السؤال");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useDeleteProbationCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => probationCriteriaApi.delete(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["probation-criteria"] });
      toast.success(result?.deleted ? "تم حذف السؤال نهائياً" : "تم إلغاء تفعيل السؤال (لأنه مستخدم في تقييمات سابقة)");
    },
    onError: (e: any) => {
      toast.error(e.response?.status === 404 ? "لا يمكن حذف سؤال أساسي" : (e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"));
    },
  });
}
