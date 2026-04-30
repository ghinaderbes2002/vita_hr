import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
  };
  leaveTypeId: string;
  leaveType?: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    color?: string;
  };
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  isHalfDay: boolean;
  halfDayPeriod?: "MORNING" | "AFTERNOON";
  status: LeaveRequestStatus;
  substituteId?: string;
  substitute?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
  };
  substituteStatus?: "PENDING" | "APPROVED" | "REJECTED";
  substituteNotes?: string;
  managerNotes?: string;
  hrNotes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  // حقول الإجازة الساعية
  isHourlyLeave?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  equivalentDays?: number | null;
  // خصم الراتب عند الاعتماد
  deductionInfo?: {
    fromDay: number;
    toDay: number;
    days: number;
    deductionPercent: number;
  }[] | null;
}

export interface CreateHourlyLeaveData {
  leaveTypeId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export type LeaveRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "PENDING_SUBSTITUTE"
  | "PENDING_MANAGER"
  | "MANAGER_APPROVED"
  | "MANAGER_REJECTED"
  | "PENDING_HR"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface CreateLeaveRequestData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay: boolean;
  halfDayPeriod?: "MORNING" | "AFTERNOON";
  substituteId?: string;
  attachmentUrl?: string;
  deceasedRelation?: "FIRST_DEGREE" | "SECOND_DEGREE";
}

export interface UpdateLeaveRequestData {
  startDate?: string;
  endDate?: string;
  reason?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "MORNING" | "AFTERNOON";
  substituteId?: string;
}

export interface ApproveData {
  notes?: string;
}

export interface RejectData {
  reason: string;
}

export interface CancelData {
  reason: string;
}

export const leaveRequestsApi = {
  // Get my leave requests
  getMyRequests: async (params?: {
    status?: LeaveRequestStatus;
    year?: number;
  }): Promise<ApiResponse<LeaveRequest[]>> => {
    const response = await apiClient.get("/leave-requests/my/requests", { params });
    return response.data;
  },

  // Get all leave requests (HR/Manager)
  getAll: async (params?: {
    status?: LeaveRequestStatus;
    employeeId?: string;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<LeaveRequest[]>> => {
    const response = await apiClient.get("/leave-requests", { params });
    return response.data;
  },

  // Get single leave request
  getById: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.get(`/leave-requests/${id}`);
    return response.data.data;
  },

  // Create leave request
  create: async (data: CreateLeaveRequestData): Promise<LeaveRequest> => {
    const response = await apiClient.post("/leave-requests", data);
    return response.data.data;
  },

  // Update leave request
  update: async (id: string, data: UpdateLeaveRequestData): Promise<LeaveRequest> => {
    const response = await apiClient.put(`/leave-requests/${id}`, data);
    return response.data.data;
  },

  // Submit leave request
  submit: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/submit`);
    return response.data.data;
  },

  // Manager approve
  approveManager: async (id: string, data?: ApproveData): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/approve-manager`, data);
    return response.data.data;
  },

  // Manager reject
  rejectManager: async (id: string, data: RejectData): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/reject-manager`, data);
    return response.data.data;
  },

  // HR approve
  approveHr: async (id: string, data?: ApproveData): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/approve-hr`, data);
    return response.data.data;
  },

  // HR reject
  rejectHr: async (id: string, data: RejectData): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/reject-hr`, data);
    return response.data.data;
  },

  // Cancel leave request
  cancel: async (id: string, data: CancelData): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/cancel`, data);
    return response.data.data;
  },

  // Delete leave request
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leave-requests/${id}`);
  },

  // Get requests pending substitute approval (for the logged-in substitute)
  getPendingSubstitute: async (): Promise<LeaveRequest[]> => {
    const response = await apiClient.get("/leave-requests/pending-substitute");
    const result = response.data?.data ?? response.data;
    return Array.isArray(result) ? result : result?.items ?? [];
  },

  // Substitute responds (approve/reject)
  substituteResponse: async (id: string, data: { approved: boolean; notes?: string }): Promise<LeaveRequest> => {
    const response = await apiClient.post(`/leave-requests/${id}/substitute-response`, data);
    return response.data?.data ?? response.data;
  },

  // Create hourly leave request
  createHourly: async (data: CreateHourlyLeaveData): Promise<LeaveRequest> => {
    const response = await apiClient.post("/leave-requests/hourly", data);
    return response.data.data;
  },
};
