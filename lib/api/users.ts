import { apiClient } from "./client";
import { User, ApiResponse, PaginationParams } from "@/types";

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleId?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  roleId?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export const usersApi = {
  getAll: async (
    params?: PaginationParams & { search?: string }
  ): Promise<ApiResponse<User[]>> => {
    const queryParams = {
      page: params?.page || 1,
      limit: params?.limit || 10,
      ...(params?.search && { search: params.search }),
    };
    const response = await apiClient.get("/users", { params: queryParams });
    console.log("usersApi.getAll - axios response.data:", response.data);
    console.log("usersApi.getAll - response.data.data:", response.data?.data);
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post("/users", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserData): Promise<User> => {
    console.log("usersApi.update - id:", id, "data:", data);
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  assignRoles: async (id: string, roleIds: string[]): Promise<void> => {
    await apiClient.post(`/users/${id}/roles`, { roleIds });
  },
};
