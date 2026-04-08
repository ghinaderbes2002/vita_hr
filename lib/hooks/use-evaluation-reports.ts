import { useQuery } from "@tanstack/react-query";
import { evaluationReportsApi } from "@/lib/api/reports";

export function useGradeDistributionReport(params: { periodId?: string }) {
  return useQuery({
    queryKey: ["reports-evaluation-grade-distribution", params],
    queryFn: () => evaluationReportsApi.getGradeDistribution(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentComparisonReport(params: { periodId?: string }) {
  return useQuery({
    queryKey: ["reports-evaluation-department-comparison", params],
    queryFn: () => evaluationReportsApi.getDepartmentComparison(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecommendationsReport(params: { periodId?: string }) {
  return useQuery({
    queryKey: ["reports-evaluation-recommendations", params],
    queryFn: () => evaluationReportsApi.getRecommendations(params),
    staleTime: 5 * 60 * 1000,
  });
}
