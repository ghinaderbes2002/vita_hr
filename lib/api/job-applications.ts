import { apiClient } from "./client";
import { JobApplicationStatus } from "@/types";

/** HR moves only; HIRED and RETURNED_TO_HR are the CEO's (see lib/job-applications/flow). */
export interface UpdateJobApplicationData {
  status: Exclude<JobApplicationStatus, "HIRED" | "RETURNED_TO_HR" | "ACCEPTED">;
  reviewNotes?: string;
  /** Required with REJECTED — the applicant is emailed. */
  rejectionNote?: string;
  rating?: number;
  /** With PENDING_CEO_APPROVAL: the terms the CEO sees in the notification. */
  offeredJobTitle?: string;
  offeredSalary?: string;
  offeredStartDate?: string;
}

export const jobApplicationsApi = {
  getAll: async (params?: {
    status?: string;
    isTalent?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get("/job-applications", { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get("/job-applications/stats");
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/job-applications/${id}`);
    return response.data.data;
  },

  update: async (id: string, data: UpdateJobApplicationData) => {
    const response = await apiClient.put(`/job-applications/${id}`, data);
    return response.data.data;
  },

  // موافقة المدير التنفيذي (ينقل الطلب إلى HIRED)
  ceoApprove: async (id: string) => {
    const response = await apiClient.patch(
      `/job-applications/${id}/ceo-approve`,
    );
    return response.data.data;
  },

  // المدير التنفيذي غير موافق: يرجع الطلب للموارد البشرية (RETURNED_TO_HR) — ليس رفضاً للمتقدّم ولا يُرسل له بريد
  ceoReturn: async (id: string, ceoNote: string) => {
    const response = await apiClient.patch(`/job-applications/${id}/ceo-reject`, { ceoNote });
    return response.data.data;
  },

  // إضافة/إزالة الطلب من قائمة المواهب
  setTalent: async (id: string, isTalent: boolean) => {
    const response = await apiClient.patch(`/job-applications/${id}/talent`, {
      isTalent,
    });
    return response.data.data;
  },
};

export const CV_BASE_URL = "https://vitaxirpro.com/api";
