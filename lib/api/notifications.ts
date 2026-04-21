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
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const notificationsApi = {
  getAll: async (params?: { isRead?: boolean }): Promise<Notification[]> => {
    const response = await apiClient.get("/notifications", { params });
    const result = response.data?.data ?? response.data;
    return Array.isArray(result) ? result : [];
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
