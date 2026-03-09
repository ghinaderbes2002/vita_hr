import { apiClient } from "./client";

export type JustificationType = "SICK" | "EMERGENCY" | "OFFICIAL_MISSION" | "TRANSPORTATION" | "OTHER";
export type JustificationStatus =
  | "PENDING_MANAGER"
  | "MANAGER_APPROVED"
  | "PENDING_HR"
  | "HR_APPROVED"
  | "HR_REJECTED"
  | "AUTO_REJECTED";

export interface AttendanceJustification {
  id: string;
  alertId: string;
  employeeId: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    employeeNumber: string;
  };
  alert?: {
    id: string;
    date: string;
    alertType: string;
    messageAr: string;
  };
  justificationType: JustificationType;
  descriptionAr: string;
  descriptionEn?: string;
  attachmentUrl?: string;
  status: JustificationStatus;
  managerDecision?: "APPROVE" | "REJECT";
  managerNotesAr?: string;
  managerNotes?: string;
  managerReviewedAt?: string;
  hrDecision?: "APPROVE" | "REJECT";
  hrNotesAr?: string;
  hrNotes?: string;
  hrReviewedAt?: string;
  deductionApplied?: boolean;
  deductionMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJustificationData {
  alertId: string;
  justificationType: JustificationType;
  descriptionAr: string;
  descriptionEn?: string;
  attachmentUrl?: string;
}

export interface ReviewJustificationData {
  decision: "APPROVE" | "REJECT";
  notesAr?: string;
  notes?: string;
}

export interface JustificationQueryParams {
  employeeId?: string;
  status?: JustificationStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const attendanceJustificationsApi = {
  // Employee: submit justification
  create: async (data: CreateJustificationData): Promise<AttendanceJustification> => {
    const response = await apiClient.post("/attendance-justifications", data);
    return response.data.data;
  },

  // Employee: get my justifications
  getMy: async (params?: JustificationQueryParams): Promise<any> => {
    const response = await apiClient.get("/attendance-justifications/my", { params });
    return response.data;
  },

  // Admin/HR/Manager: get all justifications
  getAll: async (params?: JustificationQueryParams): Promise<any> => {
    const response = await apiClient.get("/attendance-justifications", { params });
    return response.data;
  },

  // Get single
  getById: async (id: string): Promise<AttendanceJustification> => {
    const response = await apiClient.get(`/attendance-justifications/${id}`);
    return response.data.data;
  },

  // Manager review
  managerReview: async (id: string, data: ReviewJustificationData): Promise<AttendanceJustification> => {
    const response = await apiClient.patch(`/attendance-justifications/${id}/manager-review`, data);
    return response.data.data;
  },

  // HR review
  hrReview: async (id: string, data: ReviewJustificationData): Promise<AttendanceJustification> => {
    const response = await apiClient.patch(`/attendance-justifications/${id}/hr-review`, data);
    return response.data.data;
  },
};
