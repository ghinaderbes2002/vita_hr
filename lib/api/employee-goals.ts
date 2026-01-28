import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export interface EmployeeGoal {
  id: string;
  formId: string;
  title: string;
  description?: string;
  targetDate: string;
  weight: number;
  selfAchievement?: number;
  selfComments?: string;
  managerAchievement?: number;
  managerComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  targetDate: string;
  weight: number;
}

export interface UpdateGoalData {
  selfAchievement?: number;
  selfComments?: string;
  managerAchievement?: number;
  managerComments?: string;
}

export const employeeGoalsApi = {
  // Get goals by form
  getByForm: async (formId: string): Promise<ApiResponse<EmployeeGoal[]>> => {
    const response = await apiClient.get(`/employee-goals/forms/${formId}`);
    return response.data;
  },

  // Create goal
  create: async (formId: string, data: CreateGoalData): Promise<EmployeeGoal> => {
    const response = await apiClient.post(`/employee-goals/forms/${formId}`, data);
    return response.data.data;
  },

  // Update goal
  update: async (id: string, data: UpdateGoalData): Promise<EmployeeGoal> => {
    const response = await apiClient.patch(`/employee-goals/${id}`, data);
    return response.data.data;
  },

  // Delete goal
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employee-goals/${id}`);
  },
};
