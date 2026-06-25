"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { RequestStatus } from "@/types";

const statusVariantMap: Record<RequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_MANAGER: "secondary",
  PENDING_HR: "secondary",
  IN_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
  PENDING_EXIT_INTERVIEW: "secondary",
  PENDING_LOGISTICS: "secondary",
  PENDING_EXECUTIVE: "secondary",
  ASSIGNED: "secondary",
  DONE: "default",
};

const statusColorMap: Record<RequestStatus, string> = {
  DRAFT: "text-muted-foreground",
  PENDING_MANAGER: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950",
  PENDING_HR: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950",
  IN_APPROVAL: "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950",
  APPROVED: "text-green-600 border-green-300 bg-green-50 dark:bg-green-950",
  REJECTED: "",
  CANCELLED: "text-slate-500 border-slate-300 bg-slate-50",
  PENDING_EXIT_INTERVIEW: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950",
  PENDING_LOGISTICS: "text-cyan-600 border-cyan-300 bg-cyan-50 dark:bg-cyan-950",
  PENDING_EXECUTIVE: "text-violet-600 border-violet-300 bg-violet-50 dark:bg-violet-950",
  ASSIGNED: "text-indigo-600 border-indigo-300 bg-indigo-50 dark:bg-indigo-950",
  DONE: "text-green-600 border-green-300 bg-green-50 dark:bg-green-950",
};

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const t = useTranslations();
  return (
    <Badge
      variant={statusVariantMap[status]}
      className={statusColorMap[status]}
    >
      {t(`requests.statuses.${status}`)}
    </Badge>
  );
}
