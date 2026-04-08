import { useQuery } from "@tanstack/react-query";
import { hrReportsApi } from "@/lib/api/reports";

export function useEmployeesSummary() {
  return useQuery({
    queryKey: ["reports-hr-employees-summary"],
    queryFn: () => hrReportsApi.getEmployeesSummary(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTurnoverReport(year?: number) {
  return useQuery({
    queryKey: ["reports-hr-turnover", year],
    queryFn: () => hrReportsApi.getTurnover(year),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalariesReport() {
  return useQuery({
    queryKey: ["reports-hr-salaries"],
    queryFn: () => hrReportsApi.getSalaries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExpiryDatesReport(daysAhead = 90) {
  return useQuery({
    queryKey: ["reports-hr-expiry", daysAhead],
    queryFn: () => hrReportsApi.getExpiryDates(daysAhead),
    staleTime: 5 * 60 * 1000,
  });
}
