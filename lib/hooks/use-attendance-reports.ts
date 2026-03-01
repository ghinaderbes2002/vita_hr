import { useQuery } from "@tanstack/react-query";
import { attendanceReportsApi } from "@/lib/api/attendance-reports";

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
