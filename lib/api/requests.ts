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

  // New dynamic approval system
  getPendingMyApproval: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get("/requests/pending-my-approval", { params });
    return response.data;
  },

  getApprovals: async (id: string) => {
    const response = await apiClient.get(`/requests/${id}/approvals`);
    return response.data.data;
  },

  getSteps: async (id: string) => {
    const response = await apiClient.get(`/requests/${id}/steps`);
    return response.data?.data ?? response.data;
  },

  approve: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/${id}/approve`, { notes });
    return response.data.data;
  },

  reject: async (id: string, reason: string) => {
    const response = await apiClient.post(`/requests/${id}/reject`, { reason });
    return response.data.data;
  },

  exitInterview: async (id: string, data: Record<string, any>) => {
    const response = await apiClient.post(`/requests/${id}/exit-interview`, data);
    return response.data.data;
  },
};
