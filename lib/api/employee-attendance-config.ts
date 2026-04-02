import { apiClient } from "./client";

export interface EmployeeAttendanceConfig {
  id: string;
  employeeId: string;
  salaryLinked: boolean;
  allowedBreakMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAttendanceConfigData {
  employeeId: string;
  salaryLinked?: boolean;
  allowedBreakMinutes?: number;
}

export const employeeAttendanceConfigApi = {
  getByEmployee: async (employeeId: string): Promise<EmployeeAttendanceConfig> => {
    const response = await apiClient.get(`/employee-attendance-config/${employeeId}`);
    return response.data?.data || response.data;
  },

  upsert: async (data: UpsertAttendanceConfigData): Promise<EmployeeAttendanceConfig> => {
    const response = await apiClient.post("/employee-attendance-config", data);
    return response.data?.data || response.data;
  },
};
