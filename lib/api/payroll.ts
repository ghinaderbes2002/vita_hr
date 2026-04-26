import { apiClient } from "./client";

export interface BonusDetail {
  requestId: string;
  amount: number;
  reason: string;
}

export interface PenaltyDetail {
  requestId: string;
  amount: number;
  description: string;
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  basicSalary: string | number;
  grossSalary: string | number;
  netSalary: string | number;
  bonusAmount: string | number;
  penaltyAmount: string | number;
  bonusDetails: string | BonusDetail[];
  penaltyDetails: string | PenaltyDetail[];
  employee?: {
    id: string;
    employeeNumber: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    department?: { id: string; nameAr: string };
    jobTitle?: { id: string; nameAr: string };
  };
  createdAt: string;
}

export interface PayslipSalary {
  basicSalary: string | number;
  allowances: { total: string | number; breakdown: Record<string, number> };
  overtimePay: string | number;
  grossSalary: string | number;
  bonusAmount: string | number;
  bonusDetails: BonusDetail[];
  penaltyAmount: string | number;
  penaltyDetails: PenaltyDetail[];
  deductions: {
    attendanceDeduction: string | number;
    absenceDeduction: string | number;
    totalDeduction: string | number;
  };
  netSalary: string | number;
  // حقول جديدة من الباك
  deductibleBaseSalary?: number;
  excludedAllowancesAmount?: number;
  workingDaysInMonth?: number;
  employeeWorkingDays?: number;
  proRationFactor?: number;
  totalLateMinutesGross?: number;
  totalLateMinutesEffective?: number;
  totalCompensationMinutes?: number;
  deductionBreakdown?: {
    lateDeduction: number;
    absenceDeduction: number;
    breakOverLimitDeduction: number;
    totalDeduction: number;
  } | null;
}

export interface Payslip {
  employee: {
    id: string;
    employeeNumber: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    department?: { nameAr: string };
    jobTitle?: { nameAr: string };
  };
  year: number;
  month: number;
  salary: PayslipSalary;
}

export interface GeneratePayrollResult {
  year: number;
  month: number;
  generated: number;
  skipped: number;
  errors: number;
  results: any[];
}

export const payrollApi = {
  getAll: async (params?: { year?: number; month?: number; page?: number; limit?: number }): Promise<{ items: PayrollItem[]; total: number; totalPages: number }> => {
    const { data } = await apiClient.get("/payroll", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items || d?.data || (Array.isArray(d) ? d : []),
      total: d?.total ?? 0,
      totalPages: d?.totalPages ?? 0,
    };
  },

  getPayslip: async (employeeId: string, year: number, month: number): Promise<Payslip> => {
    const { data } = await apiClient.get(`/payroll/${employeeId}/${year}/${month}/payslip`);
    return data?.data ?? data;
  },

  generate: async (year: number, month: number): Promise<GeneratePayrollResult> => {
    const { data } = await apiClient.post("/payroll/generate", { year, month });
    return data?.data ?? data;
  },
};
