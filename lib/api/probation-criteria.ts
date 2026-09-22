import { apiClient } from "./client";

export interface ProbationCriteria {
  id: string;
  nameAr: string;
  nameEn?: string;
  isCore: boolean;
  isActive: boolean;
  displayOrder: number;
  /** Set → the question only appears in this employee's evaluation. */
  targetEmployeeId?: string | null;
  targetEmployee?: {
    id: string;
    firstNameAr?: string | null;
    lastNameAr?: string | null;
  } | null;
  /** Set → the question is attached to everyone holding this job title. */
  jobTitleId?: string | null;
  jobTitle?: {
    id: string;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
}

export interface CreateProbationCriteriaData {
  nameAr: string;
  nameEn?: string;
  displayOrder?: number;
  isCore?: boolean;
  /** Omit for a general question; set to scope it to one employee. */
  targetEmployeeId?: string | null;
  /** Omit for a general question; set to attach it to a whole job title. */
  jobTitleId?: string | null;
}

export type UpdateProbationCriteriaData = Partial<CreateProbationCriteriaData>;

export const probationCriteriaApi = {
  // With employeeId → the questions that employee's evaluation will actually
  // contain: the general ones plus the ones targeted at them.
  getAll: async (params?: { employeeId?: string }): Promise<ProbationCriteria[]> => {
    const response = await apiClient.get("/probation/criteria", { params });
    return response.data?.data || response.data;
  },

  create: async (data: CreateProbationCriteriaData): Promise<ProbationCriteria> => {
    const response = await apiClient.post("/probation/criteria", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: UpdateProbationCriteriaData): Promise<ProbationCriteria> => {
    const response = await apiClient.put(`/probation/criteria/${id}`, data);
    return response.data?.data || response.data;
  },

  delete: async (id: string): Promise<{ deleted?: boolean; isActive?: boolean }> => {
    const response = await apiClient.delete(`/probation/criteria/${id}`);
    return response.data?.data || response.data;
  },

  // The questions a new evaluation gets for an employee holding this job title:
  // the general ones minus whatever was excluded here, plus the ones attached to
  // the title itself.
  getByJobTitle: async (jobTitleId: string): Promise<ProbationCriteria[]> => {
    const response = await apiClient.get(`/probation/criteria/by-job-title/${jobTitleId}`);
    return response.data?.data || response.data;
  },

  // Excludes (or brings back) one question for one job title, without touching
  // the question itself or any other job title.
  setEnabledForJobTitle: async (
    jobTitleId: string,
    criteriaId: string,
    isEnabled: boolean,
  ): Promise<void> => {
    await apiClient.put(`/probation/criteria/job-title/${jobTitleId}/${criteriaId}`, { isEnabled });
  },
};
