import { apiClient } from "./client";
import { Employee, ApiResponse, PaginationParams } from "@/types";

export const employeesApi = {
  getAll: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Employee[]>> => {
    const response = await apiClient.get("/employees", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data.data;
  },

  create: async (data: Record<string, any>): Promise<Employee> => {
    const response = await apiClient.post("/employees", data);
    return response.data.data;
  },

  update: async (id: string, data: Record<string, any>): Promise<Employee> => {
    const response = await apiClient.patch(`/employees/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employees/${id}`);
  },

  getSubordinates: async (managerId: string): Promise<Employee[]> => {
    const response = await apiClient.get(`/employees/manager/${managerId}/subordinates`);
    return response.data.data;
  },

  linkUser: async (employeeId: string, userId: string): Promise<void> => {
    await apiClient.post(`/employees/${employeeId}/link-user`, { userId });
  },

  getByDepartment: async (departmentId: string): Promise<Employee[]> => {
    const response = await apiClient.get(`/employees/department/${departmentId}`);
    return response.data.data;
  },

  getManagerNotes: async (id: string): Promise<{ managerNotes: string | null; managerNotesUpdatedAt: string | null; managerNotesUpdatedBy: string | null }> => {
    const response = await apiClient.get(`/employees/${id}/manager-notes`);
    return response.data.data ?? response.data;
  },

  updateManagerNotes: async (id: string, notes: string): Promise<void> => {
    await apiClient.put(`/employees/${id}/manager-notes`, { notes });
  },

  getProbationReport: async (days: number): Promise<any[]> => {
    const response = await apiClient.get("/employees/reports/probation-ending", { params: { days } });
    return response.data?.data ?? response.data ?? [];
  },

  getContractReport: async (days: number): Promise<any[]> => {
    const response = await apiClient.get("/employees/reports/contract-ending", { params: { days } });
    return response.data?.data ?? response.data ?? [];
  },
};
