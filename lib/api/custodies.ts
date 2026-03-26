import { apiClient } from "./client";

export interface CreateCustodyData {
  name: string;
  description?: string;
  serialNumber?: string;
  category?: string;
  employeeId: string;
  assignedDate: string;
  notes?: string;
}

export interface UpdateCustodyData {
  name?: string;
  description?: string;
  serialNumber?: string;
  category?: string;
  assignedDate?: string;
  notes?: string;
}

export interface ReturnCustodyData {
  status: "RETURNED" | "DAMAGED" | "LOST";
  returnedDate?: string;
  notes?: string;
}

export const custodiesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: string;
    status?: string;
    category?: string;
    search?: string;
  }) => {
    const response = await apiClient.get("/custodies", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/custodies/${id}`);
    return response.data.data;
  },

  create: async (data: CreateCustodyData) => {
    const response = await apiClient.post("/custodies", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCustodyData) => {
    const response = await apiClient.put(`/custodies/${id}`, data);
    return response.data.data;
  },

  return: async (id: string, data: ReturnCustodyData) => {
    const response = await apiClient.patch(`/custodies/${id}/return`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/custodies/${id}`);
    return response.data;
  },

  getByEmployee: async (employeeId: string) => {
    const response = await apiClient.get(`/custodies/employee/${employeeId}`);
    return response.data;
  },

  getEmployeeSummary: async (employeeId: string) => {
    const response = await apiClient.get(`/custodies/employee/${employeeId}/summary`);
    return response.data.data;
  },

  checkUnreturned: async (employeeId: string) => {
    const response = await apiClient.get(`/custodies/employee/${employeeId}/check`);
    return response.data.data as { hasUnreturned: boolean };
  },
};
