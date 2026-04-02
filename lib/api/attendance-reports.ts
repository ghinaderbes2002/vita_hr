import { apiClient } from "./client";

export interface BiometricReportFilters {
  from: string;
  to: string;
  departmentId?: string;
  employeeId?: string;
}

export interface LatenessReport {
  employeeId: string;
  employeeName: string;
  totalLateInstances: number;
  totalLateMinutes: number;
  records: {
    date: string;
    clockInTime: string;
    expectedTime: string;
    lateMinutes: number;
  }[];
}

export interface AbsenceReport {
  employeeId: string;
  employeeName: string;
  totalAbsenceDays: number;
  dates: string[];
}

export interface TempExitReport {
  employeeId: string;
  employeeName: string;
  totalExits: number;
  totalBreakMinutes: number;
  allowedBreakMinutes: number;
  excessMinutes: number;
  records: {
    date: string;
    breaks: { breakOut: string; breakIn: string; durationMinutes: number }[];
  }[];
}

export interface MonthlyPayrollReport {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  baseSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: "DRAFT" | "CONFIRMED" | "EXPORTED";
}

export interface EmployeeCardReport {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalBreakMinutes: number;
  allowedBreakMinutes: number;
  netWorkedMinutes: number;
}

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

  // Biometric reports
  getLateness: async (filters: BiometricReportFilters): Promise<LatenessReport[]> => {
    const response = await apiClient.get("/attendance-reports/lateness", { params: filters });
    return response.data?.data || response.data;
  },

  getAbsences: async (filters: BiometricReportFilters): Promise<AbsenceReport[]> => {
    const response = await apiClient.get("/attendance-reports/absences", { params: filters });
    return response.data?.data || response.data;
  },

  getTempExits: async (filters: BiometricReportFilters): Promise<TempExitReport[]> => {
    const response = await apiClient.get("/attendance-reports/temp-exits", { params: filters });
    return response.data?.data || response.data;
  },

  getMonthlyPayroll: async (
    year: number,
    month: number,
    departmentId?: string
  ): Promise<MonthlyPayrollReport[]> => {
    const response = await apiClient.get("/attendance-reports/monthly-payroll", {
      params: { year, month, departmentId },
    });
    return response.data?.data || response.data;
  },

  getEmployeeCard: async (
    employeeId: string,
    year: number,
    month: number
  ): Promise<EmployeeCardReport> => {
    const response = await apiClient.get(`/attendance-reports/employee-card/${employeeId}`, {
      params: { year, month },
    });
    return response.data?.data || response.data;
  },
};
