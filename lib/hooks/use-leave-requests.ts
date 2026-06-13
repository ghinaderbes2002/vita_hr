import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  leaveRequestsApi,
  LeaveRequestStatus,
  CreateLeaveRequestData,
  CreateHourlyLeaveData,
  UpdateLeaveRequestData,
  ApproveData,
  RejectData,
  CancelData,
} from "@/lib/api/leave-requests";

// Get my leave requests
export function useMyLeaveRequests(params?: { status?: LeaveRequestStatus; year?: number }) {
  return useQuery({
    queryKey: ["leave-requests", "my", params],
    queryFn: () => leaveRequestsApi.getMyRequests(params),
  });
}

// Get all leave requests (HR/Manager)
export function useLeaveRequests(
  params?: {
    status?: LeaveRequestStatus;
    employeeId?: string;
    managerId?: string;
    year?: number;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["leave-requests", params],
    queryFn: () => leaveRequestsApi.getAll(params),
    enabled: options?.enabled ?? true,
  });
}

// Get leave requests pending the logged-in manager (uses /pending-manager endpoint, no managerId needed)
export function usePendingManagerLeaveRequests(
  params?: { status?: string; page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["leave-requests-pending-manager", params],
    queryFn: () => leaveRequestsApi.getPendingManager(params),
    enabled: options?.enabled ?? true,
  });
}

// Get requests already approved by the logged-in manager
export function useManagerApprovedLeaveRequests(
  params?: { status?: string; page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["leave-requests-manager-approved", params],
    queryFn: () => leaveRequestsApi.getManagerApproved(params),
    enabled: options?.enabled ?? true,
  });
}

// Get single leave request
export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: ["leave-requests", id],
    queryFn: () => leaveRequestsApi.getById(id),
    enabled: !!id,
  });
}

// Create leave request
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CreateLeaveRequestData) => leaveRequestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message
        || error.response?.data?.message
        || t("messages.saveError");
      if (msg?.includes("استنفدت الحد الأقصى للإجازة المرضية")) {
        toast.error(msg, {
          description: "هل تريد تقديم إجازة بدون راتب بدلاً منها؟",
          action: {
            label: "طلب إجازة بدون راتب",
            onClick: () => {
              if (typeof window !== "undefined") {
                window.location.href = "/leaves/new-request?type=UNPAID";
              }
            },
          },
          duration: 8000,
        });
      } else {
        toast.error(msg);
      }
    },
  });
}

// Update leave request
export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveRequestData }) =>
      leaveRequestsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.saveError"));
    },
  });
}

// Submit leave request
export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => leaveRequestsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم إرسال الطلب للموافقة");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل إرسال الطلب");
    },
  });
}

// Approve manager
export function useApproveManager() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveData }) =>
      leaveRequestsApi.approveManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("تمت الموافقة على الطلب");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("أنت لست المدير المباشر لهذا الموظف");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشلت الموافقة");
    },
  });
}

// Reject manager
export function useRejectManager() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectData }) =>
      leaveRequestsApi.rejectManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("تم رفض الطلب");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("أنت لست المدير المباشر لهذا الموظف");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل الرفض");
    },
  });
}

// Approve HR
export function useApproveHr() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveData }) =>
      leaveRequestsApi.approveHr(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تمت الموافقة النهائية على الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشلت الموافقة");
    },
  });
}

// Reject HR
export function useRejectHr() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectData }) =>
      leaveRequestsApi.rejectHr(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم رفض الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل الرفض");
    },
  });
}

// Cancel leave request
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelData }) =>
      leaveRequestsApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم إلغاء الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "فشل الإلغاء");
    },
  });
}

// Delete leave request
export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => leaveRequestsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.deleteError"));
    },
  });
}

// Get requests pending MY substitute approval
export function usePendingSubstituteRequests() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["leave-requests", "pending-substitute", user?.id],
    queryFn: () => leaveRequestsApi.getPendingSubstitute(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    enabled: !!user?.id,
  });
}

// Calculate used/pending hourly leave hours this month for a specific leave type
export function useMyHourlyUsedHours(leaveTypeId: string | undefined) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return useQuery({
    queryKey: ["leave-requests", "my", "hourly-stats", leaveTypeId, year, month],
    queryFn: async () => {
      const res = await leaveRequestsApi.getMyRequests({ leaveTypeId, isHourlyLeave: true });
      const items: any[] = (res as any)?.data?.items || (res as any)?.items || (res as any)?.data || [];
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      let usedHours = 0;
      let pendingHours = 0;
      let deductedHours = 0;

      items.forEach((r: any) => {
        const d = new Date(r.startDate || r.date || r.createdAt);
        if (d < monthStart || d > monthEnd) return;
        const h = r.durationHours ?? 0;
        if (["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(r.status)) {
          usedHours += h;
          if (r.deductionInfo?.overLimitHours) deductedHours += r.deductionInfo.overLimitHours;
        } else if (["PENDING_MANAGER", "PENDING_HR", "MANAGER_APPROVED"].includes(r.status)) {
          pendingHours += h;
        }
      });

      return { usedHours, pendingHours, deductedHours };
    },
    enabled: !!leaveTypeId,
    staleTime: 30_000,
  });
}

// Create hourly leave request
export function useCreateHourlyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHourlyLeaveData) => leaveRequestsApi.createHourly(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم تقديم طلب الإجازة الساعية بنجاح");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message
        || error.response?.data?.message
        || "فشل تقديم طلب الإجازة الساعية";
      toast.error(msg);
    },
  });
}

// Respond as substitute (approve/reject)
export function useSubstituteResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, notes }: { id: string; approved: boolean; notes?: string }) =>
      leaveRequestsApi.substituteResponse(id, { approved, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("تم إرسال ردك بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}
