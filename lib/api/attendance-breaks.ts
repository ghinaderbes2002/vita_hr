import { apiClient } from "./client";

export type BreakType = "PRAYER" | "MEAL" | "PERSONAL" | "WORK_RELATED" | "OTHER";
export type BreakStatus = "PENDING" | "AUTHORIZED" | "REJECTED";

export interface AttendanceBreak {
  id: string;
  attendanceRecordId: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  type: BreakType | null;
  reason: string | null;
  status: BreakStatus;
  authorizedBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export const BREAK_TYPE_LABELS: Record<BreakType, string> = {
  PRAYER:       "صلاة",
  MEAL:         "طعام",
  PERSONAL:     "شخصي",
  WORK_RELATED: "متعلق بالعمل",
  OTHER:        "أخرى",
};

export const attendanceBreaksApi = {
  getByRecord: async (recordId: string): Promise<AttendanceBreak[]> => {
    const response = await apiClient.get(`/attendance-records/${recordId}/breaks`);
    return response.data?.data || response.data;
  },

  getMyBreaks: async (params?: { dateFrom?: string; dateTo?: string }): Promise<AttendanceBreak[]> => {
    const response = await apiClient.get("/attendance-breaks/my", { params });
    return response.data?.data || response.data;
  },

  authorize: async (breakId: string, reason: string): Promise<AttendanceBreak> => {
    const response = await apiClient.patch(`/attendance-breaks/${breakId}/authorize`, { reason });
    return response.data?.data || response.data;
  },

  reject: async (breakId: string, reason: string): Promise<AttendanceBreak> => {
    const response = await apiClient.patch(`/attendance-breaks/${breakId}/reject`, { reason });
    return response.data?.data || response.data;
  },

  updateType: async (breakId: string, type: BreakType): Promise<AttendanceBreak> => {
    const response = await apiClient.patch(`/attendance-breaks/${breakId}/type`, { type });
    return response.data?.data || response.data;
  },

  updateReason: async (breakId: string, reason: string): Promise<AttendanceBreak> => {
    const response = await apiClient.patch(`/attendance-breaks/${breakId}/reason`, { reason });
    return response.data?.data || response.data;
  },
};
