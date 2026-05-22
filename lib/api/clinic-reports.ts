import { apiClient } from "./client";

export interface DonorReportSummary {
  totalCases: number;
  patientsServed: number;
  deliveredCases: number;
  successRate: number;
  followUpsCompleted: number;
}

export interface DonorReport {
  period: { from: string | null; to: string | null };
  summary: DonorReportSummary;
  byStatus: Array<{ status: string; count: number }>;
  byAmputationType: Array<{ type: string; count: number }>;
  resources: { totalComponentsUsed: number; totalConsumablesUsed: number };
  generatedAt: string;
}

export const clinicReportsApi = {
  getDonorReport: async (params?: { from?: string; to?: string }): Promise<DonorReport> => {
    const { data } = await apiClient.get("/prosthetics/reports/donor", { params });
    return data?.data ?? data;
  },

  downloadDonorPdf: async (params?: { from?: string; to?: string }): Promise<Blob> => {
    const response = await apiClient.get("/prosthetics/reports/donor/pdf", {
      params,
      responseType: "blob",
    });
    return response.data;
  },
};
