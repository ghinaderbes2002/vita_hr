"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AlertType } from "@/lib/api/attendance-alerts";

interface AlertTypeBadgeProps {
  type: AlertType;
}

export function AlertTypeBadge({ type }: AlertTypeBadgeProps) {
  const t = useTranslations();
  return (
    <Badge variant="outline">
      {t(`attendance.alertTypesEnum.${type}` as any, { defaultValue: type })}
    </Badge>
  );
}
