import { apiClient } from "./client";

export type NotificationType =
  // إشعارات الإجازات
  | "LEAVE_REQUEST_SUBMITTED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_CANCELLED"
  | "LEAVE_REQUEST_PENDING_APPROVAL"
  // إشعارات الحضور
  | "ATTENDANCE_ALERT"
  | "ATTENDANCE_JUSTIFICATION"
  | "ATTENDANCE_NEEDS_REVIEW"
  | "BREAK_EXCEEDED"
  | "TARDINESS_BALANCE_USED"
  | "TARDINESS_BALANCE_LOW"
  | "TARDINESS_BALANCE_DEPLETED"
  | "TARDINESS_COMPENSATION_DUE"
  | "TARDINESS_DEDUCTION_PENDING"
  | "TARDINESS_OFFSET_RESTORED"
  // إشعارات التقييم
  | "EVALUATION_ASSIGNED"
  | "EVALUATION_SUBMITTED"
  | "PROBATION_REMINDER"
  | "PROBATION_END_REMINDER"
  // إشعارات الموظفين
  | "DOCUMENT_EXPIRY"
  | "CONTRACT_EXPIRY"
  | "BIRTHDAY"
  | "WELCOME"
  | "EMPLOYEES_WITHOUT_SCHEDULE"
  // إشعارات الطلبات
  | "ADDITIONAL_ASSIGNMENT_REQUEST"
  | "ADDITIONAL_ASSIGNMENT_DECISION"
  | "PENALTY_DECISION"
  | "REWARD_DECISION"
  // إشعارات عامة
  | "ONBOARDING_TASK"
  | "OFFBOARDING_TASK"
  | "MONTHLY_PAYROLL_READY"
  | "GENERAL"
  // إشعارات المخزون الطبي
  | "INVENTORY_REQUEST"
  | "INVENTORY_REQUEST_UPDATE"
  // إشعارات الأطراف الصناعية
  | "CASE_ALERT"
  | "CASE_ALERT_RESPONSE";

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
  createdAt: string;
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const notificationsApi = {
  getPage: async (params?: { isRead?: boolean; page?: number; limit?: number }): Promise<NotificationPage> => {
    const response = await apiClient.get("/notifications", { params: { limit: 20, ...params } });
    const result = response.data?.data ?? response.data;
    if (Array.isArray(result)) return { items: result, total: result.length, page: 1, limit: result.length, totalPages: 1 };
    return {
      items: Array.isArray(result?.items) ? result.items : [],
      total: result?.total ?? 0,
      page: result?.page ?? 1,
      limit: result?.limit ?? 20,
      totalPages: result?.totalPages ?? 1,
    };
  },

  getAll: async (params?: { isRead?: boolean; page?: number; limit?: number }): Promise<Notification[]> => {
    const result = await notificationsApi.getPage(params);
    return result.items;
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
