import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "@/lib/api/payroll";
import { toast } from "sonner";

export function usePayrollByEmployee(employeeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ["payroll-by-employee", employeeId, year, month],
    queryFn: () => payrollApi.getByEmployee(employeeId, year, month),
    enabled: !!(employeeId && year && month),
    retry: false,
  });
}

export function usePayroll(params?: {
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["payroll", params],
    queryFn: () => payrollApi.getAll(params),
    enabled: !!(params?.year && params?.month),
  });
}

export function usePayslip(
  employeeId: string,
  year: number,
  month: number,
) {
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
      toast.success(
        `تم توليد ${result.generated} كشف راتب${skippedNote}${errorsNote}`,
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ أثناء توليد الرواتب",
      );
    },
  });
}

export function useExportPayrollXlsx() {
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      payrollApi.exportXlsx(year, month),
    onSuccess: () => {
      toast.success("تم تنزيل ملف Excel");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "فشل تنزيل الملف",
      );
    },
  });
}

export function useUpdateOtherDeduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payrollId,
      amount,
      notes,
    }: {
      payrollId: string;
      amount: number;
      notes?: string;
    }) => payrollApi.updateOtherDeduction(payrollId, amount, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["payslip"] });
      toast.success("تم تحديث الخصم");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ",
      );
    },
  });
}

export function useUpdatePayrollNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payrollId,
      notes,
    }: {
      payrollId: string;
      notes: string;
    }) => payrollApi.updateNote(payrollId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["payslip"] });
      toast.success("تم تحديث الملاحظة");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ",
      );
    },
  });
}

export function useDownloadPayslipPDF() {
  return useMutation({
    mutationFn: ({ payrollId, filename }: { payrollId: string; filename?: string }) =>
      payrollApi.downloadPDF(payrollId, filename),
    onSuccess: () => toast.success("تم تنزيل كشف الراتب PDF"),
    onError: () => toast.error("فشل تنزيل الكشف"),
  });
}

export function useResetMonthPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      payrollApi.resetMonth(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success("تمت إعادة تعيين الكشوف");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "حدث خطأ أثناء إعادة التعيين",
      );
    },
  });
}
