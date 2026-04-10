import { apiClient } from "./client";

export interface AuditLog {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  ip: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  resource?: string;
}

export const auditLogsApi = {
  getAll: async (params?: AuditLogsParams): Promise<any> => {
    const response = await apiClient.get("/audit-logs", { params });
    return response.data;
  },
};
