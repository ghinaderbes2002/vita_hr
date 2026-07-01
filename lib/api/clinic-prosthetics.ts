import { apiClient } from "./client";

export type AmputationType = "UPPER" | "LOWER" | "BOTH";
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
export type AmputationCause = "WAR_INJURY" | "TRAFFIC_ACCIDENT" | "DIABETES" | "VASCULAR_DISEASE" | "CONGENITAL" | "INFECTION" | "TUMOR" | "WORK_INJURY" | "OTHER";
export type LimbShape = "CONICAL_SOFT" | "CONICAL_BONY" | "NORMAL" | "BONY" | "SOFT";
export type SkinAppearanceVal = "NORMAL" | "PALE" | "DRY" | "PEELING" | "INFLAMED" | "OOZING";
export type SkinColorVal = "NORMAL" | "PALE" | "CYANOTIC" | "ERYTHEMATOUS" | "YELLOWISH";
export type SkinTemperatureVal = "NORMAL" | "HOT" | "COLD";
export type ScarConditionVal = "OPEN" | "CLOSED" | "FLEXIBLE" | "HEALED" | "OOZING" | "INFLAMED" | "DRY";
export type PainTypeVal = "NUMBNESS" | "DULL_ACHE" | "HOT_BURNING" | "SHARP_STABBING" | "PINS" | "OTHER";
export type JointsROMVal = "NORMAL" | "ACTIVE" | "SEDENTARY";
export type LoadToleranceVal = "PALPABLE" | "NOT_PALPABLE" | "WEIGHT_BEARING" | "NON_WEIGHT_BEARING";
export type WeightBearingLevelVal = "FULL" | "HIGH" | "MEDIUM" | "LOW";

type StaffMember = { firstNameAr: string; lastNameAr: string; jobTitleAr?: string } | null;

export interface ProstheticsAttachment {
  id: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  caption?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
}

export interface ProstheticsCase {
  id: string;
  patientId: string;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string };
  status: ProstheticsStatus;
  amputationType?: AmputationType | AmputationType[] | null;
  amputationSide?: AmputationSide | null;
  amputationLevel?: string | null;
  dateOfAmputation?: string | null;
  causeOfAmputation?: string | null;
  numberOfAmputations?: number | null;
  // General assessment fields
  amputationCause?: AmputationCause | null;
  amputationCauseOtherDetail?: string | null;
  moreAffectedSide?: "RIGHT" | "LEFT" | null;
  currentlyUsingProsthesis?: boolean | null;
  previouslyUsedProsthesis?: boolean | null;
  previousProsthesisSystemDetail?: string | null;
  // Intake fields
  hasChronicDiseases?: boolean | null;
  chronicDiseases?: string | null;
  hasPhysicalTherapy?: boolean | null;
  physicalTherapyDetails?: string | null;
  hasPreviousProsthesis?: boolean | null;
  previousProsthesisDetails?: string | null;
  previousProsthesisWhen?: string | null;
  previousProsthesisWhere?: string | null;
  previousProsthesisType?: string | null;
  hasRevisionSurgery?: boolean | null;
  revisionDetails?: string | null;
  // Staff IDs
  prosthetistId?: string | null;
  physiotherapistId?: string | null;
  assignedProsthetistId?: string | null;
  supervisingDoctorId?: string | null;
  workshopSupervisorId?: string | null;
  // Staff objects (new)
  prosthetist?: StaffMember;
  physiotherapist?: StaffMember;
  supervisingDoctor?: StaffMember;
  workshopSupervisor?: StaffMember;
  committeeDecision?: CommitteeDecision | null;
  proposedProstheticType?: ProstheticType | null;
  deliveryDate?: string | null;
  notes?: string | null;
  upperAssessment?: AssessmentResult[];
  lowerAssessment?: AssessmentResult[];
  prosthesisCompleted?: boolean | null;
  prosthesisType?: ProstheticType | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  caseId: string;
  side: "LEFT" | "RIGHT";
  residualLimbLength?: string | null;
  residualLimbShape?: string | null;
  [key: string]: any;
}

