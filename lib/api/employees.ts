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

  create: async (data: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.post("/employees", data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<Employee>): Promise<Employee> => {
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
};
