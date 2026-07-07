import { apiClient } from "./client";

export interface ProbationCriteria {
  id: string;
  nameAr: string;
  nameEn?: string;
  isCore: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface CreateProbationCriteriaData {
  nameAr: string;
  nameEn?: string;
  displayOrder?: number;
  isCore?: boolean;
}

export type UpdateProbationCriteriaData = Partial<CreateProbationCriteriaData>;

export const probationCriteriaApi = {
  getAll: async (): Promise<ProbationCriteria[]> => {
    const response = await apiClient.get("/probation/criteria");
    return response.data?.data || response.data;
  },

  create: async (data: CreateProbationCriteriaData): Promise<ProbationCriteria> => {
    const response = await apiClient.post("/probation/criteria", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: UpdateProbationCriteriaData): Promise<ProbationCriteria> => {
    const response = await apiClient.put(`/probation/criteria/${id}`, data);
    return response.data?.data || response.data;
  },

  delete: async (id: string): Promise<{ deleted?: boolean; isActive?: boolean }> => {
    const response = await apiClient.delete(`/probation/criteria/${id}`);
    return response.data?.data || response.data;
  },

  getByJobTitle: async (jobTitleId: string): Promise<ProbationCriteria[]> => {
    const response = await apiClient.get(`/probation/criteria/by-job-title/${jobTitleId}`);
    return response.data?.data || response.data;
  },
};
