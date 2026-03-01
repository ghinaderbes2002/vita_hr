import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobGradesApi, CreateJobGradeData, UpdateJobGradeData } from "@/lib/api/job-grades";
import { toast } from "sonner";

export function useJobGrades(params?: { page?: number; limit?: number; isActive?: boolean }) {
  return useQuery({
    queryKey: ["job-grades", params],
    queryFn: () => jobGradesApi.getAll(params),
  });
}

export function useJobGrade(id: string) {
  return useQuery({
    queryKey: ["job-grade", id],
    queryFn: () => jobGradesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobGradeData) => jobGradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-grades"] });
      toast.success("تم إنشاء الدرجة الوظيفية بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إنشاء الدرجة الوظيفية");
    },
  });
}

export function useUpdateJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobGradeData }) =>
      jobGradesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-grades"] });
      toast.success("تم تحديث الدرجة الوظيفية بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobGradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-grades"] });
      toast.success("تم حذف الدرجة الوظيفية بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
