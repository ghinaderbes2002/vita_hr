import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "@/lib/api/payroll";
import { toast } from "sonner";

export function usePayroll(params?: { year?: number; month?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["payroll", params],
    queryFn: () => payrollApi.getAll(params),
    enabled: !!(params?.year && params?.month),
  });
}

export function usePayslip(employeeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ["payslip", employeeId, year, month],
    queryFn: () => payrollApi.getPayslip(employeeId, year, month),
    enabled: !!(employeeId && year && month),
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      payrollApi.generate(year, month),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(`تم توليد ${result.generated} كشف راتب بنجاح${result.errors > 0 ? ` (${result.errors} أخطاء)` : ""}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ أثناء توليد الرواتب");
    },
  });
}
