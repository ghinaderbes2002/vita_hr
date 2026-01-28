import { apiClient } from "./client";
import { Department, ApiResponse, PaginationParams } from "@/types";

export interface CreateDepartmentData {
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  parentId?: string;
}

export interface UpdateDepartmentData {
  code?: string;
  nameAr?: string;
  nameEn?: string;
  nameTr?: string;
  parentId?: string;
}

export const departmentsApi = {
  getAll: async (
    params?: PaginationParams & { search?: string }
  ): Promise<ApiResponse<Department[]>> => {
    const queryParams = {
      page: params?.page || 1,
      limit: params?.limit || 10,
      ...(params?.search && { search: params.search }),
    };
    const response = await apiClient.get("/departments", { params: queryParams });
    return response.data;
  },

  getTree: async (): Promise<Department[]> => {
    const response = await apiClient.get("/departments/tree");
    return response.data.data;
  },

  getById: async (id: string): Promise<Department> => {
    const response = await apiClient.get(`/departments/${id}`);
    return response.data.data;
  },

  create: async (data: CreateDepartmentData): Promise<Department> => {
    const response = await apiClient.post("/departments", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateDepartmentData): Promise<Department> => {
    const response = await apiClient.patch(`/departments/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/departments/${id}`);
  },
};
