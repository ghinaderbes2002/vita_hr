"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AlertStatus } from "@/lib/api/attendance-alerts";

interface AlertStatusBadgeProps {
  status: AlertStatus;
}

const statusVariant: Record<AlertStatus, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "destructive",
  ACKNOWLEDGED: "secondary",
  RESOLVED: "default",
  DISMISSED: "outline",
};

export function AlertStatusBadge({ status }: AlertStatusBadgeProps) {
  const t = useTranslations();
  return (
    <Badge variant={statusVariant[status]}>
      {t(`attendance.alertStatuses.${status}` as any)}
    </Badge>
  );
}
