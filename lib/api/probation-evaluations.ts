import { apiClient } from "./client";

export type ProbationStatus =
  | "DRAFT"
  | "PENDING_SELF_EVALUATION"
  | "PENDING_SENIOR_MANAGER"
  | "PENDING_HR"
  | "PENDING_CEO"
  | "PENDING_MEETING_SCHEDULE"
  | "COMPLETED"
  | "REJECTED_BY_SENIOR"
  | "REJECTED_BY_HR"
  | "REJECTED_BY_CEO";

// Scores are numeric 1–5: 1=غير مقبول, 2=مقبول, 3=جيد, 4=جيد جداً, 5=ممتاز
export type ProbationScore = 1 | 2 | 3 | 4 | 5;

export type ProbationRecommendation =
  | "CONFIRM_POSITION"
  | "EXTEND_PROBATION"
  | "TRANSFER_POSITION"
  | "SALARY_RAISE"
  | "TERMINATE";

export const PROBATION_SCORE_LABELS: Record<number, string> = {
  1: "غير مقبول",
  2: "مقبول",
  3: "جيد",
  4: "جيد جداً",
  5: "ممتاز",
};

export const PROBATION_RECOMMENDATION_OPTIONS: { value: ProbationRecommendation; labelAr: string }[] = [
  { value: "CONFIRM_POSITION",   labelAr: "تثبيت في المنصب" },
  { value: "EXTEND_PROBATION",   labelAr: "تمديد فترة التجربة" },
  { value: "TRANSFER_POSITION",  labelAr: "نقل إلى منصب آخر" },
  { value: "SALARY_RAISE",       labelAr: "رفع الراتب" },
  { value: "TERMINATE",          labelAr: "إنهاء الخدمة" },
];

export interface ProbationEvaluationScore {
  criteriaId: string;
  score: number | null;
  selfScore: number | null;
  criteria?: { id: string; nameAr: string; displayOrder?: number };
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
  evaluatorId: string;
  seniorManagerId?: string;
  workAreasNote?: string;
  status: ProbationStatus;
  overallRating?: number | null;
  finalRecommendation?: ProbationRecommendation;
  evaluatorNotes?: string;
  employeeNotes?: string;
  scores: ProbationEvaluationScore[];
  history?: ProbationHistoryEntry[];
  employee?: { firstNameAr: string; lastNameAr: string; employeeNumber: string };
  meetingProposedAt?: string;
  confirmedMeetingDate?: string;
  meetingConfirmedByEmployee?: boolean;
  meetingConfirmedByManager?: boolean;
}

// POST /probation-evaluations
export interface CreateProbationEvaluationData {
  employeeId: string;
  hireDate: string;
  probationEndDate: string;
  evaluatorId: string;
  seniorManagerId?: string;
  workAreasNote?: string;
}

// POST /:id/self-evaluate
export interface SelfEvaluateData {
  notes?: string;
  scores: { criteriaId: string; score: number }[];
}

// POST /:id/senior-approve
export interface SeniorApproveData {
  overallRating: number;
  recommendation: ProbationRecommendation;
  notes?: string;
  scores: { criteriaId: string; score: number }[];
}

// POST /:id/ceo-decide
export interface CeoDecideData {
  recommendation: ProbationRecommendation;
  notes?: string;
}

// POST /:id/schedule-meeting
export interface ProposeMeetingData {
  meetingProposedAt: string;
}

// POST /:id/confirm-meeting
export interface ConfirmMeetingData {
  role: "employee" | "manager";
}

// POST /:id/close-evaluation
export interface CompleteProbationData {
  decisionDocumentUrl?: string;
}

// Generic reject / hr-document body
export interface WorkflowNotesData {
  notes?: string;
}

export const probationEvaluationsApi = {
  getAll: async (params?: { status?: string }) => {
    const response = await apiClient.get("/probation-evaluations", { params });
    return response.data?.data || response.data;
  },

  getById: async (id: string): Promise<ProbationEvaluation> => {
    const response = await apiClient.get(`/probation-evaluations/${id}`);
    return response.data?.data || response.data;
  },

  getByEmployee: async (employeeId: string): Promise<ProbationEvaluation[]> => {
    const response = await apiClient.get(`/probation-evaluations/employee/${employeeId}`);
    return response.data?.data || response.data;
  },

  getPendingMyAction: async (): Promise<ProbationEvaluation[]> => {
    const response = await apiClient.get("/probation-evaluations/pending-my-action");
    return response.data?.data || response.data;
  },

  getHistory: async (id: string): Promise<ProbationHistoryEntry[]> => {
    const response = await apiClient.get(`/probation-evaluations/${id}/history`);
    return response.data?.data || response.data;
  },

  create: async (data: CreateProbationEvaluationData): Promise<ProbationEvaluation> => {
    const response = await apiClient.post("/probation-evaluations", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: Partial<CreateProbationEvaluationData>): Promise<ProbationEvaluation> => {
    const response = await apiClient.put(`/probation-evaluations/${id}`, data);
    return response.data?.data || response.data;
  },

  selfEvaluate: async (id: string, data: SelfEvaluateData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/self-evaluate`, data);
    return response.data?.data || response.data;
  },

  seniorApprove: async (id: string, data: SeniorApproveData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/senior-approve`, data);
    return response.data?.data || response.data;
  },

  seniorReject: async (id: string, data?: WorkflowNotesData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/senior-reject`, data);
    return response.data?.data || response.data;
  },

  hrDocument: async (id: string, data?: WorkflowNotesData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/hr-document`, data);
    return response.data?.data || response.data;
  },

  hrReject: async (id: string, data?: WorkflowNotesData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/hr-reject`, data);
    return response.data?.data || response.data;
  },

  ceoDecide: async (id: string, data: CeoDecideData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/ceo-decide`, data);
    return response.data?.data || response.data;
  },

  proposeMeeting: async (id: string, data: ProposeMeetingData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/schedule-meeting`, data);
    return response.data?.data || response.data;
  },

  confirmMeeting: async (id: string, data: ConfirmMeetingData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/confirm-meeting`, data);
    return response.data?.data || response.data;
  },

  complete: async (id: string, data?: CompleteProbationData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/close-evaluation`, data);
    return response.data?.data || response.data;
  },
};
