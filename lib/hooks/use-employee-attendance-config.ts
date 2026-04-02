import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  employeeAttendanceConfigApi,
  UpsertAttendanceConfigData,
} from "@/lib/api/employee-attendance-config";
import { toast } from "sonner";

export function useEmployeeAttendanceConfig(employeeId: string) {
  return useQuery({
    queryKey: ["employee-attendance-config", employeeId],
    queryFn: () => employeeAttendanceConfigApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useUpsertAttendanceConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertAttendanceConfigData) => employeeAttendanceConfigApi.upsert(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["employee-attendance-config", vars.employeeId],
      });
      toast.success("تم حفظ إعدادات الحضور بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
