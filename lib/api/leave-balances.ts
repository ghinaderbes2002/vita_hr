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
    isUnlimited?: boolean;
    maxHoursPerMonth?: number | null;
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
  // ساعات الإجازات الساعية
  usedHours?: number;
  pendingHours?: number;
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

export interface HourlyBalanceResponse {
  employeeId: string;
  year: number;
  month: number;
  leaveTypeId: string;
  totalHours: number;
  usedByRequestsHours: number;
  usedByTardinessHours: number;
  totalUsedHours: number;
  remainingHours: number;
  usedByRequestsMinutes: number;
  usedByTardinessMinutes: number;
  totalUsedMinutes: number;
  remainingMinutes: number;
}

/**
 * Annual-leave entitlement vs. what was actually taken, for one employee and
 * year. The API answers with zeros (not an error) when no balance was
 * initialised for that employee/year.
 */
export interface AnnualLeaveSummary {
  employeeId: string;
  employee?: {
    employeeNumber?: string;
    firstNameAr?: string;
    lastNameAr?: string;
    firstNameEn?: string;
    lastNameEn?: string;
  };
  year: number;
  /** Allocated for the year plus whatever carried over from the previous one. */
  entitled: number;
  used: number;
  remaining: number;
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

  getAnnualSummary: async (employeeId: string, year?: number): Promise<AnnualLeaveSummary> => {
    const response = await apiClient.get(
      `/leave-balances/employee/${employeeId}/annual-summary`,
      { params: year ? { year } : {} },
    );
    return response.data?.data ?? response.data;
  },

  getHourlyMonthly: async (employeeId: string, year?: number, month?: number): Promise<HourlyBalanceResponse> => {
    const response = await apiClient.get(`/leave-balances/${employeeId}/hourly-monthly`, {
      params: { year, month },
    });
    return response.data?.data ?? response.data;
  },
};
