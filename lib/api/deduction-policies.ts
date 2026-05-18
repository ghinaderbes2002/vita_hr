import { apiClient } from "./client";

export type DeductionType = "MINUTE_BY_MINUTE" | "TIERED";
export type BreakDeductionType = "MINUTE_BY_MINUTE" | "IGNORE" | "DOUBLE";

export interface DeductionTier {
  fromMinute: number;
  toMinute: number | null;
  deductionDays: number;
}

export interface DeductionPolicy {
  id: string;
  nameAr: string;
  nameEn: string;
  isDefault: boolean;
  lateToleranceMinutes: number;
  lateDeductionType: DeductionType;
  lateDeductionTiers?: DeductionTier[] | null;
  earlyLeaveDeductionType: DeductionType;
  earlyLeaveTiers?: DeductionTier[] | null;
  absenceDeductionDays: number;
  repeatLateThreshold?: number | null;
  repeatLatePenaltyDays?: number | null;
  breakOverLimitDeduction: BreakDeductionType;
  holidayOvertimeMultiplier?: number | null;
  internalMissionDailyRate?: number | null;
  externalMissionDailyRate?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { employees?: number };
}

export interface CreateDeductionPolicyData {
  nameAr: string;
  nameEn: string;
  isDefault?: boolean;
  lateToleranceMinutes?: number;
  lateDeductionType?: DeductionType;
  lateDeductionTiers?: string;
  earlyLeaveDeductionType?: DeductionType;
  earlyLeaveTiers?: string;
  absenceDeductionDays?: number;
  repeatLateThreshold?: number;
  repeatLatePenaltyDays?: number;
  breakOverLimitDeduction?: BreakDeductionType;
  holidayOvertimeMultiplier?: number;
  internalMissionDailyRate?: number;
  externalMissionDailyRate?: number;
  isActive?: boolean;
}

export const deductionPoliciesApi = {
  getAll: async (all = false): Promise<DeductionPolicy[]> => {
    const response = await apiClient.get("/deduction-policies", {
      params: all ? { all: "true" } : {},
    });
    return response.data?.data || response.data;
  },

  getById: async (id: string): Promise<DeductionPolicy> => {
    const response = await apiClient.get(`/deduction-policies/${id}`);
    return response.data?.data || response.data;
  },

  create: async (data: CreateDeductionPolicyData): Promise<DeductionPolicy> => {
    const response = await apiClient.post("/deduction-policies", data);
    return response.data?.data || response.data;
  },

  update: async (
    id: string,
    data: Partial<CreateDeductionPolicyData>
  ): Promise<DeductionPolicy> => {
    const response = await apiClient.patch(`/deduction-policies/${id}`, data);
    return response.data?.data || response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deduction-policies/${id}`);
  },
};
