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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeductionPolicyData {
  nameAr: string;
  nameEn: string;
  isDefault?: boolean;
  lateToleranceMinutes?: number;
  lateDeductionType?: DeductionType;
  lateDeductionTiers?: string;       // JSON.stringify(DeductionTier[])
  earlyLeaveDeductionType?: DeductionType;
  earlyLeaveTiers?: string;          // JSON.stringify(DeductionTier[])
  absenceDeductionDays?: number;
  repeatLateThreshold?: number;
  repeatLatePenaltyDays?: number;
  breakOverLimitDeduction?: BreakDeductionType;
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
