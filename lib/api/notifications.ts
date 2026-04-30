import { apiClient } from "./client";

export type NotificationType =
  | "LEAVE_REQUEST_SUBMITTED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_PENDING_APPROVAL"
  | "GENERAL";

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
  getAll: async (params?: { isRead?: boolean }): Promise<Notification[]> => {
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
