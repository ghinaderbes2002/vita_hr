"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AlertSeverity } from "@/lib/api/attendance-alerts";

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
}

const severityVariant: Record<AlertSeverity, "default" | "secondary" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

export function AlertSeverityBadge({ severity }: AlertSeverityBadgeProps) {
  const t = useTranslations();
  return (
    <Badge variant={severityVariant[severity]}>
      {t(`attendance.alertSeverities.${severity}` as any)}
    </Badge>
  );
}
