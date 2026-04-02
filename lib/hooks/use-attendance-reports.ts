import { useQuery } from "@tanstack/react-query";
import { attendanceReportsApi, BiometricReportFilters } from "@/lib/api/attendance-reports";

export function useDailyReport(params?: {
  date?: string;
  departmentId?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: ["attendance-reports", "daily", params],
    queryFn: () => attendanceReportsApi.getDaily(params),
  });
}

export function useMonthlyReport(params?: {
  year?: number;
  month?: number;
  employeeId?: string;
  departmentId?: string;
}) {
  return useQuery({
    queryKey: ["attendance-reports", "monthly", params],
    queryFn: () => attendanceReportsApi.getMonthly(params),
  });
}

export function useSummaryReport(params?: {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  departmentId?: string;
}) {
  return useQuery({
    queryKey: ["attendance-reports", "summary", params],
    queryFn: () => attendanceReportsApi.getSummary(params),
  });
}

export function useBreaksReport(params?: {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  departmentId?: string;
}) {
  return useQuery({
    queryKey: ["attendance-reports", "breaks", params],
    queryFn: () => attendanceReportsApi.getBreaks(params),
  });
}

// Biometric reports
export function useLatenessReport(filters: BiometricReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["report-lateness", filters],
    queryFn: () => attendanceReportsApi.getLateness(filters),
    enabled,
  });
}

export function useAbsencesReport(filters: BiometricReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["report-absences", filters],
    queryFn: () => attendanceReportsApi.getAbsences(filters),
    enabled,
  });
}

export function useTempExitsReport(filters: BiometricReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["report-temp-exits", filters],
    queryFn: () => attendanceReportsApi.getTempExits(filters),
    enabled,
  });
}

export function useMonthlyPayrollReport(
  year: number,
  month: number,
  departmentId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["report-monthly-payroll", year, month, departmentId],
    queryFn: () => attendanceReportsApi.getMonthlyPayroll(year, month, departmentId),
    enabled,
  });
}

export function useEmployeeCardReport(
  employeeId: string,
  year: number,
  month: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["report-employee-card", employeeId, year, month],
    queryFn: () => attendanceReportsApi.getEmployeeCard(employeeId, year, month),
    enabled: enabled && !!employeeId,
  });
}
