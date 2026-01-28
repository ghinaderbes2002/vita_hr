import { Badge } from "@/components/ui/badge";
import { AlertSeverity } from "@/lib/api/attendance-alerts";

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
}

const severityConfig: Record<
  AlertSeverity,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  LOW: { label: "منخفضة", variant: "secondary" },
  MEDIUM: { label: "متوسطة", variant: "default" },
  HIGH: { label: "عالية", variant: "destructive" },
};

export function AlertSeverityBadge({ severity }: AlertSeverityBadgeProps) {
  const config = severityConfig[severity];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
