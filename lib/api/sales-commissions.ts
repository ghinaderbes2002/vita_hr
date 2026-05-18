import { apiClient } from "./client";

export interface SalesCommission {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  amount: number;
  description: string;
  salesReference?: string | null;
  status: "DRAFT" | "CONFIRMED";
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    employeeNumber: string;
  };
}

export interface CreateSalesCommissionDto {
  employeeId: string;
  year: number;
  month: number;
  amount: number;
  description: string;
  salesReference?: string;
}

export const salesCommissionsApi = {
  getAll: async (params?: {
    employeeId?: string;
    year?: number;
    month?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: SalesCommission[]; total: number }> => {
    const { data } = await apiClient.get("/sales-commissions", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items || d?.data || (Array.isArray(d) ? d : []),
      total: d?.total ?? 0,
    };
  },

  getOne: async (id: string): Promise<SalesCommission> => {
    const { data } = await apiClient.get(`/sales-commissions/${id}`);
    return data?.data ?? data;
  },

  create: async (
    dto: CreateSalesCommissionDto,
  ): Promise<SalesCommission> => {
    const { data } = await apiClient.post("/sales-commissions", dto);
    return data?.data ?? data;
  },

  update: async (
    id: string,
    dto: Partial<CreateSalesCommissionDto>,
  ): Promise<SalesCommission> => {
    const { data } = await apiClient.patch(`/sales-commissions/${id}`, dto);
    return data?.data ?? data;
  },

  confirm: async (id: string): Promise<SalesCommission> => {
    const { data } = await apiClient.post(`/sales-commissions/${id}/confirm`);
    return data?.data ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales-commissions/${id}`);
  },
};
