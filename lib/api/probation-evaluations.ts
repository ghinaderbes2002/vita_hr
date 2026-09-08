import { apiClient } from "./client";
import type { EmployeeCommission } from "@/types";

export type ProbationStatus =
  | "DRAFT"
  | "PENDING_SELF_EVALUATION"
  /** The direct manager reviews right after the self-evaluation. */
  | "PENDING_DIRECT_MANAGER"
  /** Legacy: kept for records created before the direct-manager step existed. */
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

/** أسماء كل التوصيات — تشمل الملغاة، لأن التقييمات القديمة مسجّلة عليها. */
export const PROBATION_RECOMMENDATION_LABELS: Record<ProbationRecommendation, string> = {
  CONFIRM_POSITION:  "تثبيت في المنصب",
  EXTEND_PROBATION:  "تمديد فترة التجربة",
  TRANSFER_POSITION: "نقل إلى منصب آخر",
  SALARY_RAISE:      "رفع الراتب",
  TERMINATE:         "إنهاء الخدمة",
};

/** ما يُعرض في قوائم الاختيار — «تمديد فترة التجربة» لم تعد خياراً متاحاً. */
export const PROBATION_RECOMMENDATION_OPTIONS: { value: ProbationRecommendation; labelAr: string }[] = (
  ["CONFIRM_POSITION", "TRANSFER_POSITION", "SALARY_RAISE", "TERMINATE"] as ProbationRecommendation[]
).map((value) => ({ value, labelAr: PROBATION_RECOMMENDATION_LABELS[value] }));

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
  managerScorePercent?: number | null;
  selfScorePercent?: number | null;
  finalScorePercent?: number | null;
  managerWeight?: number;
  selfWeight?: number;
  scores: ProbationEvaluationScore[];
  history?: ProbationHistoryEntry[];
  employee?: { firstNameAr: string; lastNameAr: string; employeeNumber: string };
  meetingProposedAt?: string;
  confirmedMeetingDate?: string;
  meetingConfirmedAt?: string;
  meetingConfirmedByEmployee?: boolean;
  meetingConfirmedByManager?: boolean;
  /** Filled when the direct manager asked HR for a different date. */
  meetingRescheduleNote?: string | null;
  seniorIsCeo?: boolean;
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

/**
 * POST /:id/direct-manager-approve — same body as the legacy senior approval.
 * Moves the evaluation to PENDING_MEETING_SCHEDULE.
 */
export type DirectManagerApproveData = SeniorApproveData;

// POST /:id/ceo-decide
export interface CeoDecideData {
  recommendation: ProbationRecommendation;
  notes?: string;
}

// POST /:id/schedule-meeting
export interface ProposeMeetingData {
  meetingProposedAt: string;
}

// POST /:id/confirm-meeting — the CEO is no longer part of scheduling.
export interface ConfirmMeetingData {
  role: "employee" | "manager";
}

// POST /:id/suggest-meeting-change — direct manager asks HR for another date.
export interface SuggestMeetingChangeData {
  note: string;
}

// POST /:id/close-evaluation
export interface CompleteProbationData {
  decisionDocumentUrl?: string;
}

// Generic reject body
export interface WorkflowNotesData {
  notes?: string;
}

/**
 * POST /:id/hr-document. `sendToCeo: false` (the common case) closes the
 * evaluation outright; `true` hands it to the CEO for the final decision.
 */
export interface HrDocumentData {
  sendToCeo: boolean;
  notes?: string;
  /** Only meaningful when closing without the CEO. */
  decisionDocumentUrl?: string;
}

export interface EmployeeEvaluationsResponse {
  evaluations: ProbationEvaluation[];
  employeeCommissions: EmployeeCommission[];
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

  /**
   * Returns `{ evaluations, employeeCommissions }`. Older deployments returned a
   * bare evaluations array, so both shapes are normalised here.
   */
  getByEmployee: async (employeeId: string): Promise<EmployeeEvaluationsResponse> => {
    const response = await apiClient.get(`/probation-evaluations/employee/${employeeId}`);
    const payload = response.data?.data ?? response.data;
    if (Array.isArray(payload)) return { evaluations: payload, employeeCommissions: [] };
    return {
      evaluations: Array.isArray(payload?.evaluations) ? payload.evaluations : [],
      employeeCommissions: Array.isArray(payload?.employeeCommissions) ? payload.employeeCommissions : [],
    };
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

  directManagerApprove: async (id: string, data: DirectManagerApproveData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/direct-manager-approve`, data);
    return response.data?.data || response.data;
  },

  directManagerReject: async (id: string, data?: WorkflowNotesData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/direct-manager-reject`, data);
    return response.data?.data || response.data;
  },

  hrDocument: async (id: string, data: HrDocumentData) => {
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

  suggestMeetingChange: async (id: string, data: SuggestMeetingChangeData) => {
    const response = await apiClient.post(`/probation-evaluations/${id}/suggest-meeting-change`, data);
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
