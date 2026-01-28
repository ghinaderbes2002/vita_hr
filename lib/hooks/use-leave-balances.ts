import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  leaveBalancesApi,
  CreateLeaveBalanceData,
  AdjustBalanceData,
  CarryOverData,
} from "@/lib/api/leave-balances";
import { toast } from "sonner";

export function useMyLeaveBalances(year?: number) {
  return useQuery({
    queryKey: ["leave-balances", "my", year],
    queryFn: () => leaveBalancesApi.getMyBalance(year),
  });
}

export function useEmployeeLeaveBalances(employeeId: string, year?: number) {
  return useQuery({
    queryKey: ["leave-balances", "employee", employeeId, year],
    queryFn: () => leaveBalancesApi.getEmployeeBalance(employeeId, year),
    enabled: !!employeeId,
  });
}

export function useLeaveBalances(params?: { year?: number; employeeId?: string }) {
  return useQuery({
    queryKey: ["leave-balances", params],
    queryFn: () => leaveBalancesApi.getAll(params),
  });
}

export function useCreateLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeaveBalanceData) => leaveBalancesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم إنشاء رصيد الإجازة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ balanceId, data }: { balanceId: string; data: AdjustBalanceData }) =>
      leaveBalancesApi.adjust(balanceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم تعديل الرصيد بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useInitializeEmployeeBalances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, year }: { employeeId: string; year: number }) =>
      leaveBalancesApi.initializeEmployee(employeeId, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم تهيئة أرصدة الموظف بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useCarryOverBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: CarryOverData }) =>
      leaveBalancesApi.carryOver(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم ترحيل الرصيد بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveBalancesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("تم حذف الرصيد بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
