import { apiClient } from "./client";

export type AmputationType = "UPPER" | "LOWER";
export type AmputationSide = "RIGHT" | "LEFT" | "BILATERAL";
export type ProstheticsStatus =
  | "INTAKE"
  | "ASSESSMENT"
  | "COMMITTEE_REVIEW"
  | "COMMITTEE_APPROVED"
  | "FITTING"
  | "GAIT_ANALYSIS"
  | "FINAL_EVALUATION"
  | "DELIVERED"
  | "FOLLOW_UP"
  | "CLOSED"
  | "CANCELLED";
export type ComponentSource = "WAREHOUSE" | "SUPPLIER";
export type ProstheticType = "BIONIC" | "MYOBOCK" | "MECHANIC" | "COSMETIC";
export type KLevel = "K0" | "K1" | "K2" | "K3" | "K4";
export type CommitteeDecision = "APPROVED" | "NEEDS_ADJUSTMENT" | "REJECTED";

export interface ProstheticsCase {
  id: string;
  patientId: string;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string };
  status: ProstheticsStatus;
  amputationType?: AmputationType | null;
  amputationSide?: AmputationSide | null;
  amputationLevel?: string | null;
  dateOfAmputation?: string | null;
  causeOfAmputation?: string | null;
  numberOfAmputations?: number | null;
  assignedProsthetistId?: string | null;
  supervisingDoctorId?: string | null;
  committeeDecision?: CommitteeDecision | null;
  proposedProstheticType?: ProstheticType | null;
  deliveryDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProstheticsCaseDto {
  patientId: string;
  amputationType: AmputationType;
  amputationSide: AmputationSide;
  amputationLevel: string;
  amputationDate: string;
  amputationCause: string;
  amputationCount: number;
  notes?: string;
}

export interface AssessmentUpperDto {
  amputationSide: AmputationSide;
  residualLimbLength: "LONG" | "MEDIUM" | "SHORT" | "VERY_SHORT";
  residualLimbShape?: string;
  residualLimbPhotoUrl?: string;
  hasPain: boolean;
  painArea?: string;
  painIntensity?: number;
  painTypes?: string[];
  hasPhantomPain?: boolean;
  phantomPainIntensity?: number;
  phantomPainType?: string;
  neuromaStatus?: "PALPABLE" | "NOT_PALPABLE";
  skinAppearance?: string;
  skinGraft?: boolean;
  skinGraftArea?: string;
  scarCondition?: string;
  kLevel?: KLevel;
  romData?: Record<string, number>;
  muscleMotion?: Record<string, boolean>;
  notes?: string;
}

export interface AssessmentLowerDto extends AssessmentUpperDto {
  weightBearing?: "NONE" | "FULL" | "HIGH" | "MEDIUM" | "LOW";
  otherLimbCondition?: string;
  usesAssistiveDevices?: boolean;
  assistiveDeviceType?: string;
  canClimbStairs?: boolean;
  singleLegBalance?: boolean;
}

export interface CommitteeOpinionDto {
  opinion: string;
  recommendation?: string;
}

export interface CommitteeDecisionDto {
  decision: CommitteeDecision;
  summary: string;
  proposedProstheticType?: ProstheticType;
}

export interface CaseComponent {
  id: string;
  caseId: string;
  inventoryItemId?: string | null;
  source: ComponentSource;
  supplier?: string | null;
  code?: string | null;
  name: string;
  reason?: string | null;
  quantity: number;
  unitPrice?: number | null;
  createdAt: string;
}

export interface AddComponentDto {
  inventoryItemId?: string;
  source: ComponentSource;
  supplier?: string;
  code?: string;
  name: string;
  reason?: string;
  quantity?: number;
}

export interface GaitAnalysisDto {
  prostheticDetails?: Record<string, string>;
  patientComplaints?: string[];
  residualLimbExam?: Record<string, boolean>;
  coreAssessment?: Record<string, string>;
  walkingMeasurements?: { speed?: number; cadence?: number; stepLength?: number; stancePercent?: number };
  gaitErrors?: Record<string, boolean>;
  specialIssues?: string[];
  clinicalConclusion?: string;
  recommendations?: string;
  treatmentPlan?: string;
}

