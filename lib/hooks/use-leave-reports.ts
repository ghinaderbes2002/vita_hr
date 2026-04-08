import { useQuery } from "@tanstack/react-query";
import { leaveReportsApi } from "@/lib/api/reports";

export function useLeaveBalancesReport(year?: number) {
  return useQuery({
    queryKey: ["reports-leave-balances", year],
    queryFn: () => leaveReportsApi.getBalances(year),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaveDistributionReport(year?: number) {
  return useQuery({
    queryKey: ["reports-leave-distribution", year],
    queryFn: () => leaveReportsApi.getDistribution(year),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaveSummaryReport(year?: number) {
  return useQuery({
    queryKey: ["reports-leave-summary", year],
    queryFn: () => leaveReportsApi.getSummary(year),
    staleTime: 5 * 60 * 1000,
  });
}
