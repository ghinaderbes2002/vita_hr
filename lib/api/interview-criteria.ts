import { apiClient } from "./client";

export interface InterviewCriterion {
  id: string;
  nameAr: string;
  nameEn: string;
  maxScore: number;
  displayOrder: number;
  isActive: boolean;
}

export const interviewCriteriaApi = {
  getPersonal: async (): Promise<InterviewCriterion[]> => {
    const response = await apiClient.get("/interview-criteria/personal");
    return response.data?.data || response.data;
  },

  getComputer: async (): Promise<InterviewCriterion[]> => {
    const response = await apiClient.get("/interview-criteria/computer");
    return response.data?.data || response.data;
  },

  addPersonal: async (data: { name: string; maxScore?: number; displayOrder?: number }): Promise<InterviewCriterion> => {
    const response = await apiClient.post("/interview-criteria/personal", data);
    return response.data?.data || response.data;
  },

  addComputer: async (data: { name: string; maxScore?: number; displayOrder?: number }): Promise<InterviewCriterion> => {
    const response = await apiClient.post("/interview-criteria/computer", data);
    return response.data?.data || response.data;
  },
};
