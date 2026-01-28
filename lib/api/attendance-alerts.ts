import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export type AlertType = "LATE" | "ABSENT" | "EARLY_LEAVE" | "MISSING_CLOCK_OUT" | "CONSECUTIVE_ABSENCE";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export interface AttendanceAlert {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    nameAr: string;
    nameEn: string;
    code: string;
  };
  date: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  messageAr: string;
  status: AlertStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolvedNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceAlertData {
  employeeId: string;
  date: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  messageAr: string;
  status: AlertStatus;
}

export interface UpdateAttendanceAlertData {
  status?: AlertStatus;
  severity?: AlertSeverity;
}

export interface ResolveAlertData {
  resolvedNotes: string;
}

export interface AlertQueryParams {
  status?: AlertStatus;
  employeeId?: string;
  type?: AlertType;
  dateFrom?: string;
  dateTo?: string;
}

export const attendanceAlertsApi = {
  getMyAlerts: async (params: AlertQueryParams): Promise<ApiResponse<AttendanceAlert[]>> => {
    const response = await apiClient.get("/attendance-alerts/my-alerts", { params });
    return response.data;
  },

  getAll: async (params: AlertQueryParams): Promise<ApiResponse<AttendanceAlert[]>> => {
    const response = await apiClient.get("/attendance-alerts", { params });
    return response.data;
  },

  getById: async (id: string): Promise<AttendanceAlert> => {
    const response = await apiClient.get(`/attendance-alerts/${id}`);
    return response.data.data;
  },

  create: async (data: CreateAttendanceAlertData): Promise<AttendanceAlert> => {
    const response = await apiClient.post("/attendance-alerts", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateAttendanceAlertData): Promise<AttendanceAlert> => {
    const response = await apiClient.patch(`/attendance-alerts/${id}`, data);
    return response.data.data;
  },

  resolve: async (id: string, data: ResolveAlertData): Promise<AttendanceAlert> => {
    const response = await apiClient.patch(`/attendance-alerts/${id}/resolve`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/attendance-alerts/${id}`);
  },
};
