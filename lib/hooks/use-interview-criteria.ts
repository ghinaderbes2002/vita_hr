import { useQuery } from "@tanstack/react-query";
import { interviewCriteriaApi } from "@/lib/api/interview-criteria";

export function usePersonalCriteria() {
  return useQuery({
    queryKey: ["interview-criteria-personal"],
    queryFn: () => interviewCriteriaApi.getPersonal(),
    staleTime: 10 * 60 * 1000, // 10 min — rarely changes
  });
}

export function useComputerCriteria() {
  return useQuery({
    queryKey: ["interview-criteria-computer"],
    queryFn: () => interviewCriteriaApi.getComputer(),
    staleTime: 10 * 60 * 1000,
  });
}
