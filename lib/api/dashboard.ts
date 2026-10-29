import { apiClient } from "./client";

/** One month of the podiatry caseload; `month` is "YYYY-MM". */
export interface PodiatryMonth {
  month: string;
  /** Receptions opened that month. */
  receptions: number;
  /** Cases whose insole was fitted that month. */
  fitted: number;
  /** That month's receptions with no insole fitted yet. */
  notFitted: number;
}

export const dashboardApi = {
  get: () => apiClient.get("/dashboard"),

  /** Oldest month first, the current one last; empty months come back as zeros. */
  podiatryMonthly: async (months = 12): Promise<PodiatryMonth[]> => {
    const { data } = await apiClient.get("/dashboard/podiatry-monthly", { params: { months } });
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : [];
  },
};
