import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export type EvaluationFormStatus =
  | "DRAFT"
  | "SELF_EVALUATION"
  | "PENDING_SELF" // من الباك - نفس SELF_EVALUATION
  | "SELF_SUBMITTED"
  | "MANAGER_EVALUATION"
  | "MANAGER_SUBMITTED"
  | "HR_REVIEW"
  | "GM_APPROVAL"
  | "COMPLETED";

export type HrRecommendation =
  | "SALARY_INCREASE"
  | "PROMOTION"
  | "TRAINING"
  | "WARNING"
  | "TERMINATION"
  | "NO_ACTION";

export type GmStatus = "APPROVED" | "REJECTED";

export interface EvaluationFormSection {
  id?: string;
  criteriaId: string;
  criteria?: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    weight: number;
    maxScore: number;
    category: string;
  };
  score?: number;
  comments?: string;
  selfScore?: number;
  selfComments?: string;
  managerScore?: number;
  managerComments?: string;
}

export interface EvaluationForm {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    employeeNumber: string;
  };
  periodId: string;
  period?: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
  };
  status: EvaluationFormStatus;
  selfComments?: string;
  managerComments?: string;
  managerStrengths?: string;
  managerWeaknesses?: string;
  managerRecommendations?: string;
  hrComments?: string;
  hrRecommendation?: HrRecommendation;
  gmStatus?: GmStatus;
  gmComments?: string;
  totalSelfScore?: number;
  totalManagerScore?: number;
  finalScore?: number;
  sections: EvaluationFormSection[];
  createdAt: string;
  updatedAt: string;
}

// Data interfaces
export interface CreateFormData {
  periodId: string;
  employeeId: string;
}

export interface SaveSelfEvaluationData {
  sections: {
    criteriaId: string;
    score: number;
    comments?: string;
  }[];
  comments: string;
}

export interface SaveManagerEvaluationData {
  sections: {
    criteriaId: string;
    score: number;
    comments?: string;
  }[];
  comments: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
}

export interface HrReviewData {
  comments: string;
  recommendation: HrRecommendation;
}

export interface GmApprovalData {
  status: GmStatus;
  comments?: string;
}

export const evaluationFormsApi = {
  // Get all forms
  getAll: async (): Promise<ApiResponse<EvaluationForm[]>> => {
    const response = await apiClient.get("/evaluation-forms");
    return response.data;
  },

  // Get my forms (using /evaluation-forms since /my endpoint returns 404)
  getMy: async (params?: { periodId?: string }): Promise<ApiResponse<EvaluationForm[]>> => {
    const response = await apiClient.get("/evaluation-forms", { params });
    return response.data;
  },

  // Create form
  create: async (data: CreateFormData): Promise<EvaluationForm> => {
    const response = await apiClient.post("/evaluation-forms", data);
    return response.data.data;
  },

  // Get single form
  getById: async (id: string): Promise<EvaluationForm> => {
    const response = await apiClient.get(`/evaluation-forms/${id}`);
    return response.data.data;
  },

  // Get pending my review
  getPendingMyReview: async (): Promise<ApiResponse<EvaluationForm[]>> => {
    const response = await apiClient.get("/evaluation-forms/pending-my-review");
    return response.data;
  },

  // Save self evaluation (PATCH)
  saveSelfEvaluation: async (id: string, data: SaveSelfEvaluationData): Promise<EvaluationForm> => {
    const response = await apiClient.patch(`/evaluation-forms/${id}/self`, data);
    return response.data.data;
  },

  // Submit self evaluation (POST)
  submitSelfEvaluation: async (id: string): Promise<EvaluationForm> => {
    const response = await apiClient.post(`/evaluation-forms/${id}/self/submit`);
    return response.data.data;
  },

  // Save manager evaluation (PATCH)
  saveManagerEvaluation: async (id: string, data: SaveManagerEvaluationData): Promise<EvaluationForm> => {
    const response = await apiClient.patch(`/evaluation-forms/${id}/manager`, data);
    return response.data.data;
  },

  // Submit manager evaluation (POST)
  submitManagerEvaluation: async (id: string): Promise<EvaluationForm> => {
    const response = await apiClient.post(`/evaluation-forms/${id}/manager/submit`);
    return response.data.data;
  },

  // HR review
  hrReview: async (id: string, data: HrReviewData): Promise<EvaluationForm> => {
    const response = await apiClient.post(`/evaluation-forms/${id}/hr-review`, data);
    return response.data.data;
  },

  // GM approval
  gmApproval: async (id: string, data: GmApprovalData): Promise<EvaluationForm> => {
    const response = await apiClient.post(`/evaluation-forms/${id}/gm-approval`, data);
    return response.data.data;
  },
};
