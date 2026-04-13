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
    const raw = response.data?.data || response.data;
    // Backend returns { employees: [...] } instead of a flat array
    const employees = raw?.employees || (Array.isArray(raw) ? raw : []);
    return employees.map((e: any) => ({
      employeeId: e.employee?.id || e.employeeId || "",
      employeeName: e.employee
        ? `${e.employee.firstNameAr || ""} ${e.employee.lastNameAr || ""}`.trim()
        : e.employeeName || "",
      totalLateInstances: e.lateCount ?? e.totalLateInstances ?? 0,
      totalLateMinutes: e.totalLateMinutes ?? 0,
      records: (e.details || e.records || []).map((d: any) => ({
        date: d.date ? new Date(d.date).toLocaleDateString("ar-SA") : d.date,
        clockInTime: d.clockIn || d.clockInTime || "",
        expectedTime: d.expectedTime || "08:00",
        lateMinutes: d.lateMinutes ?? 0,
      })),
    }));
  },

  getAbsences: async (filters: BiometricReportFilters): Promise<AbsenceReport[]> => {
    const response = await apiClient.get("/attendance-reports/absences", { params: filters });
    const raw = response.data?.data || response.data;
    const employees = raw?.employees || (Array.isArray(raw) ? raw : []);
    return employees.map((e: any) => ({
      employeeId: e.employee?.id || e.employeeId || "",
      employeeName: e.employee
        ? `${e.employee.firstNameAr || ""} ${e.employee.lastNameAr || ""}`.trim()
        : e.employeeName || "",
      totalAbsenceDays: e.absentCount ?? e.totalAbsenceDays ?? (e.dates?.length || 0),
      dates: (e.dates || e.details || []).map((d: any) =>
        typeof d === "string" ? d : (d.date ? new Date(d.date).toLocaleDateString("ar-SA") : "")
      ),
    }));
  },

  getTempExits: async (filters: BiometricReportFilters): Promise<TempExitReport[]> => {
    const response = await apiClient.get("/attendance-reports/temp-exits", { params: filters });
    const raw = response.data?.data || response.data;
    const employees = raw?.employees || (Array.isArray(raw) ? raw : []);
    return employees.map((e: any) => ({
      employeeId: e.employee?.id || e.employeeId || "",
      employeeName: e.employee
        ? `${e.employee.firstNameAr || ""} ${e.employee.lastNameAr || ""}`.trim()
        : e.employeeName || "",
      totalExits: e.exitCount ?? e.totalExits ?? 0,
      totalBreakMinutes: e.totalBreakMinutes ?? 0,
      allowedBreakMinutes: e.allowedBreakMinutes ?? 0,
      excessMinutes: e.excessMinutes ?? 0,
      records: (e.details || e.records || []).map((d: any) => ({
        date: d.date ? new Date(d.date).toLocaleDateString("ar-SA") : d.date,
        breaks: d.breaks || [],
      })),
    }));
  },

  getMonthlyPayroll: async (
    year: number,
    month: number,
    departmentId?: string
  ): Promise<MonthlyPayrollReport[]> => {
    const response = await apiClient.get("/attendance-reports/monthly-payroll", {
      params: { year, month, departmentId },
    });
    const raw = response.data?.data || response.data;
    // Backend returns { employees: [...], year, month } instead of flat array
    const employees = raw?.employees || (Array.isArray(raw) ? raw : []);
    return employees.map((e: any) => ({
      employeeId: e.employee?.id || e.employeeId || "",
      employeeName: e.employee
        ? `${e.employee.firstNameAr || ""} ${e.employee.lastNameAr || ""}`.trim()
        : e.employeeName || "",
      year: raw?.year || year,
      month: raw?.month || month,
      baseSalary: e.baseSalary ?? 0,
      totalDeductions: e.deductions?.totalDeductionMinutes ?? e.totalDeductions ?? 0,
      netSalary: e.netSalary ?? 0,
      status: e.status || "DRAFT",
      // Extended fields from the new backend
      workingDays: e.workingDays ?? 0,
      presentDays: e.presentDays ?? 0,
      absentDays: e.absentDays ?? 0,
      lateDays: e.lateDays ?? 0,
      totalLateMinutes: e.totalLateMinutes ?? 0,
      totalWorkedMinutes: e.totalWorkedMinutes ?? 0,
      netWorkedMinutes: e.netWorkedMinutes ?? 0,
      deductions: e.deductions || null,
      salaryLinked: e.salaryLinked ?? false,
    }));
  },

  getEmployeeCard: async (
    employeeId: string,
    year: number,
    month: number
  ): Promise<EmployeeCardReport & { days?: any[] }> => {
    const response = await apiClient.get(`/attendance-reports/employee-card/${employeeId}`, {
      params: { year, month },
    });
    const raw = response.data?.data || response.data;
    // Backend returns { employee, summary, days, allowedBreakMinutes, year, month }
    const emp = raw?.employee || {};
    const summary = raw?.summary || raw;
    return {
      employeeId: emp.id || employeeId,
      employeeName: emp.firstNameAr
        ? `${emp.firstNameAr} ${emp.lastNameAr}`.trim()
        : raw?.employeeName || "",
      year: raw?.year || year,
      month: raw?.month || month,
      workingDays: summary.workingDays ?? 0,
      presentDays: summary.presentDays ?? 0,
      absentDays: summary.absentDays ?? 0,
      lateDays: summary.lateDays ?? 0,
      totalLateMinutes: summary.totalLateMinutes ?? 0,
      totalBreakMinutes: summary.totalBreakMinutes ?? 0,
      allowedBreakMinutes: raw?.allowedBreakMinutes ?? 0,
      netWorkedMinutes: summary.totalWorkedMinutes ?? summary.netWorkedMinutes ?? 0,
      days: raw?.days || [],
    };
  },
};
