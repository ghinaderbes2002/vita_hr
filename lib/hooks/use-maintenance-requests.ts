import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  maintenanceRequestsApi,
  CreateMaintenanceData,
  LogisticsData,
} from "@/lib/api/maintenance-requests";

const QK = "maintenance-requests";

export function useMyMaintenanceRequests(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [QK, "my", params],
    queryFn: () => maintenanceRequestsApi.getMy(params),
  });
}

export function useAllMaintenanceRequests(
  params?: { page?: number; limit?: number; status?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [QK, "all", params],
    queryFn: () => maintenanceRequestsApi.getAll(params),
    enabled: options?.enabled ?? true,
  });
}

export function useMyMaintenanceTasks() {
  return useQuery({
    queryKey: [QK, "my-tasks"],
    queryFn: () => maintenanceRequestsApi.getMyTasks(),
  });
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaintenanceData) => maintenanceRequestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تم إرسال طلب الصيانة بنجاح");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "فشل إرسال طلب الصيانة",
      );
    },
  });
}

export function useManagerApproveMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      maintenanceRequestsApi.managerApprove(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تمت الموافقة على الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشلت الموافقة");
    },
  });
}

export function useManagerRejectMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      maintenanceRequestsApi.managerReject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تم رفض الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل الرفض");
    },
  });
}

export function useProcessLogistics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LogisticsData }) =>
      maintenanceRequestsApi.processLogistics(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تمت معالجة الطلب لوجستياً");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشلت المعالجة");
    },
  });
}

export function useExecutiveApproveMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      maintenanceRequestsApi.executiveApprove(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تمت موافقة المدير التنفيذي");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشلت الموافقة");
    },
  });
}

export function useExecutiveRejectMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      maintenanceRequestsApi.executiveReject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تم رفض الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل الرفض");
    },
  });
}

export function useCompleteMaintenanceTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceRequestsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("تم تسجيل إتمام المهمة");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل التسجيل");
    },
  });
}
