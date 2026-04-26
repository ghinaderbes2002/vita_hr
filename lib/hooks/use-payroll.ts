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
      const skippedNote = result.skipped > 0 ? ` | تخطي: ${result.skipped}` : "";
      const errorsNote = result.errors > 0 ? ` | أخطاء: ${result.errors}` : "";
      toast.success(`تم توليد ${result.generated} كشف راتب${skippedNote}${errorsNote}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ أثناء توليد الرواتب");
    },
  });
}
