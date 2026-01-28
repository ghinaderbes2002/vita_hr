import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  attendanceAlertsApi,
  CreateAttendanceAlertData,
  UpdateAttendanceAlertData,
  ResolveAlertData,
  AlertQueryParams,
} from "@/lib/api/attendance-alerts";

export function useMyAlerts(params: AlertQueryParams) {
  return useQuery({
    queryKey: ["attendance-alerts", "my-alerts", params],
    queryFn: () => attendanceAlertsApi.getMyAlerts(params),
  });
}

export function useAttendanceAlerts(params: AlertQueryParams) {
  return useQuery({
    queryKey: ["attendance-alerts", params],
    queryFn: () => attendanceAlertsApi.getAll(params),
  });
}

export function useAttendanceAlert(id: string) {
  return useQuery({
    queryKey: ["attendance-alerts", id],
    queryFn: () => attendanceAlertsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAttendanceAlert() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CreateAttendanceAlertData) => attendanceAlertsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useUpdateAttendanceAlert() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceAlertData }) =>
      attendanceAlertsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useResolveAttendanceAlert() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveAlertData }) =>
      attendanceAlertsApi.resolve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
      toast.success("تم حل التنبيه بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حل التنبيه");
    },
  });
}

export function useDeleteAttendanceAlert() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => attendanceAlertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}
