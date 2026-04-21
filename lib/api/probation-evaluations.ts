import { apiClient } from "./client";

export type ProbationScore = "UNACCEPTABLE" | "ACCEPTABLE" | "GOOD" | "VERY_GOOD" | "EXCELLENT";
export type ProbationStatus =
  | "DRAFT"
  | "PENDING_SENIOR_MANAGER"
  | "PENDING_HR"
  | "PENDING_MEETING_SCHEDULE"
  | "PENDING_CEO"
  | "PENDING_EMPLOYEE_ACKNOWLEDGMENT"
  | "COMPLETED"
  | "REJECTED_BY_SENIOR"
  | "REJECTED_BY_HR"
  | "REJECTED_BY_CEO";

export type ProbationRecommendation =
  | "CONFIRM_POSITION"
  | "EXTEND_PROBATION"
  | "TRANSFER_POSITION"
  | "TERMINATE"
  | "SALARY_RAISE";

export interface ProbationCriterion {
  id: string;
  nameAr: string;
  nameEn?: string;
  isCore: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface ProbationEvaluationScore {
  criteriaId: string;
  score: ProbationScore;
  criteria?: { nameAr: string };
}

export interface ProbationHistoryEntry {
  action: string;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

export interface ProbationEvaluation {
  id: string;
  employeeId: string;
  hireDate: string;
  probationEndDate: string;
  evaluationDate?: string;
  evaluatorId: string;
  seniorManagerId?: string;
  isDelegated: boolean;
  delegationNote?: string;
  workAreasNote?: string;
  status: ProbationStatus;
  overallRating?: ProbationScore;
  finalRecommendation?: ProbationRecommendation;
  employeeAcknowledged: boolean;
  evaluatorNotes?: string;
  scores: ProbationEvaluationScore[];
  history?: ProbationHistoryEntry[];
  employee?: { firstNameAr: string; lastNameAr: string; employeeNumber: string };
  proposedMeetingDate?: string;
  confirmedMeetingDate?: string;
  meetingNotes?: string;
  meetingConfirmedByEmployee?: boolean;
  meetingConfirmedByManager?: boolean;
  meetingProposedAt?: string;
}

export interface CreateProbationEvaluationData {
  employeeId: string;
  hireDate: string;
  probationEndDate: string;
  evaluationDate?: string;
  evaluatorId: string;
  evaluatorNotes?: string;
  seniorManagerId?: string;
  isDelegated?: boolean;
  delegationNote?: string;
  workAreasNote?: string;
  scores?: { criteriaId: string; score: ProbationScore }[];
}

export interface WorkflowActionData {
  notes?: string;
  recommendation?: ProbationRecommendation;
  overallRating?: ProbationScore;
  scores?: { criteriaId: string; score: ProbationScore }[];
  proposedDate?: string;
  confirmedDate?: string;
}

export interface ProposeMeetingData {
  meetingProposedAt: string;
}

export interface ConfirmMeetingData {
  confirmedBy: "employee" | "manager";
}

export interface CompleteProbationData {
  decisionDocumentUrl: string;
}

export const probationEvaluationsApi = {
  // Criteria
  getCriteria: async (): Promise<ProbationCriterion[]> => {
    const response = await apiClient.get("/probation/criteria");
    return response.data?.data || response.data;
  },

  getCriteriaByJobTitle: async (jobTitleId: string): Promise<ProbationCriterion[]> => {
    const response = await apiClient.get(`/probation/criteria/by-job-title/${jobTitleId}`);
    return response.data?.data || response.data;
  },

  // Evaluations
  getAll: async () => {
    const response = await apiClient.get("/probation/evaluations");
    return response.data?.data || response.data;
  },

  getById: async (id: string): Promise<ProbationEvaluation> => {
    const response = await apiClient.get(`/probation/evaluations/${id}`);
    return response.data?.data || response.data;
  },

  getByEmployee: async (employeeId: string): Promise<ProbationEvaluation[]> => {
    const response = await apiClient.get(`/probation/evaluations/employee/${employeeId}`);
    return response.data?.data || response.data;
  },

  getPendingMyAction: async (): Promise<ProbationEvaluation[]> => {
    const response = await apiClient.get("/probation/evaluations/pending-my-action");
    return response.data?.data || response.data;
  },

  getHistory: async (id: string): Promise<ProbationHistoryEntry[]> => {
    const response = await apiClient.get(`/probation/evaluations/${id}/history`);
    return response.data?.data || response.data;
  },

  create: async (data: CreateProbationEvaluationData): Promise<ProbationEvaluation> => {
    const response = await apiClient.post("/probation/evaluations", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: Partial<CreateProbationEvaluationData>): Promise<ProbationEvaluation> => {
    const response = await apiClient.put(`/probation/evaluations/${id}`, data);
    return response.data?.data || response.data;
  },

  // Workflow actions
  submit: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/submit`, data);
    return response.data?.data || response.data;
  },

  seniorApprove: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/senior-approve`, data);
    return response.data?.data || response.data;
  },

  seniorReject: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/senior-reject`, data);
    return response.data?.data || response.data;
  },

  hrDocument: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/hr-document`, data);
    return response.data?.data || response.data;
  },

  hrReject: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/hr-reject`, data);
    return response.data?.data || response.data;
  },

  ceoDecide: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/ceo-decide`, data);
    return response.data?.data || response.data;
  },

  employeeAcknowledge: async (id: string, data?: WorkflowActionData) => {
    const response = await apiClient.post(`/probation/evaluations/${id}/employee-acknowledge`, data);
    return response.data?.data || response.data;
  },

  proposeMeeting: async (id: string, data: ProposeMeetingData) => {
    const response = await apiClient.patch(`/probation/evaluations/${id}/propose-meeting`, data);
    return response.data?.data || response.data;
  },

  confirmMeeting: async (id: string, data: ConfirmMeetingData) => {
    const response = await apiClient.patch(`/probation/evaluations/${id}/confirm-meeting`, data);
    return response.data?.data || response.data;
  },

  complete: async (id: string, data: CompleteProbationData) => {
    const response = await apiClient.patch(`/probation/evaluations/${id}/complete`, data);
    return response.data?.data || response.data;
  },
};
