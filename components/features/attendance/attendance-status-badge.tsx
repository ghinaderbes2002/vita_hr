import { Badge } from "@/components/ui/badge";
import { AttendanceStatus } from "@/lib/api/attendance-records";

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

const statusConfig: Record<
  AttendanceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  PRESENT: { label: "حاضر", variant: "default", className: "bg-green-600 hover:bg-green-700 text-white" },
  ABSENT: { label: "غائب", variant: "destructive" },
  LATE: { label: "متأخر", variant: "secondary", className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200" },
  EARLY_LEAVE: { label: "خروج مبكر", variant: "secondary", className: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200" },
  HALF_DAY: { label: "نصف يوم", variant: "outline", className: "bg-sky-50 text-sky-700 border-sky-200" },
  ON_LEAVE: { label: "في إجازة", variant: "outline", className: "bg-blue-100 text-blue-700 border-blue-200" },
  PARTIAL_LEAVE: { label: "إجازة ساعية", variant: "outline", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  HOLIDAY: { label: "عطلة رسمية", variant: "outline", className: "bg-gray-200 text-gray-700 border-gray-300" },
  WEEKEND: { label: "إجازة أسبوعية", variant: "outline", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
