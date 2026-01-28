import { Badge } from "@/components/ui/badge";
import { AlertType } from "@/lib/api/attendance-alerts";

interface AlertTypeBadgeProps {
  type: AlertType;
}

const typeConfig: Record<AlertType, { label: string }> = {
  LATE: { label: "تأخير" },
  ABSENT: { label: "غياب" },
  EARLY_LEAVE: { label: "خروج مبكر" },
  MISSING_CLOCK_OUT: { label: "نسيان تسجيل الانصراف" },
  CONSECUTIVE_ABSENCE: { label: "غياب متتالي" },
};

export function AlertTypeBadge({ type }: AlertTypeBadgeProps) {
  const config = typeConfig[type];

  return <Badge variant="outline">{config.label}</Badge>;
}
