import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobTitlesApi, CreateJobTitleData, UpdateJobTitleData } from "@/lib/api/job-titles";
import { toast } from "sonner";

export function useJobTitles(params?: { page?: number; limit?: number; gradeId?: string }) {
  return useQuery({
    queryKey: ["job-titles", params],
    queryFn: () => jobTitlesApi.getAll(params),
  });
}

export function useCreateJobTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobTitleData) => jobTitlesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-titles"] });
      toast.success("تم إنشاء المسمى الوظيفي بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إنشاء المسمى الوظيفي");
    },
  });
}

export function useUpdateJobTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobTitleData }) =>
      jobTitlesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-titles"] });
      toast.success("تم تحديث المسمى الوظيفي بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteJobTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobTitlesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-titles"] });
      toast.success("تم حذف المسمى الوظيفي بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
