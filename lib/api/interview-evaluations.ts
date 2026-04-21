import { apiClient } from "./client";

export type InterviewDecision = "ACCEPTED" | "REFERRED_TO_OTHER" | "DEFERRED" | "REJECTED";

export interface ScoreEntry {
  criterionId: string;
  score: number;
}

export interface QuestionScoreEntry {
  questionId: string;
  score: number;
}

export interface InterviewEvaluation {
  id: string;
  positionId: string;
  jobApplicationId: string;
  candidateName: string;
  residence?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  contactNumber?: string;
  academicDegree?: string;
  yearsOfExperience?: number;
  expectedSalary?: number;
  expectedJoinDate?: string;
  generalNotes?: string;
  decision?: InterviewDecision;
  proposedSalary?: number;
  additionalConditions?: string;
  salaryAfterConfirmation?: number;
  personalScore?: number;
  technicalScore?: number;
  computerScore?: number;
  totalScore?: number;
  personalScores: { criterionId: string; score: number }[];
  technicalScores: { questionId: string; score: number }[];
  computerScores: { criterionId: string; score: number }[];
  isTransferred?: boolean;
  evaluatedAt?: string;
}

export interface CreateInterviewEvaluationData {
  positionId: string;
  jobApplicationId: string;
  candidateName: string;
  residence?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  contactNumber?: string;
  academicDegree?: string;
  yearsOfExperience?: number;
  expectedSalary?: number;
  expectedJoinDate?: string;
  generalNotes?: string;
  decision?: InterviewDecision;
  proposedSalary?: number;
  additionalConditions?: string;
  salaryAfterConfirmation?: number;
  personalScores?: ScoreEntry[];
  technicalScores?: QuestionScoreEntry[];
  computerScores?: ScoreEntry[];
}

export const interviewEvaluationsApi = {
  getAll: async (params?: { positionId?: string; decision?: InterviewDecision; page?: number; limit?: number }) => {
    const response = await apiClient.get("/interview-evaluations", { params });
    return response.data?.data || response.data;
  },

  getById: async (id: string): Promise<InterviewEvaluation> => {
    const response = await apiClient.get(`/interview-evaluations/${id}`);
    return response.data?.data || response.data;
  },

  getByApplication: async (jobApplicationId: string): Promise<InterviewEvaluation | null> => {
    try {
      const response = await apiClient.get(`/interview-evaluations/by-application/${jobApplicationId}`);
      const result = response.data?.data ?? null;
      if (result === null) return null;
      if (Array.isArray(result)) return result[0] ?? null;
      if (result?.id) return result;
      return null;
    } catch {
      return null;
    }
  },

  create: async (data: CreateInterviewEvaluationData): Promise<InterviewEvaluation> => {
    const response = await apiClient.post("/interview-evaluations", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: Partial<CreateInterviewEvaluationData>): Promise<InterviewEvaluation> => {
    const response = await apiClient.put(`/interview-evaluations/${id}`, data);
    return response.data?.data || response.data;
  },

  transferToEmployee: async (id: string): Promise<void> => {
    await apiClient.post(`/interview-evaluations/${id}/transfer-to-employee`);
  },
};
