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
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إنشاء الطلب");
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
      toast.error(error.response?.data?.message || "حدث خطأ");
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
      toast.error(error.response?.data?.message || "حدث خطأ");
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
      toast.success("تمت الموافقة على الطلب");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
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
      toast.error(error.response?.data?.message || "حدث خطأ");
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
      toast.success("تمت الموافقة على الطلب من HR");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
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
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
