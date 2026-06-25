"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { RequestStatus } from "@/types";

const statusVariantMap: Record<RequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  IN_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
  PENDING_EXIT_INTERVIEW: "secondary",
};

const statusColorMap: Record<RequestStatus, string> = {
  DRAFT: "text-muted-foreground",
  IN_APPROVAL: "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950",
  APPROVED: "text-green-600 border-green-300 bg-green-50 dark:bg-green-950",
  REJECTED: "",
  CANCELLED: "text-slate-500 border-slate-300 bg-slate-50",
  PENDING_EXIT_INTERVIEW: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950",
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
