import { apiClient } from "./client";

export type JustificationType = "SICK" | "EMERGENCY" | "OFFICIAL_MISSION" | "TRANSPORTATION" | "OTHER";
export type JustificationStatus =
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "HR_APPROVED"
  /** موافقة مع خصم — قبول التبرير مع تطبيق الخصم المالي. حالة وسطية: لا تُحتسب
   *  رفضاً في أي عدّاد أو إحصائية. */
  | "HR_APPROVED_WITH_DEDUCTION"
  | "HR_REJECTED"
  | "AUTO_REJECTED";

/** قرار المدير المباشر: موافقة أو رفض فقط. */
export type ManagerDecision = "APPROVE" | "REJECT";
/** قرار HR النهائي، وهو وحده الذي يملك خيار "موافقة مع خصم". */
export type HrDecision = "APPROVE" | "APPROVE_WITH_DEDUCTION" | "REJECT";

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
  statusLabelAr?: string;
  managerDecision?: ManagerDecision;
  managerNotesAr?: string;
  managerNotes?: string;
  managerReviewedAt?: string;
  hrDecision?: HrDecision;
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
  decision: ManagerDecision;
  notesAr?: string;
  notes?: string;
  applyDeduction?: boolean; // HR review only (§5.4)
}

/** Same body as the manager review, but `decision` accepts the extra HR value. */
export interface HrReviewJustificationData extends Omit<ReviewJustificationData, "decision"> {
  decision: HrDecision;
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

  // Direct Manager: get team justifications from JWT
  getMyTeam: async (params?: JustificationQueryParams): Promise<any> => {
    const response = await apiClient.get("/attendance-justifications/my-team", { params });
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
  hrReview: async (id: string, data: HrReviewJustificationData): Promise<AttendanceJustification> => {
    const response = await apiClient.patch(`/attendance-justifications/${id}/hr-review`, data);
    return response.data.data;
  },
};
