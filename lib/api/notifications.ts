import { apiClient } from "./client";

export type NotificationType =
  | "LEAVE_REQUEST_SUBMITTED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_PENDING_APPROVAL"
  | "ATTENDANCE_ALERT"
  | "ATTENDANCE_JUSTIFICATION"
  | "EVALUATION_ASSIGNED"
  | "PROBATION_END_REMINDER"
  | "DOCUMENT_EXPIRY"
  | "BIRTHDAY"
  | "WELCOME"
  | "CONTRACT_EXPIRY"
  | "ADDITIONAL_ASSIGNMENT_REQUEST"
  | "ADDITIONAL_ASSIGNMENT_DECISION"
  | "ONBOARDING_TASK"
  | "EMPLOYEES_WITHOUT_SCHEDULE"
  | "GENERAL"
  | "TARDINESS_BALANCE_USED"
  | "TARDINESS_BALANCE_LOW"
  | "TARDINESS_BALANCE_DEPLETED"
  | "TARDINESS_COMPENSATION_DUE"
  | "TARDINESS_DEDUCTION_PENDING"
  | "TARDINESS_OFFSET_RESTORED"
  | "MONTHLY_PAYROLL_READY"
  | "ATTENDANCE_NEEDS_REVIEW"
  | "BREAK_EXCEEDED"
  | "ANOMALY_OVERTIME"
  | "ANOMALY_MANY_STAMPS"
  | "ANOMALY_NO_STAMP"
  | "CLINIC_APPOINTMENT_REMINDER"
  | "CLINIC_CASE_STATUS_CHANGED"
  | "CLINIC_LOW_STOCK"
  | "CLINIC_COMMITTEE_PENDING"
  | "CLINIC_DELIVERY_READY";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  isRead: boolean;
  data?: any;
  readAt?: string | null;
  actionUrl?: string;
  createdAt: string;
}

export const notificationsApi = {
  getAll: async (params?: { isRead?: boolean; page?: number; limit?: number }): Promise<Notification[]> => {
    const response = await apiClient.get("/notifications", { params });
    const result = response.data?.data ?? response.data;
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.items)) return result.items;
    return [];
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get("/notifications/unread-count");
    return response.data?.data?.count ?? 0;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data?.data || response.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.patch("/notifications/read-all");
    return response.data?.data || response.data;
  },
};
