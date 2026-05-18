import { apiClient } from "./client";

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  totalAmount: number;
  installmentAmount: number;
  remainingBalance: number;
  totalInstallments: number;
  paidInstallments: number;
  startYear: number;
  startMonth: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  reason?: string | null;
  notes?: string | null;
  createdBy: string;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    employeeNumber: string;
  };
}

export interface SalaryAdvanceInstallment {
  id: string;
  advanceId: string;
  year: number;
  month: number;
  amount: number;
  payrollId?: string | null;
  deductedAt: string;
}

export interface CreateSalaryAdvanceDto {
  employeeId: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  startYear: number;
  startMonth: number;
  reason?: string;
  notes?: string;
}

export const salaryAdvancesApi = {
  getAll: async (params?: {
    employeeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: SalaryAdvance[]; total: number }> => {
    const { data } = await apiClient.get("/salary-advances", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items || d?.data || (Array.isArray(d) ? d : []),
      total: d?.total ?? 0,
    };
  },

  getOne: async (
    id: string,
  ): Promise<SalaryAdvance & { installments: SalaryAdvanceInstallment[] }> => {
    const { data } = await apiClient.get(`/salary-advances/${id}`);
    return data?.data ?? data;
  },

  create: async (dto: CreateSalaryAdvanceDto): Promise<SalaryAdvance> => {
    const { data } = await apiClient.post("/salary-advances", dto);
    return data?.data ?? data;
  },

  update: async (
    id: string,
    dto: Partial<CreateSalaryAdvanceDto>,
  ): Promise<SalaryAdvance> => {
    const { data } = await apiClient.patch(`/salary-advances/${id}`, dto);
    return data?.data ?? data;
  },

  cancel: async (id: string, reason: string): Promise<SalaryAdvance> => {
    const { data } = await apiClient.post(`/salary-advances/${id}/cancel`, {
      reason,
    });
    return data?.data ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/salary-advances/${id}`);
  },
};
