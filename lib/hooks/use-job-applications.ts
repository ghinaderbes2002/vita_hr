import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  jobApplicationsApi,
  UpdateJobApplicationData,
} from "@/lib/api/job-applications";
import { toast } from "sonner";

export function useJobApplications(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["job-applications", params],
    queryFn: () => jobApplicationsApi.getAll(params),
  });
}

export function useJobApplicationStats() {
  return useQuery({
    queryKey: ["job-applications-stats"],
    queryFn: () => jobApplicationsApi.getStats(),
  });
}

export function useJobApplication(id: string) {
  return useQuery({
    queryKey: ["job-application", id],
    queryFn: () => jobApplicationsApi.getById(id),
    enabled: !!id,
  });
}

export function useUpdateJobApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateJobApplicationData;
    }) => jobApplicationsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications-stats"] });
      queryClient.invalidateQueries({ queryKey: ["job-application", id] });
      toast.success("تم تحديث الطلب بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || "حدث خطأ");
    },
  });
}

// موافقة المدير التنفيذي
export function useApproveJobApplicationCEO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobApplicationsApi.ceoApprove(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications-stats"] });
      queryClient.invalidateQueries({ queryKey: ["job-application", id] });
      toast.success("تم الموافقة على الطلب بنجاح");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) {
        toast.error("ليس لديك صلاحية تنفيذ هذه العملية");
      } else {
        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error?.message ||
            "حدث خطأ",
        );
      }
    },
  });
}
