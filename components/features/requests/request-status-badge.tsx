"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { RequestStatus } from "@/types";

const statusVariantMap: Record<RequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_MANAGER: "secondary",
  PENDING_HR: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

const statusColorMap: Record<RequestStatus, string> = {
  DRAFT: "text-muted-foreground",
  PENDING_MANAGER: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950",
  PENDING_HR: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950",
  APPROVED: "text-green-600 border-green-300 bg-green-50 dark:bg-green-950",
  REJECTED: "",
  CANCELLED: "text-muted-foreground",
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
