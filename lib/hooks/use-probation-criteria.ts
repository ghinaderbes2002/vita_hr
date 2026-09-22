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

/** The questions an evaluation will include for anyone holding this job title. */
export function useProbationCriteriaByJobTitle(jobTitleId: string) {
  return useQuery({
    queryKey: ["probation-criteria", "by-job-title", jobTitleId],
    queryFn: () => probationCriteriaApi.getByJobTitle(jobTitleId),
    enabled: !!jobTitleId,
  });
}

/** Excludes one question from one job title's evaluations, or brings it back. */
export function useSetCriteriaEnabledForJobTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobTitleId, criteriaId, isEnabled }: { jobTitleId: string; criteriaId: string; isEnabled: boolean }) =>
      probationCriteriaApi.setEnabledForJobTitle(jobTitleId, criteriaId, isEnabled),
    onSuccess: (_data, { isEnabled }) => {
      toast.success(isEnabled ? "تم تفعيل السؤال لهذا المسمى الوظيفي" : "تم استثناء السؤال من هذا المسمى الوظيفي");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
    // Also on failure: the caller flips the switch optimistically, so a refetch
    // is what puts a rejected toggle back where it was.
    onSettled: (_data, _err, { jobTitleId }) => {
      qc.invalidateQueries({ queryKey: ["probation-criteria", "by-job-title", jobTitleId] });
    },
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
