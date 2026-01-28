import { Badge } from "@/components/ui/badge";
import { LeaveRequestStatus } from "@/lib/api/leave-requests";
import { useTranslations } from "next-intl";

interface StatusBadgeProps {
  status: LeaveRequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("leaves.statuses");

  const variants: Record<LeaveRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "secondary",
    PENDING_MANAGER: "outline",
    MANAGER_APPROVED: "default",
    MANAGER_REJECTED: "destructive",
    PENDING_HR: "outline",
    APPROVED: "default",
    REJECTED: "destructive",
    CANCELLED: "secondary",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
  };

  const colors: Record<LeaveRequestStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    PENDING_MANAGER: "bg-yellow-100 text-yellow-800",
    MANAGER_APPROVED: "bg-blue-100 text-blue-800",
    MANAGER_REJECTED: "bg-red-100 text-red-800",
    PENDING_HR: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant={variants[status]} className={colors[status]}>
      {t(status.toLowerCase())}
    </Badge>
  );
}
