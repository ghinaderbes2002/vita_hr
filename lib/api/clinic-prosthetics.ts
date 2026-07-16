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
  // Measurement sheets — each POST appends a new record, returned newest-first
  transtibialAssessment?: MeasurementAssessment[];
  transfemoralAssessment?: MeasurementAssessment[];
  ankleDisarticulationAssessment?: MeasurementAssessment[];
  kneeDisarticulationAssessment?: MeasurementAssessment[];
  hemipelvectomyAssessment?: MeasurementAssessment[];
  elbowDisarticulationAssessment?: MeasurementAssessment[];
  transhumeralAssessment?: MeasurementAssessment[];
  transradialAssessment?: MeasurementAssessment[];
  prosthesisCompleted?: boolean | null;
  prosthesisType?: ProstheticType | null;
  prosthesisSuitable?: boolean | null;
  proposedProsthesisType?: string | null;
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

export interface MeasurementAssessment {
  id: string;
  examinedAt: string;
  side: "RIGHT" | "LEFT";
  notes?: string | null;
  footMeasurement?: string | null;
  soundLimb?: Record<string, string> | null;
  affectedLimb?: Record<string, string> | null;
}

export interface CreateProstheticsCaseDto {
  patientId: string;
  // Backend accepts a single value or an array for both of these.
  amputationType?: AmputationType | AmputationType[];
  amputationSide?: AmputationSide;
  amputationLevel?: string | string[];
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
  prosthesisSuitable?: boolean;
  proposedProsthesisType?: string | null;
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
  romData?: Record<string, { selected: boolean; grade?: string }>;
  muscleMotionNotes?: string;
  neuromaPresent?: boolean;
  usesProstheticLimb?: boolean;
  prostheticLimbType?: string;
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

// Follow-up program alert (case-level). A case can have several; the head
// replies to each individually.
export interface CaseAlert {
  id: string;
  note: string;
  sentAt: string;
  sentByUserId?: string | null;
  responseNote?: string | null;
  respondedAt?: string | null;
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
  // Inventory part-request the backend creates/links for this component and
  // returns inline with GET /components. null → the component was saved without
  // a matching inventory item (scenario 2); undefined → old data from before the
  // backend embedded the request.
  inventoryRequest?: {
    requestId: string;
    status: "PENDING" | "APPROVED" | "NOT_AVAILABLE" | "DONE";
    notes: string | null;
  } | null;
  addedAt?: string;
  addedBy?: string | null;
  inventoryItemId?: string | null;
  // legacy fields (kept for backward compat with old saved data)
  source?: ComponentSource;
  code?: string | null;
  name?: string | null;
  quantity?: number;
  createdAt: string;
}

export interface AddComponentDto {
  // Send when the part maps to an existing inventory item (scenario 1). Omit for
  // a free-text part (scenario 2) — the backend auto-matches by partCode.
  inventoryItemId?: string;
  partCode: string;
  partName: string;
  supplier?: string;
  sourceLocation?: "WAREHOUSE" | "EXTERNAL" | "PATIENT_OWNED" | "OTHER";
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

  signCommitteeDecision: async (id: string, role: "DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST", signatureUrl: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/committee/sign`, { role, signatureUrl });
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

  getTreatmentPrograms: async (caseId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/treatment-programs`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  createTreatmentProgram: async (caseId: string, dto: TreatmentProgramSessionDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/treatment-programs`, dto);
    return data?.data ?? data;
  },

  updateTreatmentProgram: async (caseId: string, programId: string, dto: TreatmentProgramSessionDto) => {
    const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/treatment-programs/${programId}`, dto);
    return data?.data ?? data;
  },

  deleteTreatmentProgram: async (caseId: string, programId: string) => {
    const { data } = await apiClient.delete(`/prosthetics/cases/${caseId}/treatment-programs/${programId}`);
    return data?.data ?? data;
  },

  archiveTreatmentProgram: async (caseId: string, programId: string, notes?: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/treatment-programs/${programId}/archive`, { notes });
    return data?.data ?? data;
  },

  // Technician raises an alert to the department head for the follow-up program.
  // A case can have multiple alerts, each with its own id.
  sendCaseAlert: async (caseId: string, note: string): Promise<CaseAlert> => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/alert`, { note });
    return data?.data ?? data;
  },

