import { Badge } from "@/components/ui/badge";
import { AlertStatus } from "@/lib/api/attendance-alerts";

interface AlertStatusBadgeProps {
  status: AlertStatus;
}

const statusConfig: Record<
  AlertStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  OPEN: { label: "مفتوح", variant: "destructive" },
  ACKNOWLEDGED: { label: "تم الإقرار", variant: "secondary" },
  RESOLVED: { label: "تم الحل", variant: "default" },
  DISMISSED: { label: "مرفوض", variant: "outline" },
};

export function AlertStatusBadge({ status }: AlertStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
