import { Badge } from "@/components/ui/badge";
import { AttendanceStatus } from "@/lib/api/attendance-records";

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

const statusConfig: Record<
  AttendanceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PRESENT: { label: "حاضر", variant: "default" },
  ABSENT: { label: "غائب", variant: "destructive" },
  LATE: { label: "متأخر", variant: "secondary" },
  EARLY_LEAVE: { label: "خروج مبكر", variant: "secondary" },
  HALF_DAY: { label: "نصف يوم", variant: "outline" },
  ON_LEAVE: { label: "في إجازة", variant: "outline" },
};

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
