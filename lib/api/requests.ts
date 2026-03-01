import { apiClient } from "./client";
import { RequestType } from "@/types";

export interface CreateRequestData {
  type: RequestType;
  reason: string;
  notes?: string;
  attachmentUrl?: string;
  details?: Record<string, any>;
}

export const requestsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    employeeId?: string;
  }) => {
    const response = await apiClient.get("/requests", { params });
    return response.data;
  },

  getMy: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get("/requests/my", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/requests/${id}`);
    return response.data.data;
  },

  create: async (data: CreateRequestData) => {
    const response = await apiClient.post("/requests", data);
    return response.data.data;
  },

  submit: async (id: string) => {
    const response = await apiClient.post(`/requests/${id}/submit`);
    return response.data.data;
  },

  cancel: async (id: string, reason: string) => {
    const response = await apiClient.post(`/requests/${id}/cancel`, { reason });
    return response.data.data;
  },

  managerApprove: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/${id}/manager-approve`, { notes });
    return response.data.data;
  },

  managerReject: async (id: string, notes: string) => {
    const response = await apiClient.post(`/requests/${id}/manager-reject`, { notes });
    return response.data.data;
  },

  hrApprove: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/${id}/hr-approve`, { notes });
    return response.data.data;
  },

  hrReject: async (id: string, notes: string) => {
    const response = await apiClient.post(`/requests/${id}/hr-reject`, { notes });
    return response.data.data;
  },
};
