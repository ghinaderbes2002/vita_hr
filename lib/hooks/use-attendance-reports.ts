import { useQuery } from "@tanstack/react-query";
import { attendanceReportsApi } from "@/lib/api/reports";
import { attendanceReportsApi as biometricApi, BiometricReportFilters } from "@/lib/api/attendance-reports";

export function useDailyReport(params: { date?: string; departmentId?: string; employeeId?: string }) {
  return useQuery({
    queryKey: ["reports-attendance-daily", params],
    queryFn: () => attendanceReportsApi.getDaily(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMonthlyReport(params: { year: number; month: number; employeeId?: string; departmentId?: string }) {
  return useQuery({
    queryKey: ["reports-attendance-monthly", params],
    queryFn: () => attendanceReportsApi.getMonthly(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopAbsencesReport(params: { year: number; month?: number; limit?: number }) {
  return useQuery({
    queryKey: ["reports-attendance-top-absences", params],
    queryFn: () => attendanceReportsApi.getTopAbsences(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOvertimeReport(params: { year: number; month?: number }) {
  return useQuery({
    queryKey: ["reports-attendance-overtime", params],
    queryFn: () => attendanceReportsApi.getOvertime(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSummaryReport(params: { dateFrom?: string; dateTo?: string; departmentId?: string }) {
  return useQuery({
    queryKey: ["reports-attendance-summary", params],
    queryFn: () => attendanceReportsApi.getSummary(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBreaksReport(params: { dateFrom?: string; dateTo?: string; departmentId?: string }) {
  return useQuery({
    queryKey: ["reports-attendance-breaks", params],
    queryFn: () => attendanceReportsApi.getBreaks(params),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Biometric Report Hooks ──────────────────────────────────────────────────

export function useLatenessReport(filters: BiometricReportFilters, enabled = true) {
  return useQuery({
    queryKey: ["reports-attendance-lateness", filters],
    queryFn: () => biometricApi.getLateness(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAbsencesReport(filters: BiometricReportFilters, enabled = true) {
  return useQuery({
    queryKey: ["reports-attendance-absences", filters],
    queryFn: () => biometricApi.getAbsences(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTempExitsReport(filters: BiometricReportFilters, enabled = true) {
  return useQuery({
    queryKey: ["reports-attendance-temp-exits", filters],
    queryFn: () => biometricApi.getTempExits(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyPayrollReport(
  year: number,
  month: number,
  departmentId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["reports-attendance-monthly-payroll", { year, month, departmentId }],
    queryFn: () => biometricApi.getMonthlyPayroll(year, month, departmentId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeeCardReport(
  employeeId: string,
  year: number,
  month: number,
  enabled = true
) {
  return useQuery({
    queryKey: ["reports-attendance-employee-card", { employeeId, year, month }],
    queryFn: () => biometricApi.getEmployeeCard(employeeId, year, month),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}
