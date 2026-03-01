import { apiClient } from "./client";

export const attendanceReportsApi = {
  getDaily: async (params?: {
    date?: string;
    departmentId?: string;
    employeeId?: string;
  }) => {
    const response = await apiClient.get("/attendance-reports/daily", { params });
    return response.data;
  },

  getMonthly: async (params?: {
    year?: number;
    month?: number;
    employeeId?: string;
    departmentId?: string;
  }) => {
    const response = await apiClient.get("/attendance-reports/monthly", { params });
    return response.data;
  },

  getSummary: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    departmentId?: string;
  }) => {
    const response = await apiClient.get("/attendance-reports/summary", { params });
    return response.data;
  },

  getBreaks: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    departmentId?: string;
  }) => {
    const response = await apiClient.get("/attendance-reports/breaks", { params });
    return response.data;
  },
};
