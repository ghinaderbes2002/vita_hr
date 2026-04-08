import { apiClient } from "./client";

export type WorkflowType = "ONBOARDING" | "OFFBOARDING";
export type WorkflowStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type TaskAssignee = "HR" | "IT" | "MANAGER" | "EMPLOYEE" | "OTHER";

export interface TemplateTask {
  id: string;
  titleAr: string;
  titleEn?: string;
  descriptionAr?: string;
  assignedTo: TaskAssignee;
  order: number;
  daysFromStart: number;
}

export interface OnboardingTemplate {
  id: string;
  nameAr: string;
  nameEn?: string;
  type: WorkflowType;
  description?: string;
  isDefault: boolean;
  tasks: TemplateTask[];
  createdAt: string;
}

export interface WorkflowTask {
  id: string;
  titleAr: string;
  titleEn?: string;
  descriptionAr?: string;
  assignedTo: TaskAssignee;
  order: number;
  dueDate?: string;
  status: TaskStatus;
  notes?: string;
  completedAt?: string;
}

export interface OnboardingWorkflow {
  id: string;
  employeeId: string;
  templateId: string;
  type: WorkflowType;
  status: WorkflowStatus;
  startDate: string;
  targetDate?: string;
  notes?: string;
  tasks: WorkflowTask[];
  employee?: { firstNameAr: string; lastNameAr: string; employeeNumber: string };
  template?: { nameAr: string; nameEn?: string };
  createdAt: string;
}

export interface CreateTemplateData {
  nameAr: string;
  nameEn?: string;
  type: WorkflowType;
  description?: string;
  isDefault?: boolean;
  tasks?: {
    titleAr: string;
    titleEn: string;
    descriptionAr?: string;
    assignedTo: TaskAssignee;
    order: number;
    daysFromStart: number;
  }[];
}

export interface CreateWorkflowData {
  employeeId: string;
  templateId: string;
  type: WorkflowType;
  startDate: string;
  targetDate?: string;
  notes?: string;
}

export const onboardingApi = {
  // Templates
  getTemplates: async (params?: { type?: WorkflowType }): Promise<OnboardingTemplate[]> => {
    const response = await apiClient.get("/onboarding/templates", { params });
    const result = response.data?.data ?? response.data;
    return Array.isArray(result) ? result : (result?.items || []);
  },

  getTemplate: async (id: string): Promise<OnboardingTemplate> => {
    const response = await apiClient.get(`/onboarding/templates/${id}`);
    return response.data?.data || response.data;
  },

  createTemplate: async (data: CreateTemplateData): Promise<OnboardingTemplate> => {
    const response = await apiClient.post("/onboarding/templates", data);
    return response.data?.data || response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/onboarding/templates/${id}`);
  },

  // Workflows
  getWorkflows: async (params?: { employeeId?: string; status?: WorkflowStatus; type?: WorkflowType }): Promise<OnboardingWorkflow[]> => {
    const response = await apiClient.get("/onboarding/workflows", { params });
    const result = response.data?.data ?? response.data;
    return Array.isArray(result) ? result : (result?.items || []);
  },

  getWorkflow: async (id: string): Promise<OnboardingWorkflow> => {
    const response = await apiClient.get(`/onboarding/workflows/${id}`);
    return response.data?.data || response.data;
  },

  createWorkflow: async (data: CreateWorkflowData): Promise<OnboardingWorkflow> => {
    const response = await apiClient.post("/onboarding/workflows", data);
    return response.data?.data || response.data;
  },

  updateTaskStatus: async (
    workflowId: string,
    taskId: string,
    data: { status: TaskStatus; notes?: string }
  ): Promise<WorkflowTask> => {
    const response = await apiClient.patch(`/onboarding/workflows/${workflowId}/tasks/${taskId}`, data);
    return response.data?.data || response.data;
  },

  cancelWorkflow: async (id: string): Promise<void> => {
    await apiClient.patch(`/onboarding/workflows/${id}/cancel`);
  },
};
