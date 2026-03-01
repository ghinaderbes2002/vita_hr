import { apiClient } from "./client";

export interface CreateJobTitleData {
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr?: string;
  description?: string;
  gradeId?: string;
}

export interface UpdateJobTitleData extends Partial<CreateJobTitleData> {}

export const jobTitlesApi = {
  getAll: async (params?: { page?: number; limit?: number; gradeId?: string }) => {
    const response = await apiClient.get("/job-titles", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/job-titles/${id}`);
    return response.data.data;
  },

  create: async (data: CreateJobTitleData) => {
    const response = await apiClient.post("/job-titles", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateJobTitleData) => {
    const response = await apiClient.patch(`/job-titles/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/job-titles/${id}`);
  },
};
