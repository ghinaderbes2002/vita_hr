import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export type PeerRating = "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "POOR";

export interface PeerEvaluation {
  id: string;
  formId: string;
  evaluatorId: string;
  evaluator?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
  };
  rating: PeerRating;
  strengths?: string;
  improvements?: string;
  comments?: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitPeerEvaluationData {
  rating: PeerRating;
  strengths?: string;
  improvements?: string;
  comments?: string;
  isAnonymous: boolean;
}

export const peerEvaluationsApi = {
  // Get peer evaluations for a form
  getByForm: async (formId: string): Promise<ApiResponse<PeerEvaluation[]>> => {
    const response = await apiClient.get(`/peer-evaluations/forms/${formId}/peers`);
    return response.data;
  },

  // Submit peer evaluation
  submit: async (formId: string, data: SubmitPeerEvaluationData): Promise<PeerEvaluation> => {
    const response = await apiClient.post(`/peer-evaluations/forms/${formId}/peer`, data);
    return response.data.data;
  },
};