  // All alerts for a case (newest handling done in the UI).
  getCaseAlerts: async (caseId: string): Promise<CaseAlert[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/alerts`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  // Department head replies to a specific alert; notifies the technician.
  respondToAlert: async (caseId: string, alertId: string, note: string): Promise<CaseAlert> => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/alerts/${alertId}/respond`, { note });
    return data?.data ?? data;
  },

  getReviewPrograms: async (caseId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/review-program`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  createReviewProgram: async (caseId: string, dto: ReviewProgramDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/review-program`, dto);
    return data?.data ?? data;
  },

  updateReviewProgram: async (caseId: string, reviewId: string, dto: ReviewProgramDto) => {
    const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/review-program/${reviewId}`, dto);
    return data?.data ?? data;
  },

  deleteReviewProgram: async (caseId: string, reviewId: string) => {
    await apiClient.delete(`/prosthetics/cases/${caseId}/review-program/${reviewId}`);
  },

  addConsumable: async (id: string, dto: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/consumables`, dto);
    return data?.data ?? data;
  },

  getFinalEvaluation: async (id: string) => {
    const { data } = await apiClient.get(`/prosthetics/cases/${id}/final-evaluation`);
    return data?.data ?? data;
  },

  submitFinalEvaluation: async (id: string, dto: FinalEvaluationDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/final-evaluation`, dto);
    return data?.data ?? data;
  },

  signFinalEvaluation: async (id: string, dto: DirectorSignDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${id}/final-evaluation/director-sign`, dto);
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

  deleteAttachment: async (id: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`/prosthetics/cases/${id}/attachments/${attachmentId}`);
  },

  downloadAttachment: async (id: string, attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/prosthetics/cases/${id}/attachments/${attachmentId}/download`,
      { responseType: "blob" },
    );
    return response.data;
  },

  submitAnkleDisarticulation: async (id: string, dto: AnkleDisarticulationDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-ankle-disarticulation`,
      dto,
    );
    return response.data;
  },

  submitKneeDisarticulation: async (id: string, dto: KneeDisarticulationDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-knee-disarticulation`,
      dto,
    );
    return response.data;
  },

  submitTransradial: async (id: string, dto: TransradialDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-transradial`,
      dto,
    );
    return response.data;
  },

  submitTranshumeral: async (id: string, dto: TranshumeralDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-transhumeral`,
      dto,
    );
    return response.data;
  },

  submitElbowDisarticulation: async (id: string, dto: ElbowDisarticulationDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-elbow-disarticulation`,
      dto,
    );
    return response.data;
  },

  // ── Employee signatures ─────────────────────────────────────────────────────
  getEmployeeSignature: async (employeeId: string): Promise<{ hasSignature: boolean; signatureUrl: string | null }> => {
    const { data } = await apiClient.get(`/employees/${employeeId}/signature`);
    return data?.data ?? data;
  },

  uploadEmployeeSignature: async (employeeId: string, file: File): Promise<{ signatureUrl: string }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post(`/employees/${employeeId}/signature`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data ?? data;
  },

  uploadSignatureFile: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post(`/uploads/signatures`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const d = data?.data ?? data;
    return { url: d?.url ?? d?.signatureUrl ?? d?.path ?? "" };
  },


  submitHemipelvectomy: async (id: string, dto: HemipelvectomyDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-hemipelvectomy`,
      dto,
    );
    return response.data;
  },

  submitTranstibial: async (id: string, dto: TranstibialDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-transtibial`,
      dto,
    );
    return response.data;
  },

  submitTransfemoral: async (id: string, dto: TransfemoralDto) => {
    const response = await apiClient.post(
      `/prosthetics/cases/${id}/assessment-transfemoral`,
      dto,
    );
    return response.data;
  },

  // ── Pro-015 Balance Assessment ───────────────────────────────────────────────
  getBalanceAssessments: async (caseId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/balance-assessment`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },
  addBalanceAssessment: async (caseId: string, dto: BalanceAssessmentDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/balance-assessment`, dto);
    return data?.data ?? data;
  },
  updateBalanceAssessment: async (caseId: string, formId: string, dto: BalanceAssessmentDto) => {
    const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/balance-assessment/${formId}`, dto);
    return data?.data ?? data;
  },
  deleteBalanceAssessment: async (caseId: string, formId: string) => {
    await apiClient.delete(`/prosthetics/cases/${caseId}/balance-assessment/${formId}`);
  },
  // Freeze the form — afterwards any PATCH is rejected (400). Returns isSaved.
  saveBalanceAssessmentForm: async (caseId: string, formId: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/balance-assessment/${formId}/save`);
    return data?.data ?? data;
  },
  archiveBalanceAssessment: async (caseId: string, formId: string, reason: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/balance-assessment/${formId}/archive`, { reason });
    return data?.data ?? data;
  },

  // ── Pro-019 Prosthetic Delivery ──────────────────────────────────────────────
  getProstheticDelivery: async (caseId: string) => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/prosthetic-delivery`);
    return data?.data ?? data ?? null;
  },
  saveProstheticDelivery: async (caseId: string, dto: ProstheticDeliveryDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/prosthetic-delivery`, dto);
    return data?.data ?? data;
  },
  addDeliveryItem: async (caseId: string, dto: DeliveryItemDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/prosthetic-delivery/items`, dto);
    return data?.data ?? data;
  },
  updateDeliveryItem: async (caseId: string, itemId: string, dto: DeliveryItemDto) => {
    const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/prosthetic-delivery/items/${itemId}`, dto);
    return data?.data ?? data;
  },
  deleteDeliveryItem: async (caseId: string, itemId: string) => {
    await apiClient.delete(`/prosthetics/cases/${caseId}/prosthetic-delivery/items/${itemId}`);
  },
  // Approve a delivery item → it then appears in the final delivery.
  approveDeliveryItem: async (caseId: string, itemId: string) => {
    const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/prosthetic-delivery/items/${itemId}/approve`);
    return data?.data ?? data;
  },
  // ── Final delivery — a record independent from the trial delivery ──────────
  // Returns null when it hasn't been created yet.
  getFinalDelivery: async (caseId: string) => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/final-delivery`);
    return data?.data ?? data ?? null;
  },
  // Create once (400 if it already exists). Empty body → the backend copies the
  // header from the trial delivery and its approved items.
  createFinalDelivery: async (caseId: string, dto: FinalDeliveryDto = {}) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/final-delivery`, dto);
    return data?.data ?? data;
  },
  // Patch only the fields you send. The record must be created first (POST);
  // if it hasn't been (PATCH → 404), create it (an empty body copies the header
  // and approved items from the trial delivery) and then apply the edits.
  updateFinalDelivery: async (caseId: string, dto: FinalDeliveryDto) => {
    const patch = async () => {
      const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/final-delivery`, dto);
      return data?.data ?? data;
    };
    try {
      return await patch();
    } catch (e: any) {
      if (e?.response?.status !== 404) throw e;
      await apiClient.post(`/prosthetics/cases/${caseId}/final-delivery`, {});
      return await patch();
    }
  },

  // ── Pro-016 Gait Analysis ─────────────────────────────────────────────────────
  getGaitAnalysisForms: async (caseId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/prosthetics/cases/${caseId}/gait-analysis-forms`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },
  addGaitAnalysisForm: async (caseId: string, dto: GaitAnalysisFormDto) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/gait-analysis-forms`, dto);
    return data?.data ?? data;
  },
  updateGaitAnalysisForm: async (caseId: string, formId: string, dto: GaitAnalysisFormDto) => {
    const { data } = await apiClient.patch(`/prosthetics/cases/${caseId}/gait-analysis-forms/${formId}`, dto);
    return data?.data ?? data;
  },
  deleteGaitAnalysisForm: async (caseId: string, formId: string) => {
    await apiClient.delete(`/prosthetics/cases/${caseId}/gait-analysis-forms/${formId}`);
  },
  // Freeze the form — afterwards any PATCH is rejected (400). Returns isSaved.
  saveGaitAnalysisForm: async (caseId: string, formId: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/gait-analysis-forms/${formId}/save`);
    return data?.data ?? data;
  },
  archiveGaitAnalysisForm: async (caseId: string, formId: string, reason: string) => {
    const { data } = await apiClient.post(`/prosthetics/cases/${caseId}/gait-analysis-forms/${formId}/archive`, { reason });
    return data?.data ?? data;
  },
};

