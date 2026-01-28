import { apiClient } from "./client";
import { LeaveType, ApiResponse, PaginationParams } from "@/types";

export interface CreateLeaveTypeData {
  code: string;
  nameAr: string;
  nameEn: string;
  defaultDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  color?: string;
}

export interface UpdateLeaveTypeData {
  nameAr?: string;
  nameEn?: string;
  defaultDays?: number;
  isPaid?: boolean;
  requiresApproval?: boolean;
  allowHalfDay?: boolean;
  color?: string;
  isActive?: boolean;
}

export const leaveTypesApi = {
  getAll: async (params?: PaginationParams & { active?: boolean }): Promise<ApiResponse<LeaveType[]>> => {
    const response = await apiClient.get("/leave-types", {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log("Leave Types raw response:", response);
    console.log("Leave Types response.data:", response.data);
    console.log("Leave Types response.status:", response.status);
    return response.data;
  },

  getActive: async (): Promise<ApiResponse<LeaveType[]>> => {
    const response = await apiClient.get("/leave-types", { params: { active: true } });
    return response.data;
  },

  getById: async (id: string): Promise<LeaveType> => {
    const response = await apiClient.get(`/leave-types/${id}`);
    return response.data.data;
  },

  getByCode: async (code: string): Promise<LeaveType> => {
    const response = await apiClient.get(`/leave-types/code/${code}`);
    return response.data.data;
  },

  create: async (data: CreateLeaveTypeData): Promise<LeaveType> => {
    const response = await apiClient.post("/leave-types", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateLeaveTypeData): Promise<LeaveType> => {
    const response = await apiClient.put(`/leave-types/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leave-types/${id}`);
  },
};
