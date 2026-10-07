import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  jobApplicationsApi,
  UpdateJobApplicationData,
} from "@/lib/api/job-applications";
import { toast } from "sonner";

export function useJobApplications(params?: {
  status?: string;
  isTalent?: boolean;
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

// إضافة/إزالة الطلب من قائمة المواهب
export function useSetJobApplicationTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isTalent }: { id: string; isTalent: boolean }) =>
      jobApplicationsApi.setTalent(id, isTalent),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-application", id] });
    },
    onError: (error: any) => {
      if (error.response?.status === 403) {
        toast.error("ليس لديك صلاحية تنفيذ هذه العملية");
      } else {
        toast.error(error.response?.data?.error?.message || "حدث خطأ");
      }
    },
  });
}

const LEGACY_TALENTS_KEY = "job-application-favorites";

// نقل قائمة المواهب القديمة المحفوظة بالمتصفح إلى السيرفر (مرة واحدة)
export function useMigrateLocalTalents(enabled: boolean) {
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    let ids: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(LEGACY_TALENTS_KEY) ?? "[]");
      if (Array.isArray(stored)) ids = stored.filter((x) => typeof x === "string");
    } catch {
      ids = [];
    }
    if (ids.length === 0) {
      localStorage.removeItem(LEGACY_TALENTS_KEY);
      return;
    }

    Promise.allSettled(ids.map((id) => jobApplicationsApi.setTalent(id, true))).then(
      (results) => {
        // 404 = الطلب محذوف، لا داعي لإعادة المحاولة. أي فشل آخر يبقى للمحاولة القادمة.
        const failed = ids.filter((_, i) => {
          const r = results[i];
          return r.status === "rejected" && r.reason?.response?.status !== 404;
        });
        if (failed.length > 0) {
          localStorage.setItem(LEGACY_TALENTS_KEY, JSON.stringify(failed));
        } else {
          localStorage.removeItem(LEGACY_TALENTS_KEY);
        }
        queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      },
    );
  }, [enabled, queryClient]);
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
