import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export type CriteriaCategory = "PERFORMANCE" | "SKILLS" | "BEHAVIOR" | "GOALS";

export interface EvaluationCriteria {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  weight: number;
  maxScore: number;
  category: CriteriaCategory;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCriteriaData {
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  weight: number;
  maxScore: number;
  category: CriteriaCategory;
}

export interface UpdateCriteriaData {
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  weight?: number;
  maxScore?: number;
  category?: CriteriaCategory;
}

export const evaluationCriteriaApi = {
  getAll: async (params?: { category?: CriteriaCategory }): Promise<ApiResponse<EvaluationCriteria[]>> => {
    const response = await apiClient.get("/evaluation-criteria", { params });
    return response.data;
  },

  getById: async (id: string): Promise<EvaluationCriteria> => {
    const response = await apiClient.get(`/evaluation-criteria/${id}`);
    return response.data.data;
  },

  create: async (data: CreateCriteriaData): Promise<EvaluationCriteria> => {
    const response = await apiClient.post("/evaluation-criteria", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCriteriaData): Promise<EvaluationCriteria> => {
    const response = await apiClient.patch(`/evaluation-criteria/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/evaluation-criteria/${id}`);
  },
};
