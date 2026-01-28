import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  leaveRequestsApi,
  LeaveRequestStatus,
  CreateLeaveRequestData,
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
export function useLeaveRequests(params?: {
  status?: LeaveRequestStatus;
  employeeId?: string;
  year?: number;
}) {
  return useQuery({
    queryKey: ["leave-requests", params],
    queryFn: () => leaveRequestsApi.getAll(params),
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
      toast.error(error.response?.data?.message || t("messages.saveError"));
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
      toast.error(error.response?.data?.message || t("messages.saveError"));
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
      toast.error(error.response?.data?.message || "فشل إرسال الطلب");
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
      toast.error(error.response?.data?.message || "فشلت الموافقة");
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
      toast.error(error.response?.data?.message || "فشل الرفض");
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
      toast.error(error.response?.data?.message || "فشلت الموافقة");
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
      toast.error(error.response?.data?.message || "فشل الرفض");
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
      toast.error(error.response?.data?.message || "فشل الإلغاء");
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
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}
