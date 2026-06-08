"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { MaintenanceStatus } from "@/lib/api/maintenance-requests";

const statusClasses: Record<MaintenanceStatus, string> = {
  PENDING_MANAGER: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PENDING_LOGISTICS: "bg-blue-100 text-blue-800 border-blue-300",
  PENDING_EXECUTIVE: "bg-purple-100 text-purple-800 border-purple-300",
  ASSIGNED: "bg-indigo-100 text-indigo-800 border-indigo-300",
  DONE: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const t = useTranslations();
  return (
    <Badge variant="outline" className={statusClasses[status] ?? ""}>
      {t(`maintenance.statuses.${status}` as any)}
    </Badge>
  );
}
