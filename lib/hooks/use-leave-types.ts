import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveTypesApi, CreateLeaveTypeData, UpdateLeaveTypeData } from "@/lib/api/leave-types";
import { PaginationParams } from "@/types";
import { toast } from "sonner";

export function useLeaveTypes(params?: PaginationParams & { active?: boolean }) {
  return useQuery({
    queryKey: ["leave-types", params],
    queryFn: async () => {
      console.log("useLeaveTypes: Calling API with params:", params);
      const result = await leaveTypesApi.getAll(params);
      console.log("useLeaveTypes: API returned:", result);
      return result;
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });
}

export function useActiveLeaveTypes() {
  return useQuery({
    queryKey: ["leave-types", "active"],
    queryFn: () => leaveTypesApi.getActive(),
  });
}

export function useLeaveType(id: string) {
  return useQuery({
    queryKey: ["leave-type", id],
    queryFn: () => leaveTypesApi.getById(id),
    enabled: !!id,
  });
}

export function useLeaveTypeByCode(code: string) {
  return useQuery({
    queryKey: ["leave-type", "code", code],
    queryFn: () => leaveTypesApi.getByCode(code),
    enabled: !!code,
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeaveTypeData) => leaveTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("تم إنشاء نوع الإجازة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveTypeData }) =>
      leaveTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("تم تحديث نوع الإجازة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("تم حذف نوع الإجازة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
