import { apiClient } from "./client";
import { JobApplicationStatus } from "@/types";

export interface UpdateJobApplicationData {
  status: JobApplicationStatus;
  reviewNotes?: string;
  rejectionNote?: string;
  rating?: number;
}

export const jobApplicationsApi = {
  getAll: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get("/job-applications", { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get("/job-applications/stats");
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/job-applications/${id}`);
    return response.data.data;
  },

  update: async (id: string, data: UpdateJobApplicationData) => {
    const response = await apiClient.put(`/job-applications/${id}`, data);
    return response.data.data;
  },
};

export const CV_BASE_URL = "https://vitaxirpro.com/api";
