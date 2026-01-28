import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export type PeriodStatus = "DRAFT" | "OPEN" | "CLOSED";

export interface EvaluationPeriod {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePeriodData {
  code: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
}

export interface UpdatePeriodData {
  nameAr?: string;
  nameEn?: string;
  startDate?: string;
  endDate?: string;
}

export interface GenerateFormsData {
  departmentIds?: string[];
  employeeIds?: string[];
}

export interface GenerateFormsResponse {
  totalForms: number;
  message: string;
}

export const evaluationPeriodsApi = {
  getAll: async (): Promise<ApiResponse<EvaluationPeriod[]>> => {
    const response = await apiClient.get("/evaluation-periods");
    return response.data;
  },

  getById: async (id: string): Promise<EvaluationPeriod> => {
    const response = await apiClient.get(`/evaluation-periods/${id}`);
    return response.data.data;
  },

  create: async (data: CreatePeriodData): Promise<EvaluationPeriod> => {
    const response = await apiClient.post("/evaluation-periods", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdatePeriodData): Promise<EvaluationPeriod> => {
    const response = await apiClient.patch(`/evaluation-periods/${id}`, data);
    return response.data.data;
  },

  open: async (id: string): Promise<EvaluationPeriod> => {
    const response = await apiClient.post(`/evaluation-periods/${id}/open`);
    return response.data.data;
  },

  close: async (id: string): Promise<EvaluationPeriod> => {
    const response = await apiClient.post(`/evaluation-periods/${id}/close`);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/evaluation-periods/${id}`);
  },

  generateForms: async (id: string, data?: GenerateFormsData): Promise<GenerateFormsResponse> => {
    const response = await apiClient.post(`/evaluation-periods/${id}/generate-forms`, data || {});
    return response.data.data;
  },
};
