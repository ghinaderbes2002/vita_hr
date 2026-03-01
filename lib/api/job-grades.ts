import { apiClient } from "./client";

export interface JobGrade {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  color?: string;
  minSalary: number | string;
  maxSalary: number | string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateJobGradeData {
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  color?: string;
  minSalary: number;
  maxSalary: number;
  isActive?: boolean;
}

export interface UpdateJobGradeData extends Partial<CreateJobGradeData> {}

export const jobGradesApi = {
  getAll: async (params?: { page?: number; limit?: number; isActive?: boolean }) => {
    const response = await apiClient.get("/job-grades", { params });
    return response.data;
  },

  getById: async (id: string): Promise<JobGrade> => {
    const response = await apiClient.get(`/job-grades/${id}`);
    return response.data.data;
  },

  create: async (data: CreateJobGradeData): Promise<JobGrade> => {
    const response = await apiClient.post("/job-grades", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateJobGradeData): Promise<JobGrade> => {
    const response = await apiClient.patch(`/job-grades/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/job-grades/${id}`);
  },
};