export interface FollowUp {
  id: string;
  caseId: string;
  date: string;
  notes: string;
  kLevel?: KLevel | null;
  painLevel?: number | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: string;
  title: string;
  description?: string | null;
  date: string;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProstheticsCaseListParams {
  page?: number;
  limit?: number;
  status?: ProstheticsStatus;
  patientId?: string;
}

export const clinicProstheticsApi = {
  create: async (dto: CreateProstheticsCaseDto): Promise<ProstheticsCase> => {
    const { data } = await apiClient.post("/prosthetics/cases", dto);
    return data?.data ?? data;
  },

  list: async (params?: ProstheticsCaseListParams) => {
    const { data } = await apiClient.get("/prosthetics/cases", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items ?? d?.data ?? (Array.isArray(d) ? d : []) as ProstheticsCase[],
      total: d?.total ?? 0,
      totalPages: d?.totalPages ?? 0,
    };
  },

  getById: async (id: string): Promise<ProstheticsCase> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${id}`);
    return data?.data ?? data;
  },

  update: async (id: string, dto: Partial<CreateProstheticsCaseDto>): Promise<ProstheticsCase> => {
    const { data } = await apiClient.put(`/prosthetics/cases/${id}`, dto);
    return data?.data ?? data;
  },

  updateStatus: async (id: string, status: ProstheticsStatus): Promise<ProstheticsCase> => {
    const { data } = await apiClient.put(`/prosthetics/cases/${id}/status`, { status });
    return data?.data ?? data;
  },

  getByPatient: async (patientId: string): Promise<ProstheticsCase[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/by-patient/${patientId}`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  submitAssessmentUpper: async (id: string, dto: AssessmentUpperDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/assessment-upper`, dto);
    return data?.data ?? data;
  },

  submitAssessmentLower: async (id: string, dto: AssessmentLowerDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/assessment-lower`, dto);
    return data?.data ?? data;
  },

  submitCommitteeOpinion: async (id: string, dto: CommitteeOpinionDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/committee/opinion`, dto);
    return data?.data ?? data;
  },

  submitCommitteeDecision: async (id: string, dto: CommitteeDecisionDto) => {
    const { data } = await apiClient.put(`/prosthetics/cases/${id}/committee/decide`, dto);
    return data?.data ?? data;
  },

  signCommitteeDecision: async (id: string, signatureBase64: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/committee/sign`, { signatureBase64 });
    return data?.data ?? data;
  },

  addComponent: async (id: string, dto: AddComponentDto): Promise<CaseComponent> => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/components`, dto);
    return data?.data ?? data;
  },

  getComponents: async (id: string): Promise<CaseComponent[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${id}/components`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  deleteComponent: async (id: string, compId: string): Promise<void> => {
    await apiClient.delete(`/prosthetics/cases/${id}/components/${compId}`);
  },

  submitGaitAnalysis: async (id: string, dto: GaitAnalysisDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/gait-analysis`, dto);
    return data?.data ?? data;
  },

  updateGaitAnalysis: async (id: string, dto: GaitAnalysisDto) => {
    const { data } = await apiClient.put(`/prosthetics/cases/${id}/gait-analysis`, dto);
    return data?.data ?? data;
  },

  submitBalanceAssessment: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/balance-assessment`, dto);
    return data?.data ?? data;
  },

  submitTreatmentPlan: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/treatment-plan`, dto);
    return data?.data ?? data;
  },

  addWorkshopSession: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/sessions/workshop`, dto);
    return data?.data ?? data;
  },

  addPtSession: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/sessions/pt`, dto);
    return data?.data ?? data;
  },

  addMediaSession: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/sessions/media`, dto);
    return data?.data ?? data;
  },

  addConsumable: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/consumables`, dto);
    return data?.data ?? data;
  },

  submitFinalEvaluation: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/final-evaluation`, dto);
    return data?.data ?? data;
  },

  signFinalEvaluation: async (id: string, signatureBase64: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/final-evaluation/director-sign`, { signatureBase64 });
    return data?.data ?? data;
  },

  submitDelivery: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/delivery`, dto);
    return data?.data ?? data;
  },

  signDelivery: async (id: string, signatureBase64: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/delivery/patient-sign`, { signatureBase64 });
    return data?.data ?? data;
  },

  getFollowUps: async (id: string): Promise<FollowUp[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${id}/follow-ups`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  addFollowUp: async (id: string, dto: Omit<FollowUp, "id" | "caseId" | "createdAt">): Promise<FollowUp> => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/follow-ups`, dto);
    return data?.data ?? data;
  },

  getTimeline: async (id: string): Promise<TimelineEvent[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${id}/timeline`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/prosthetics/cases/${id}/pdf`, { responseType: "blob" });
    return response.data;
  },

  getDonorReport: async (params?: { from?: string; to?: string }) => {
    const { data } = await apiClient.get("/prosthetics/reports/donor", { params });
    return data?.data ?? data;
  },

  downloadDonorPdf: async (params?: { from?: string; to?: string }): Promise<Blob> => {
    const response = await apiClient.get("/prosthetics/reports/donor/pdf", {
      params,
      responseType: "blob",
    });
    return response.data;
  },
};
