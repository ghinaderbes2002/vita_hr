import { apiClient } from "./client";

export type WorkType = "FULL_TIME" | "PART_TIME";
export type WorkMode = "ON_SITE" | "REMOTE" | "HYBRID";
export type PositionStatus = "OPEN" | "CLOSED" | "SUSPENDED";

export interface TechnicalQuestion {
  id: string;
  question: string;
  maxScore: number;
  displayOrder: number;
  isActive: boolean;
}

export interface InterviewPosition {
  id: string;
  jobTitle: string;
  department: string;
  sectorName?: string;
  workType?: WorkType;
  workMode?: WorkMode;
  committeeMembers?: string[];
  interviewDate?: string;
  status: PositionStatus;
  createdAt: string;
  technicalQuestions: TechnicalQuestion[];
}

export interface CreateInterviewPositionData {
  jobTitle: string;
  department: string;
  sectorName?: string;
  workType?: WorkType;
  workMode?: WorkMode;
  committeeMembers?: string[];
  interviewDate?: string;
}

export const interviewPositionsApi = {
  getAll: async (params?: { page?: number; limit?: number; status?: PositionStatus }) => {
    const response = await apiClient.get("/interview-positions", { params });
    return response.data?.data || response.data;
  },

  getById: async (id: string): Promise<InterviewPosition> => {
    const response = await apiClient.get(`/interview-positions/${id}`);
    return response.data?.data || response.data;
  },

  create: async (data: CreateInterviewPositionData): Promise<InterviewPosition> => {
    const response = await apiClient.post("/interview-positions", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: Partial<CreateInterviewPositionData> & { status?: PositionStatus }): Promise<InterviewPosition> => {
    const response = await apiClient.put(`/interview-positions/${id}`, data);
    return response.data?.data || response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/interview-positions/${id}`);
  },

  getComparison: async (id: string) => {
    const response = await apiClient.get(`/interview-positions/${id}/comparison`);
    return response.data?.data || response.data;
  },

  // Technical Questions
  getTechnicalQuestions: async (positionId: string): Promise<TechnicalQuestion[]> => {
    const response = await apiClient.get(`/interview-positions/${positionId}/technical-questions`);
    return response.data?.data || response.data;
  },

  addTechnicalQuestion: async (positionId: string, data: { text: string; maxScore: number; displayOrder?: number }): Promise<TechnicalQuestion> => {
    const { text, ...rest } = data;
    const response = await apiClient.post(`/interview-positions/${positionId}/technical-questions`, { question: text, ...rest });
    return response.data?.data || response.data;
  },

  updateTechnicalQuestion: async (positionId: string, questionId: string, data: { text?: string; maxScore?: number }): Promise<TechnicalQuestion> => {
    const response = await apiClient.put(`/interview-positions/${positionId}/technical-questions/${questionId}`, data);
    return response.data?.data || response.data;
  },

  deleteTechnicalQuestion: async (positionId: string, questionId: string): Promise<void> => {
    await apiClient.delete(`/interview-positions/${positionId}/technical-questions/${questionId}`);
  },
};
