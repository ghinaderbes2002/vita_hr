import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
  };
  leaveTypeId: string;
  leaveType?: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
  };
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  carriedOverDays: number;
  adjustedDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveBalanceData {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
}

export interface AdjustBalanceData {
  adjustmentDays: number;
  reason: string;
}

export interface CarryOverData {
  fromYear: number;
  toYear: number;
  carryOverDays: number;
}

export const leaveBalancesApi = {
  getMyBalance: async (year?: number): Promise<LeaveBalance[]> => {
    const params = year ? { year } : {};
    const response = await apiClient.get("/leave-balances/my", { params });
    return response.data.data || response.data;
  },

  getEmployeeBalance: async (employeeId: string, year?: number): Promise<LeaveBalance[]> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/leave-balances/employee/${employeeId}`, { params });
    return response.data.data || response.data;
  },

  getAll: async (params?: { year?: number; employeeId?: string }): Promise<ApiResponse<LeaveBalance[]>> => {
    const response = await apiClient.get("/leave-balances", { params });
    return response.data;
  },

  create: async (data: CreateLeaveBalanceData): Promise<LeaveBalance> => {
    const response = await apiClient.post("/leave-balances", data);
    return response.data.data;
  },

  adjust: async (balanceId: string, data: AdjustBalanceData): Promise<LeaveBalance> => {
    const response = await apiClient.post(`/leave-balances/${balanceId}/adjust`, data);
    return response.data.data;
  },

  initializeEmployee: async (employeeId: string, year: number): Promise<LeaveBalance[]> => {
    const response = await apiClient.post(`/leave-balances/employee/${employeeId}/initialize`, null, {
      params: { year },
    });
    return response.data.data;
  },

  carryOver: async (employeeId: string, data: CarryOverData): Promise<LeaveBalance> => {
    const response = await apiClient.post(`/leave-balances/employee/${employeeId}/carry-over`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leave-balances/${id}`);
  },
};