export interface AnkleDisarticulationDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  footMeasurement?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface KneeDisarticulationDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  footMeasurement?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface TransradialDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface TranshumeralDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface ElbowDisarticulationDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface TreatmentProgramDto {
  description?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  technicianId?: string;
  technicianSignatureUrl?: string;
  managerSignatureUrl?: string;
  notes?: string;
}

export interface TreatmentProgramSessionDto {
  sessionDate?: string;
  sessionTime?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  description?: string;
  technicianId?: string;
  technicianSignatureUrl?: string;
  managerSignatureUrl?: string;
  notes?: string;
}

export interface ReviewProgramDto {
  sessionDate?: string;
  sessionTime?: string;
  description?: string;
  technicianId?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  signatureUrl?: string;
  notes?: string;
}

export interface BalanceResultItem { key: string; result: string; }
export interface ExerciseProgramItem { exercise: string; position: string; dosage: string; support: string; notes?: string; selected?: boolean; }
export interface BalanceAssessmentDto {
  assessmentDate?: string;
  previousProsthesis?: boolean;
  assistiveDevice?: string;
  staticBalance?: Record<string, string>;
  dynamicTasks?: Record<string, string>;
  dynamicActivities?: Record<string, string>;
  historyOfFalls?: boolean;
  nearFalls?: boolean;
  fearOfFalling?: boolean;
  fallRiskLevel?: string;
  overallBalanceLevel?: string;
  limitingFactors?: string[];
  exerciseProgram?: Record<string, ExerciseProgramItem>;
  programProgression?: string[];
  followUpWeeks?: number;
  expectedOutcomes?: string[];
  physiotherapistId?: string;
  physiotherapistSignatureUrl?: string;
  committeeHeadId?: string;
  committeeHeadSignatureUrl?: string;
  followUpDate?: string;
  notes?: string;
  // Optional free-text details for the "other"/conditional answers.
  previousProsthesisNotes?: string;
  fallRiskNotes?: string;
  limitingFactorsOtherNotes?: string;
}

