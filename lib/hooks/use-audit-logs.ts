import { useQuery } from "@tanstack/react-query";
import { auditLogsApi, AuditLogsParams } from "@/lib/api/audit-logs";

export function useAuditLogs(params?: AuditLogsParams) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => auditLogsApi.getAll(params),
  });
}
