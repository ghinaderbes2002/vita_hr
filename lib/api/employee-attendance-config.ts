import { apiClient } from "./client";

export interface EmployeeAttendanceConfig {
  id: string;
  employeeId: string;
  salaryLinked: boolean;
  allowedBreakMinutes: number;
  /**
   * Attendance justifications finally rejected for this employee — cumulative,
   * counting both manager and HR rejections. Older records predate the counter
   * and omit it, so read it as 0.
   */
  rejectedJustificationsCount?: number;
  /**
   * When the "three rejections" notice went out on the internal mail, to the
   * employee and to HR. Null until the count first reaches three.
   */
  rejectionAlertSentAt?: string | null;
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
