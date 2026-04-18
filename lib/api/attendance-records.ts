import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EARLY_LEAVE"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeNumber: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
  };
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  workedMinutes?: number;
  netWorkedMinutes?: number;
  totalBreakMinutes?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  breakMinutes?: number;
  status: AttendanceStatus;
  syncError?: string;
  interpretedAs?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
  clockInIp?: string;
  clockOutIp?: string;
  isManualEntry?: boolean;
  manualEntryBy?: string;
  manualEntryReason?: string;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInData {
  location?: string;
  notes?: string;
}

export interface CheckOutData {
  location?: string;
  notes?: string;
}

export interface CreateAttendanceRecordData {
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  workMinutes?: number;
  checkInLocation?: string;
  checkOutLocation?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  isManualEntry?: boolean;
  manualEntryBy?: string;
  manualEntryReason?: string;
}

export interface UpdateAttendanceRecordData {
  checkInTime?: string;
  checkOutTime?: string;
  status?: AttendanceStatus;
  workMinutes?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  checkInLocation?: string;
  checkOutLocation?: string;
}

export interface AttendanceQueryParams {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export const attendanceRecordsApi = {
  checkIn: async (data: CheckInData): Promise<AttendanceRecord> => {
    const response = await apiClient.post("/attendance-records/check-in", data);
    return response.data.data;
  },

  checkOut: async (data: CheckOutData): Promise<AttendanceRecord> => {
    const response = await apiClient.post("/attendance-records/check-out", data);
    return response.data.data;
  },

  getMyAttendance: async (params: AttendanceQueryParams): Promise<ApiResponse<AttendanceRecord[]>> => {
    const response = await apiClient.get("/attendance-records/my-attendance", { params });
    return response.data;
  },

  getAll: async (params: AttendanceQueryParams): Promise<ApiResponse<AttendanceRecord[]>> => {
    const response = await apiClient.get("/attendance-records", { params });
    return response.data;
  },

  getById: async (id: string): Promise<AttendanceRecord> => {
    const response = await apiClient.get(`/attendance-records/${id}`);
    return response.data.data;
  },

  create: async (data: CreateAttendanceRecordData): Promise<AttendanceRecord> => {
    const response = await apiClient.post("/attendance-records", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateAttendanceRecordData): Promise<AttendanceRecord> => {
    const response = await apiClient.patch(`/attendance-records/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/attendance-records/${id}`);
  },
};
