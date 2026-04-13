import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  employeeFingerprintsApi,
  RegisterFingerprintData,
} from "@/lib/api/employee-fingerprints";
import { toast } from "sonner";

export function useEmployeeFingerprints(employeeId: string) {
  return useQuery({
    queryKey: ["employee-fingerprints", employeeId],
    queryFn: () => employeeFingerprintsApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useRegisterFingerprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterFingerprintData) => employeeFingerprintsApi.register(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["employee-fingerprints", vars.employeeId] });
      toast.success("تم تسجيل البصمة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteFingerprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
      employeeFingerprintsApi.delete(id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["employee-fingerprints", vars.employeeId] });
      toast.success("تم حذف البصمة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}