export interface CreateProstheticsCaseDto {
  patientId: string;
  amputationType?: AmputationType;
  amputationSide?: AmputationSide;
  amputationLevel?: string;
  amputationDate?: string;
  amputationCause?: AmputationCause | string;
  amputationCauseOtherDetail?: string;
  moreAffectedSide?: "RIGHT" | "LEFT";
  currentlyUsingProsthesis?: boolean;
  previouslyUsedProsthesis?: boolean;
  previousProsthesisSystemDetail?: string;
  amputationCount?: number;
  hasChronicDiseases?: boolean;
  chronicDiseases?: string;
  hasPhysicalTherapy?: boolean;
  physicalTherapyDetails?: string;
  hasPreviousProsthesis?: boolean;
  previousProsthesisDetails?: string;
  previousProsthesisWhen?: string;
  previousProsthesisWhere?: string;
  previousProsthesisType?: string;
  hasRevisionSurgery?: boolean;
  revisionDetails?: string;
  clinicalHistory?: string;
  prosthesisType?: ProstheticType;
  prosthesisCompleted?: boolean;
  notes?: string;
}

export interface AssessmentUpperDto {
  side: "LEFT" | "RIGHT";
  residualLimbLength?: "VERY_SHORT" | "SHORT" | "MEDIUM" | "LONG";
  residualLimbShape?: LimbShape;
  amputationLevelNote?: string;
  painPresent?: boolean;
  painIntensity?: number;
  painTypes?: PainTypeVal[];
  painTypeOtherDetail?: string;
  phantomPainPresent?: boolean;
  phantomPainIntensity?: number;
  neuromaPalpable?: boolean;
  skinNotes?: string;
  skinAppearance?: SkinAppearanceVal[];
  skinColor?: SkinColorVal[];
  skinTemperature?: SkinTemperatureVal;
  scarCondition?: string[];
  hasSkinGrafts?: boolean;
  graftArea?: string;
  closureNotes?: string;
  generalHealthNotes?: string;
  otherLimbCondition?: string;
  canBalanceOneSide?: boolean;
  usesCompressionBandage?: boolean;
  jointsRangeOfMotion?: JointsROMVal;
  activityLevel?: KLevel;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface AssessmentLowerDto {
  side: "LEFT" | "RIGHT";
  residualLimbLength?: "VERY_SHORT" | "SHORT" | "MEDIUM" | "LONG";
  residualLimbShape?: LimbShape;
  amputationLevelNote?: string;
  painPresent?: boolean;
  painIntensity?: number;
  painArea?: string;
  painTypes?: PainTypeVal[];
  painTypeOtherDetail?: string;
  phantomPainPresent?: boolean;
  phantomPainIntensity?: number;
  neuromaPalpable?: boolean;
  loadTolerance?: LoadToleranceVal;
  weightBearingLevel?: WeightBearingLevelVal;
  notes?: string;
  skinAppearance?: SkinAppearanceVal[];
  skinColor?: SkinColorVal[];
  skinTemperature?: SkinTemperatureVal;
  scarCondition?: string[];
  hasSkinGrafts?: boolean;
  graftArea?: string;
  generalHealthNotes?: string;
  otherLimbCondition?: string;
  usesAssistiveDevices?: boolean;
  assistiveDeviceTypes?: string;
  canClimbStairs?: boolean;
  canBalanceOneSide?: boolean;
  jointsRangeOfMotion?: JointsROMVal;
  activityLevel?: KLevel;
  romData?: {
    ankle?: { dorsiflexion?: boolean; plantarFlexion?: boolean; inversion?: boolean; eversion?: boolean };
    knee?: { flexion?: boolean; extension?: boolean };
    hip?: { flexion?: boolean; extension?: boolean; abduction?: boolean; adduction?: boolean; internalRotation?: boolean };
  };
  muscleMotionNotes?: string;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface CommitteeOpinionDto {
  role: "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR";
  opinion: string;
}

export interface CommitteeDecisionDto {
  decision: CommitteeDecision;
  finalSummary: string;
}

export interface CaseComponent {
  id: string;
  caseId: string;
  partCode?: string | null;
  partName?: string | null;
  supplier?: string | null;
  sourceLocation?: string | null;
  reason?: string | null;
  matchedInInventory?: boolean;
  // legacy fields (kept for backward compat with old saved data)
  inventoryItemId?: string | null;
  source?: ComponentSource;
  code?: string | null;
  name?: string | null;
  quantity?: number;
  createdAt: string;
}

export interface AddComponentDto {
  partCode: string;
  partName: string;
  supplier?: string;
  sourceLocation?: "WAREHOUSE" | "SUPPLIER";
  reason?: string;
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

  signCommitteeDecision: async (id: string, role: "DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST", signatureBase64: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/committee/sign`, { role, signatureBase64 });
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

  getAttachments: async (id: string): Promise<ProstheticsAttachment[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${id}/attachments`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  uploadAttachment: async (id: string, file: File, caption?: string): Promise<ProstheticsAttachment> => {
    const fd = new FormData();
    fd.append("file", file);
    if (caption) fd.append("caption", caption);
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/attachments`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data ?? data;
  },
};