export interface ProstheticDeliveryDto {
  inspectionDate?: string;
  prosthetistId?: string;
  physiotherapistId?: string;
  medicalDirectorId?: string;
  medicalDirectorSignatureUrl?: string;
  medicalDirectorSignedAt?: string;
  signatureDate?: string;
}

// Final delivery — every field optional; omitted ones are copied from the trial
// delivery on create. Items are copied once at creation (approved ones only).
export interface FinalDeliveryDto {
  inspectionDate?: string;
  prosthetistId?: string;
  physiotherapistId?: string;
  ceoId?: string;
  ceoSignatureUrl?: string;
  signatureDate?: string;
  medicalDirectorId?: string;
  medicalDirectorSignatureUrl?: string;
  medicalDirectorSignedAt?: string;
}

export interface DeliveryItemDto {
  deliveredProduct?: string;
  partCode?: string;
  quantity?: number;
  company?: string;
  notes?: string;
  itemAddedDate?: string;
}

export interface GaitPhaseDto { deviations?: string[]; possibleCause?: string; notes?: string; }
export interface RehabPlanDto { strengthening?: string[]; balanceTrain?: string[]; gaitTrain?: string[]; }
export interface GaitAnalysisFormDto {
  sessionDate?: string;
  suspensionSystem?: string[];
  socketBearing?: string;
  kneeJointType?: string;
  footType?: string;
  patientComplaints?: string[];
  painIntensity?: number;
  alignmentCheck?: string;
  hasRomLimitations?: boolean;
  hasHipFlexionContracture?: boolean;
  hasKneeFlexionContracture?: boolean;
  weakHipAbductors?: boolean;
  weakHipExtensors?: boolean;
  weakTrunkMuscles?: boolean;
  otherWeakness?: string;
  trunkStability?: string;
  abdominalControl?: string;
  pelvicControl?: string;
  sittingBalance?: string;
  standingBalance?: string;
  assistiveDevice?: string;
  speedMs?: number;
  cadence?: number;
  stepLengthProsCm?: number;
  stepLengthSoundCm?: number;
  stancePercProsthetic?: number;
  stancePercSound?: number;
  symmetry?: string;
  initialContact?: GaitPhaseDto;
  loadingResponse?: GaitPhaseDto;
  midStance?: GaitPhaseDto;
  terminalStance?: GaitPhaseDto;
  preSwing?: GaitPhaseDto;
  swingPhase?: GaitPhaseDto;
  gaitNotes?: string;
  prostheticIssues?: string[];
  mainProblem?: string;
  likelyCauses?: string[];
  recommendations?: string[];
  rehabPlan?: RehabPlanDto;
  rehabNotes?: string;
  examinerProsthetistId?: string;
  prosthetistSignatureUrl?: string;
  examinerPhysiotherapistId?: string;
  physiotherapistSignatureUrl?: string;
  notes?: string;
  // Optional free-text notes (diagnosis/recommendations + the "other" answers).
  recommendationsNotes?: string;
  mainProblemNotes?: string;
  patientComplaintsOtherNotes?: string;
  suspensionSystemOtherNotes?: string;
  prostheticIssuesOtherNotes?: string;
  likelyCausesOtherNotes?: string;
}

export interface FinalEvaluationDto {
  supervisorId?: string;
  residualLimbCondition?: string;
  suspensionSystemUsed?: string;
  socksDelivered?: number;
  linersDelivered?: number;
  fittingDate?: string;
  generalNotes?: string;
  physioOpinion?: string;
  departmentHeadOpinion?: string;
  prosthetistOpinion?: string;
  prosthetistSupervisorOpinion?: string;
  committeeHeadOpinion?: string;
  expertOpinion?: string;
  readyForDelivery?: boolean;
  needsFollowUp?: boolean;
  followUpPlan?: string;
  medicalDirectorNotes?: string;
}

export interface DirectorSignDto {
  signatureBase64: string;
  medicalDirectorNotes?: string;
  managerNotes?: string;
  patientFileComplete?: boolean;
}

export interface HemipelvectomyDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  footMeasurement?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface TranstibialDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  footMeasurement?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}

export interface TransfemoralDto {
  side: "RIGHT" | "LEFT";
  notes?: string;
  footMeasurement?: string;
  soundLimb?: Record<string, string>;
  affectedLimb?: Record<string, string>;
  examinerProsthetistIds?: string[];
  examinerPhysioIds?: string[];
  examinerSupervisorIds?: string[];
}
