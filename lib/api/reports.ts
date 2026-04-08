import { apiClient } from "./client";

// ─── Shared CSV download ────────────────────────────────────────────────────

export const downloadCsv = (endpoint: string, filename: string) => {
  const token = typeof document !== "undefined"
    ? document.cookie.split("; ").find(c => c.startsWith("wso-token="))?.split("=")[1]
    : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const sep = endpoint.includes("?") ? "&" : "?";
  fetch(`${baseUrl}${endpoint}${sep}format=csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

// ─── HR Reports ────────────────────────────────────────────────────────────

export interface EmployeesSummary {
  byDepartment: { departmentId: string; departmentAr: string; count: number }[];
  byGender: { gender: string; count: number }[];
  byNationality: { nationality: string; count: number }[];
  byContractType: { contractType: string; count: number }[];
  total: number;
}

export interface TurnoverReport {
  year: number;
  hired: { month: number; count: number }[];
  terminated: { month: number; count: number }[];
}

export interface SalaryReport {
  departmentId: string;
  departmentAr: string;
  employeeCount: number;
  totalSalary: number;
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  currency: string;
}

export interface ExpiryReport {
  daysAhead: number;
  count: number;
  items: {
    employeeId: string;
    employeeNumber: string;
    firstNameAr: string;
    lastNameAr: string;
    departmentAr: string;
    contractType: string;
    contractEndDate: string;
    daysRemaining: number;
  }[];
}

export const hrReportsApi = {
  getEmployeesSummary: async (): Promise<EmployeesSummary> => {
    const response = await apiClient.get("/reports/hr/employees-summary");
    return response.data?.data || response.data;
  },
  getTurnover: async (year?: number): Promise<TurnoverReport> => {
    const response = await apiClient.get("/reports/hr/turnover", { params: { year } });
    return response.data?.data || response.data;
  },
  getSalaries: async (): Promise<SalaryReport[]> => {
    const response = await apiClient.get("/reports/hr/salaries");
    const result = response.data?.data ?? response.data;
    return Array.isArray(result) ? result : [];
  },
  getExpiryDates: async (daysAhead = 90): Promise<ExpiryReport> => {
    const response = await apiClient.get("/reports/hr/expiry-dates", { params: { daysAhead } });
    return response.data?.data || response.data;
  },
};

// ─── Leave Reports ──────────────────────────────────────────────────────────

export interface LeaveBalancesReport {
  year: number;
  totalRecords: number;
  byType: { leaveTypeName: string; totalEmployees: number; avgRemaining: number }[];
  details: {
    employeeId: string;
    leaveTypeId: string;
    leaveTypeName: string;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
    year: number;
  }[];
}

export interface LeaveDistributionReport {
  year: number;
  byType: { leaveTypeName: string; requestCount: number; totalDays: number }[];
  byMonth: { month: number; requestCount: number; totalDays: number }[];
}

export interface LeaveSummaryReport {
  year: number;
  byStatus: { status: string; count: number; totalDays: number }[];
  pendingRequests: {
    count: number;
    items: {
      id: string;
      employeeId: string;
      leaveTypeName: string;
      startDate: string;
      endDate: string;
      totalDays: number;
      status: string;
    }[];
  };
}

export const leaveReportsApi = {
  getBalances: async (year?: number): Promise<LeaveBalancesReport> => {
    const response = await apiClient.get("/reports/leave/balances", { params: { year } });
    return response.data?.data || response.data;
  },
  getDistribution: async (year?: number): Promise<LeaveDistributionReport> => {
    const response = await apiClient.get("/reports/leave/distribution", { params: { year } });
    return response.data?.data || response.data;
  },
  getSummary: async (year?: number): Promise<LeaveSummaryReport> => {
    const response = await apiClient.get("/reports/leave/summary", { params: { year } });
    return response.data?.data || response.data;
  },
};

// ─── Evaluation Reports ─────────────────────────────────────────────────────

export interface EvaluationGradeDistribution {
  periodId: string;
  periodName: string;
  totalForms: number;
  completed: number;
  gradeDistribution: { grade: string; label: string; count: number; percentage: number }[];
  avgScore: number;
}

export interface EvaluationDepartmentComparison {
  periodId: string;
  departments: {
    departmentId: string;
    departmentAr: string;
    totalForms: number;
    completed: number;
    avgScore: number;
    topScore: number;
  }[];
}

export interface EvaluationRecommendations {
  periodId: string;
  summary: { recommendation: string; count: number }[];
  items: {
    employee: { id: string; employeeNumber: string; firstNameAr: string; lastNameAr: string };
    finalScore: number;
    hrRecommendation: string;
    gmStatus: string;
  }[];
}

export const evaluationReportsApi = {
  getGradeDistribution: async (params: { periodId?: string }): Promise<EvaluationGradeDistribution> => {
    const response = await apiClient.get("/evaluation-reports/grade-distribution", { params });
    return response.data?.data || response.data;
  },

  getDepartmentComparison: async (params: { periodId?: string }): Promise<EvaluationDepartmentComparison> => {
    const response = await apiClient.get("/evaluation-reports/department-comparison", { params });
    return response.data?.data || response.data;
  },

  getRecommendations: async (params: { periodId?: string }): Promise<EvaluationRecommendations> => {
    const response = await apiClient.get("/evaluation-reports/recommendations", { params });
    return response.data?.data || response.data;
  },
};

// ─── Attendance Reports ─────────────────────────────────────────────────────

export interface TopAbsenceItem {
  employee: { id: string; employeeNumber: string; firstNameAr: string; lastNameAr: string };
  absenceCount: number;
  lateCount: number;
  totalLateMinutes: number;
  totalLateHours: number;
}

export interface OvertimeItem {
  employee: { id: string; employeeNumber: string; firstNameAr: string; lastNameAr: string };
  overtimeDays: number;
  totalOvertimeMinutes: number;
  totalOvertimeHours: number;
}

export const attendanceReportsApi = {
  getDaily: async (params: { date?: string; departmentId?: string; employeeId?: string }) => {
    const response = await apiClient.get("/attendance-reports/daily", { params });
    return response.data?.data || response.data;
  },

  getMonthly: async (params: { year: number; month: number; employeeId?: string; departmentId?: string }) => {
    const response = await apiClient.get("/attendance-reports/monthly", { params });
    return response.data?.data || response.data;
  },

  getTopAbsences: async (params: { year: number; month?: number; limit?: number }): Promise<{ year: number; month: number | null; limit: number; items: TopAbsenceItem[] }> => {
    const response = await apiClient.get("/attendance-reports/top-absences", { params });
    return response.data?.data || response.data;
  },

  getOvertime: async (params: { year: number; month?: number }): Promise<{ year: number; month: number | null; totalOvertimeHours: number; items: OvertimeItem[] }> => {
    const response = await apiClient.get("/attendance-reports/overtime", { params });
    return response.data?.data || response.data;
  },

  getSummary: async (params: { dateFrom?: string; dateTo?: string; departmentId?: string }) => {
    const response = await apiClient.get("/attendance-reports/summary", { params });
    return response.data?.data || response.data;
  },

  getBreaks: async (params: { dateFrom?: string; dateTo?: string; departmentId?: string }) => {
    const response = await apiClient.get("/attendance-reports/breaks", { params });
    return response.data?.data || response.data;
  },
};
