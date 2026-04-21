import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await dashboardApi.get();
      return res.data?.data ?? res.data;
    },
    staleTime: 60_000,
  });
}
