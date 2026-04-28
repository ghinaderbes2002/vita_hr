import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestsApi, CreateRequestData } from "@/lib/api/requests";
import { toast } from "sonner";

export function useRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: ["requests", params],
    queryFn: () => requestsApi.getAll(params),
  });
}

export function useMyRequests(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ["requests", "my", params],
    queryFn: () => requestsApi.getMy(params),
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: () => requestsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRequestData) => requestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم إنشاء الطلب بنجاح");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.response?.data?.errors?.[0]?.message
        || JSON.stringify(error.response?.data)
        || "حدث خطأ أثناء إنشاء الطلب";
      toast.error(msg);
      console.error("Create request error:", error.response?.data);
    },
  });
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم تقديم الطلب بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      requestsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم إلغاء الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useManagerApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      requestsApi.managerApprove(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تمت الموافقة على الطلب");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("غير مخوّل للموافقة على هذا الطلب");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useManagerRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      requestsApi.managerReject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم رفض الطلب");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("غير مخوّل لرفض هذا الطلب");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useHrApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      requestsApi.hrApprove(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تمت الموافقة على الطلب من HR");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("غير مخوّل للموافقة على هذا الطلب");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useHrRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      requestsApi.hrReject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم رفض الطلب من HR");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("غير مخوّل لرفض هذا الطلب");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

// ─── Dynamic approval system ───────────────────────────────────────

export function usePendingMyApproval(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["requests", "pending-my-approval", params],
    queryFn: () => requestsApi.getPendingMyApproval(params),
  });
}

export function useRequestApprovals(id: string) {
  return useQuery({
    queryKey: ["request-approvals", id],
    queryFn: () => requestsApi.getApprovals(id),
    enabled: !!id,
  });
}

export function useRequestSteps(id: string) {
  return useQuery({
    queryKey: ["request-steps", id],
    queryFn: () => requestsApi.getSteps(id),
    enabled: !!id,
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      requestsApi.approve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["request"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تمت الموافقة على الطلب");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("غير مخوّل للموافقة على هذا الطلب");
      const code = error.response?.data?.error?.code || error.response?.data?.code;
      if (code === "AUTH_INSUFFICIENT_PERMISSIONS") return toast.error("غير مخوَّل للموافقة على هذه الخطوة");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      requestsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم رفض الطلب");
    },
    onError: (error: any) => {
      if (error.response?.status === 403) return toast.error("غير مخوّل لرفض هذا الطلب");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useSubmitExitInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      requestsApi.exitInterview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["request"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم إرسال استمارة مقابلة الخروج بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useUploadHiringPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      requestsApi.uploadHiringPdf(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم رفع عقد التوظيف بنجاح");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message;
      toast.error(msg || "فشل رفع العقد");
    },
  });
}
