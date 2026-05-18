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

  // حقول جديدة (كلها optional — لا تكسر الكشوف القديمة)
  hourlyRate?: string | number;
  dailyWageSnapshot?: string | number | null;

  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  unpaidLeaveAmount?: string | number;
  sickLeaveDays?: number;
  hourlyLeaveMinutes?: number;
  hourlyLeaveAmount?: string | number;

  overtimeWorkdayMinutes?: number;
  overtimeWorkdayPay?: string | number;
  overtimeHolidayMinutes?: number;
  overtimeHolidayPay?: string | number;

  internalMissionDays?: number;
  internalMissionAmount?: string | number;
  externalMissionDays?: number;
  externalMissionAmount?: string | number;

  commissionAmount?: string | number;
  advanceDeduction?: string | number;
  otherDeductionAmount?: string | number;
  otherDeductionNotes?: string | null;

  roundedNetSalary?: number;
  employmentStatusAtGenTime?: string | null;
  notes?: string | null;
  status?: "DRAFT" | "CONFIRMED" | "EXPORTED";

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

// ---- Payslip interfaces (nested structure from backend) ----

export interface PayslipLeaves {
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  hourlyLeaveMinutes: number;
}

export interface PayslipAttendance {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  absentUnjustified: number;
  lateDays: number;
  totalLateMinutes: number;
  overtimeMinutes: number;
  overtimeWorkdayMinutes: number;
  overtimeHolidayMinutes: number;
}

export interface PayslipMissions {
  internalMissionDays: number;
  internalMissionAmount: number;
  externalMissionDays: number;
  externalMissionAmount: number;
}

export interface PayslipDeductions {
  attendanceDeduction: number;
  absenceDeduction: number;
  unpaidLeaveAmount: number;
  hourlyLeaveAmount: number;
  advanceDeduction: number;
  otherDeductionAmount: number;
  otherDeductionNotes: string | null;
  totalDeduction: number;
}

export interface PayslipSalary {
  currency: string;
  basicSalary: number;
  dailyWageSnapshot?: number | null;
  hourlyRate?: number;
  allowances: { total: number; breakdown: Record<string, number> };
  overtimePay: number;
  overtimeWorkdayPay: number;
  overtimeHolidayPay: number;
  commissionAmount: number;
  grossSalary: number;
  bonusAmount: number;
  bonusDetails: BonusDetail[];
  penaltyAmount: number;
  penaltyDetails: PenaltyDetail[];
  deductions: PayslipDeductions;
  netSalary: number;
  roundedNetSalary?: number;
  // حقول legacy (للتوافق مع الكشوف القديمة)
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

export interface PayslipResponse {
  payrollId: string;
  period: { year: number; month: number; monthName: string };
  employee: {
    id: string;
    employeeNumber?: string;
    firstNameAr?: string;
    lastNameAr?: string;
    fullNameAr?: string;
    jobTitle?: string;
    department?: string;
    hireDate?: string;
  };
  attendance: PayslipAttendance;
  leaves: PayslipLeaves;
  missions: PayslipMissions;
  salary: PayslipSalary;
  status: "DRAFT" | "CONFIRMED" | "EXPORTED";
  employmentStatusAtGenTime?: string | null;
  notes?: string | null;
  policy?: { nameAr: string; nameEn: string } | null;
  generatedAt?: string;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
}

// legacy — يُبقى للتوافق مع الكود القديم
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

const MONTH_NAMES = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const payrollApi = {
  getAll: async (params?: {
    year?: number;
    month?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: PayrollItem[]; total: number; totalPages: number }> => {
    const { data } = await apiClient.get("/payroll", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items || d?.data || (Array.isArray(d) ? d : []),
      total: d?.total ?? 0,
      totalPages: d?.totalPages ?? 0,
    };
  },

  getPayslip: async (
    employeeId: string,
    year: number,
    month: number,
  ): Promise<PayslipResponse> => {
    const { data } = await apiClient.get(
      `/payroll/${employeeId}/${year}/${month}/payslip`,
    );
    return data?.data ?? data;
  },

  generate: async (
    year: number,
    month: number,
  ): Promise<GeneratePayrollResult> => {
    const { data } = await apiClient.post("/payroll/generate", { year, month });
    return data?.data ?? data;
  },

  exportXlsx: async (year: number, month: number): Promise<void> => {
    const response = await apiClient.get(
      `/payroll/export-xlsx/${year}/${month}`,
      { responseType: "blob" },
    );
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `شهر-${MONTH_NAMES[month]}-${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  updateOtherDeduction: async (
    payrollId: string,
    amount: number,
    notes?: string,
  ): Promise<PayrollItem> => {
    const { data } = await apiClient.patch(
      `/payroll/${payrollId}/other-deduction`,
      { amount, notes },
    );
    return data?.data ?? data;
  },

  updateNote: async (
    payrollId: string,
    notes: string,
  ): Promise<PayrollItem> => {
    const { data } = await apiClient.patch(`/payroll/${payrollId}/note`, {
      notes,
    });
    return data?.data ?? data;
  },

  resetMonth: async (year: number, month: number) => {
    const { data } = await apiClient.post(`/payroll/reset/${year}/${month}`);
    return data?.data ?? data;
  },
};
