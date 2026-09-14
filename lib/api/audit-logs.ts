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
  description?: string;
  metadata?: Record<string, any>;
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
  method?: string;
}

export interface AuditLogResource {
  resource: string;
  count?: number;
}

export const auditLogsApi = {
  getAll: async (params?: AuditLogsParams): Promise<any> => {
    const response = await apiClient.get("/audit-logs", { params });
    return response.data;
  },

  /** Every resource that actually appears in the log, with how many entries each has. */
  getResources: async (): Promise<AuditLogResource[]> => {
    const { data } = await apiClient.get("/audit-logs/resources");
    const d = data?.data ?? data;
    const list: any[] = Array.isArray(d) ? d : d?.items ?? [];
    return list
      .map((r) =>
        typeof r === "string"
          ? { resource: r }
          : { resource: r?.resource ?? r?.name ?? r?.value, count: r?.count ?? r?._count },
      )
      .filter((r): r is AuditLogResource => typeof r.resource === "string" && r.resource.length > 0);
  },
};
