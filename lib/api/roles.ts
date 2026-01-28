import { apiClient } from "./client";
import { Role, Permission } from "@/types";

export interface CreateRoleData {
  name: string;
  displayNameAr: string;
  displayNameEn: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRolePermissionsData {
  permissionIds: string[];
}

export const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    const response = await apiClient.get("/roles");
    return response.data.data;
  },

  getById: async (id: string): Promise<Role> => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data.data;
  },

  create: async (data: CreateRoleData): Promise<Role> => {
    const response = await apiClient.post("/roles", data);
    return response.data.data;
  },

  updatePermissions: async (id: string, data: UpdateRolePermissionsData): Promise<Role> => {
    const response = await apiClient.put(`/roles/${id}/permissions`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  getAllPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get("/permissions");
    return response.data.data;
  },
};
