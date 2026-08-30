import { apiClient } from "./client";
import { TimelineEvent } from "./clinic-prosthetics";

// ─── Status ───────────────────────────────────────────────────────────────────
export type PhysioStatus =
  | "INTAKE" | "COMPLAINT" | "PAIN_MAP" | "MEDICAL_HISTORY" | "GOALS"
  | "POSTURAL_ASSESSMENT" | "TREATMENT_PLAN" | "EVALUATION"
  | "ACTIVE_TREATMENT" | "SUPERVISOR_REVIEW" | "DOCTOR_REVIEW"
  | "COMPLETED" | "DISCHARGED" | "CANCELLED";

// ─── Enums ────────────────────────────────────────────────────────────────────
export type PainLevel    = "MILD" | "MODERATE" | "SEVERE" | "EXCRUCIATING";
export type PainDuration = "INTERMITTENT" | "CONSTANT" | "WITH_CERTAIN_MOTIONS";
export type LifeType     = "PROFESSIONAL" | "NORMAL" | "SEDENTARY" | "ABNORMAL";

export type PhysioGoal =
  | "BACK_TO_SPORTS" | "BACK_TO_WORK" | "SIMPLE_WORKS" | "PAIN_RELIEF" | "OTHER";

export type ChronicCondition =
  | "AIDS_HIV" | "MULTIPLE_SCLEROSIS" | "LIVER_PROBLEMS" | "ARTHRITIS" | "STDS"
  | "PNEUMONIA" | "CANCER" | "ANGINA" | "URINARY_INFECTION" | "DIABETES"
  | "BLOOD_CLOTS" | "HEMOPHILIA" | "CIRCULATION_PROBLEMS" | "LUNG_ISSUES"
  | "EYE_INFECTION" | "STROKE" | "JOINT_BONE_INFECTION" | "KIDNEY_PROBLEMS"
  | "MUSCULOSKELETAL" | "ANEMIA" | "TUBERCULOSIS" | "ASTHMA" | "ARTERIOSCLEROSIS"
  | "CHEMICAL_DEPENDENCY" | "BONE_INFECTION" | "EPILEPSY" | "DEPRESSION"
  | "HEART_PROBLEMS" | "HYPERTENSION" | "OTHER";

export type TestType =
  | "MRI" | "XRAY" | "CT" | "MYELOGRAM" | "BONE_DENSITY" | "OTHER";

export type TherapyModality =
  | "MANUAL_THERAPY" | "MASSAGE" | "KINESIO_TAPING" | "COMPRESSION"
  | "PARAFFIN" | "GRASTON" | "MET" | "HOT_PACKS" | "COLD_PACKS"
  | "TRACTION" | "EXERCISES" | "ESWT" | "US" | "TENS" | "EMS"
  | "LASER" | "CPM" | "PNF" | "INFRARED" | "SIS" | "OTHER";

export type EvaluationModality =
  | "MANUAL_THERAPY" | "MASSAGE" | "KINESIO_TAPING" | "COMPRESSION"
  | "PARAFFIN" | "GRASTON" | "MET" | "HOT_PACKS" | "COLD_PACKS"
  | "TRACTION" | "EXERCISES" | "ESWT" | "US" | "TENS" | "EMS"
  | "LASER" | "CPM" | "PNF" | "INFRARED" | "SIS" | "OTHER";

// ─── Option orders ────────────────────────────────────────────────────────────
// The display words live in `clinic.physio.sheet` (messages/{ar,en,tr}.json) so
// the case screens and the printed sheet read in the user's locale; only the
// stored values and the order they are shown in belong here.
export const THERAPY_MODALITY_VALUES: TherapyModality[] = [
  "MANUAL_THERAPY", "MASSAGE", "KINESIO_TAPING", "COMPRESSION", "PARAFFIN",
  "GRASTON", "MET", "HOT_PACKS", "COLD_PACKS", "TRACTION", "EXERCISES", "ESWT",
  "US", "TENS", "EMS", "LASER", "CPM", "PNF", "INFRARED", "SIS", "OTHER",
];

export const EVALUATION_MODALITY_VALUES: EvaluationModality[] = [...THERAPY_MODALITY_VALUES];

export const CHRONIC_CONDITION_VALUES: ChronicCondition[] = [
  "LIVER_PROBLEMS", "PNEUMONIA", "URINARY_INFECTION", "DIABETES", "HEMOPHILIA",
  "LUNG_ISSUES", "STROKE", "KIDNEY_PROBLEMS", "ANEMIA", "ASTHMA",
  "CHEMICAL_DEPENDENCY", "EPILEPSY", "HYPERTENSION", "AIDS_HIV", "ARTHRITIS",
  "CANCER", "MULTIPLE_SCLEROSIS", "STDS", "ANGINA", "BLOOD_CLOTS",
  "CIRCULATION_PROBLEMS", "EYE_INFECTION", "JOINT_BONE_INFECTION",
  "MUSCULOSKELETAL", "TUBERCULOSIS", "ARTERIOSCLEROSIS", "BONE_INFECTION",
  "DEPRESSION", "HEART_PROBLEMS", "OTHER",
];

export const PHYSIO_GOAL_VALUES: PhysioGoal[] = [
  "BACK_TO_SPORTS", "BACK_TO_WORK", "SIMPLE_WORKS", "PAIN_RELIEF", "OTHER",
];

// ─── Interfaces ───────────────────────────────────────────────────────────────
/**
 * A doctor exam is a physio case with its own type: same screens and endpoints,
 * its own case-number series (DE-…), and it can be converted into a PT case.
 */
export type PhysioCaseType = "PHYSIO" | "DOCTOR_EXAM";

export interface PhysioCase {
  id: string;
  caseNumber?: string;
  caseType?: PhysioCaseType | null;
  patientId: string;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string };
  status: PhysioStatus;
  supervisingDoctorId?: string | null;
  physiotherapistId?: string | null;
  caseManagerId?: string | null;
  finalSummary?: string | null;
  // Complaint
  majorComplaint?: string | null;
  symptoms?: string | null;
  currentJob?: string | null;
  lifeType?: LifeType | null;
  complaintStartDate?: string | null;
  possibleCause?: string | null;
  previousDoctorSeen?: string | null;
  previousTreatment?: string | null;
  painLevel?: PainLevel | null;
  painDuration?: PainDuration | null;
  painProgression?: string | null;
  hadPreviousInjury?: string | null;
  bestTimeOfDay?: string | null;
  worstTimeOfDay?: string | null;
  complaintType?: string | null;
  painLocation?: string | null;
  complaintDuration?: string | null;
  complaintNotes?: string | null;
  hasChronicDiseases?: boolean | null;
  chronicDiseasesDetail?: string | null;
  visitedSpecialist?: boolean | null;
  specialistReason?: string | null;
  hadPreviousPT?: boolean | null;
  previousPTDetail?: string | null;
  hadSurgery?: boolean | null;
  surgeryDetail?: string | null;
  painTypes?: string[] | null;
  painTypeOther?: string | null;
  painTypeOtherColor?: string | null;
  customPainTypes?: { name: string; color: string }[] | null;
  aggravatingFactors?: string[] | null;
  alleviatingFactors?: string[] | null;
  aggravatingOther?: string | null;
  alleviatingOther?: string | null;
  // Treatment plan header
  treatmentFrom?: string | null;
  treatmentTo?: string | null;
  anticipatedVisits?: number | null;
  // Nested data (populated by backend)
  painMap?: { regions: PainRegion[] } | null;
  medicalHistory?: any;
  goals?: any;
  posturalAssessment?: any;
  treatmentPlan?: any;
  evaluation?: { modalities?: EvaluationModality[]; otherModality?: string | null; notes?: string | null; evaluation?: string | null } | null;
  notes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Only a doctor exam can be created — the API rejects a direct PHYSIO create with
 * 400. A PT case is born from convertToPhysio, so the type is fixed here.
 */
export interface CreatePhysioCaseDto {
  patientId: string;
  caseType: "DOCTOR_EXAM";
  majorComplaint?: string;
  symptoms?: string;
  notes?: string;
}

/**
 * Legacy cases carry no caseType, so the DE- case-number series is the fallback
 * signal — treat anything else as a regular PT case.
 */
export const isDoctorExamCase = (c: Pick<PhysioCase, "caseType" | "caseNumber">) =>
  c.caseType === "DOCTOR_EXAM" || !!c.caseNumber?.startsWith("DE-");

export interface UpdatePhysioCaseDto {
  // Complaint fields
  majorComplaint?: string;
  symptoms?: string;
  currentJob?: string;
  lifeType?: LifeType;
  complaintStartDate?: string;
  possibleCause?: string;
  previousDoctorSeen?: string;
  previousTreatment?: string;
  painLevel?: PainLevel;
  painDuration?: PainDuration;
  painProgression?: string;
  hadPreviousInjury?: string;
  bestTimeOfDay?: string;
  worstTimeOfDay?: string;
  complaintType?: string;
  painLocation?: string;
  complaintDuration?: string;
  complaintNotes?: string;
  hasChronicDiseases?: boolean;
  chronicDiseasesDetail?: string;
  visitedSpecialist?: boolean;
  specialistReason?: string;
  hadPreviousPT?: boolean;
  previousPTDetail?: string;
  hadSurgery?: boolean;
  surgeryDetail?: string;
  painTypes?: string[];
  painTypeOther?: string;
  aggravatingFactors?: string[];
  alleviatingFactors?: string[];
  aggravatingOther?: string;
  alleviatingOther?: string;
  // Treatment plan header
  treatmentFrom?: string;
  treatmentTo?: string;
  anticipatedVisits?: number;
  physiotherapistId?: string;
  caseManagerId?: string;
}

export interface PainRegion {
  side: "front" | "back";
  x: number;
  y: number;
  intensity: number;
  painType?: string;
  label?: string;
  notes?: string;
}

export interface EvaluationDto {
  modalities?: EvaluationModality[];
  otherModality?: string;
  notes?: string;
  evaluation?: string;
}

export interface PainMapDto {
  regions: PainRegion[];
  painTypes?: string[];
  painTypeOther?: string;
  painTypeOtherColor?: string;
  customPainTypes?: { name: string; color: string }[];
  aggravatingFactors?: string[];
  aggravatingOther?: string;
  alleviatingFactors?: string[];
  alleviatingOther?: string;
}

export interface MedicalHistoryDto {
  lifeType?: string;
  smokes?: boolean;
  hasSmokedBefore?: boolean;
  smokingFrequency?: string;
  hasPacemaker?: boolean;
  pacemakerDetail?: string;
  allergies?: string;
  adhesiveAllergy?: boolean;
  adhesiveAllergyDetail?: string;
  isPregnant?: boolean;
  maritalStatus?: string;
  lastMenstrualPeriod?: string;
  currentMedications?: string;
  prescriptionDrugs?: boolean;
  herbalSupplements?: boolean;
  supplementsList?: string;
  previousDiagnoses?: string;
  previousComplaintsSurgeries?: string;
  hasOtherHealthProblems?: boolean;
  otherConditions?: string;
  hasDoctorRestrictions?: boolean;
  doctorRestrictions?: string;
  hadPTSameProblem?: boolean;
  ptSameProblemDetail?: string;
  receivingOtherTreatment?: boolean;
  otherTreatmentDetail?: string;
  chronicConditions?: ChronicCondition[];
  chronicConditionsOther?: string;
  testsHad?: TestType[];
  testsOther?: string;
  testResults?: string;
  newAnalysis?: string;
  newAnalysisDate?: string;
  newAnalysisAttachment?: string;
  oldAnalysis?: string;
  oldAnalysisDate?: string;
  oldAnalysisAttachment?: string;
  boneDensityTest?: boolean;
  boneDensityDetail?: string;
  hospitalizedLastYear?: boolean;
  hospitalizedDetail?: string;
  imagingProcedures?: { imageUrl: string; description: string }[];
  diagnosis?: string;
  hadSurgeries?: boolean;
  surgeriesDetail?: string;
}

export interface SurgeryDto {
  name: string;
  type?: string;
  date?: string;
  order?: number;
}

export interface GoalsDto {
  goals?: PhysioGoal[];
  customGoal?: string;
  decreasePain?: boolean;
  improveStrength?: boolean;
  lessDifficultyWork?: boolean;
  improveMovement?: boolean;
  standLonger?: string;
  sleepLonger?: string;
  sitLonger?: string;
  otherGoals?: string;
}

export interface PosturalAssessmentDto {
  seatedPosition?: string;
  trunkControl?: string;
  head?: {
    neutral?: boolean; hyperextended?: boolean; fwdFlexed?: boolean;
    laterallyFlexed?: { L?: boolean; R?: boolean }; rotated?: { L?: boolean; R?: boolean };
  };
  shoulders?: {
    level?: boolean;
    elevated?: { L?: boolean; R?: boolean };
    sublaxed?: { L?: boolean; R?: boolean };
  };
  elbow?: {
    hyperextended?: boolean; flexed?: boolean;
    supination?: { L?: boolean; R?: boolean };
    pronation?: { L?: boolean; R?: boolean };
  };
  ribCage?: {
    neutral?: boolean;
    elevated?: { L?: boolean; R?: boolean };
    rotatedFwd?: { L?: boolean; R?: boolean };
  };
  spine?: {
    neutral?: boolean; kyphosis?: boolean; flatLumbar?: boolean;
    normalLumbar?: boolean; hyperLordotic?: boolean;
    scoliosisApex?: { L?: boolean; R?: boolean };
  };
  pelvis?: {
    neutral?: boolean; rotatedFwd?: boolean; anteriorTilt?: boolean;
    posteriorTilt?: boolean; oblique?: { L?: boolean; R?: boolean }; other?: string;
  };
  hips?: {
    abducted?: { L?: boolean; R?: boolean }; adducted?: { L?: boolean; R?: boolean };
    flexed?: { L?: boolean; R?: boolean }; extended?: { L?: boolean; R?: boolean };
  };
  knees?: {
    flexedBeyond90?: { L?: boolean; R?: boolean };
    extendedBeyond90?: { L?: boolean; R?: boolean };
  };
  feet?: {
    pronateEvert?: { L?: boolean; R?: boolean }; supinateInv?: { L?: boolean; R?: boolean };
    dorsiflexed?: { L?: boolean; R?: boolean }; plantarflexed?: { L?: boolean; R?: boolean };
    other?: string;
  };
  spasticityNotes?: string;
  generalNotes?: string;
  diagnosis?: string;
}

export interface TreatmentPlanDto {
  treatmentFrom?: string;
  treatmentTo?: string;
  anticipatedVisits?: number;
  physiotherapistId?: string;
  physiotherapistIds?: string[];
  caseManagerId?: string;
  modalities?: TherapyModality[];
  otherModality?: string;
  remarks?: string;
  observation?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface SupervisorReviewDto {
  supervisorGaze?: string;
}

export interface DoctorReviewDto {
  doctorGaze?: string;
}

export interface PhysioSession {
  id: string;
  caseId: string;
  sessionNumber: number;
  sessionDate: string;
  sessionTime?: string;
  notes?: string;
  supervisorOpinion?: string | null;
  doctorDecision?: string | null;
  modalities?: TherapyModality[];
  createdAt: string;
}

export interface CreatePhysioSessionDto {
  sessionDate: string;
  sessionTime?: string;
  notes?: string;
  supervisorOpinion?: string;
  doctorDecision?: string;
  modalities?: TherapyModality[];
}

export interface UpdatePhysioSessionDto {
  sessionDate?: string;
  sessionTime?: string;
  notes?: string;
  supervisorOpinion?: string;
  doctorDecision?: string;
  modalities?: TherapyModality[];
}

/** A follow-up carries the same fields as a session, kept as its own list. */
export interface PhysioFollowUp {
  id: string;
  caseId: string;
  sessionDate: string;
  sessionTime?: string;
  notes?: string;
  supervisorOpinion?: string | null;
  doctorDecision?: string | null;
  createdAt: string;
}

export interface PhysioFollowUpDto {
  sessionDate: string;
  sessionTime?: string;
  notes?: string;
  supervisorOpinion?: string;
  doctorDecision?: string;
}

export interface FinalSummaryDto {
  finalSummary: string;
}

export interface EmergencyAlert {
  id: string;
  caseId?: string | null;
  sentByUserId: string;
  status: "PENDING" | "RESPONDED";
  note: string | null;
  senderNote?: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface PhysioCaseListParams {
  page?: number;
  limit?: number;
  status?: PhysioStatus;
  patientId?: string;
  caseType?: PhysioCaseType;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const clinicPhysioApi = {
  create: async (dto: CreatePhysioCaseDto): Promise<PhysioCase> => {
    const { data } = await apiClient.post("/physio/cases", dto);
    return data?.data ?? data;
  },

  list: async (params?: PhysioCaseListParams) => {
    const { data } = await apiClient.get("/physio/cases", { params });
    const d = data?.data ?? data;
    const total = d?.total ?? 0;
    const limit = d?.limit ?? params?.limit ?? 15;
    return {
      items: d?.items ?? d?.data ?? (Array.isArray(d) ? d : []) as PhysioCase[],
      total,
      totalPages: d?.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0),
    };
  },

  getById: async (id: string): Promise<PhysioCase> => {
    const { data } = await apiClient.get(`/physio/cases/${id}`);
    return data?.data ?? data;
  },

  update: async (id: string, dto: UpdatePhysioCaseDto): Promise<PhysioCase> => {
    const { data } = await apiClient.put(`/physio/cases/${id}`, dto);
    return data?.data ?? data;
  },

  updateStatus: async (id: string, status: PhysioStatus, cancellationReason?: string): Promise<PhysioCase> => {
    const body: Record<string, unknown> = { status };
    if (status === "CANCELLED" && cancellationReason) body.cancellationReason = cancellationReason;
    const { data } = await apiClient.put(`/physio/cases/${id}/status`, body);
    return data?.data ?? data;
  },

  /**
   * The only way to open a PT case: the backend rejects creating one directly,
   * so a doctor exam is converted once it is done.
   */
  convertToPhysio: async (
    id: string,
    /** Employee id of the therapist to assign; omitted, the case opens unassigned. */
    physiotherapistId?: string,
  ): Promise<{ convertedCaseId: string; caseNumber?: string }> => {
    const { data } = await apiClient.post(
      `/physio/cases/${id}/convert-to-physio`,
      physiotherapistId ? { physiotherapistId } : undefined,
    );
    const d = data?.data ?? data;
    return { convertedCaseId: d?.convertedCaseId ?? d?.id, caseNumber: d?.caseNumber };
  },

  // Without caseType the API answers with PT cases only; doctor exams are a
  // separate list behind ?caseType=DOCTOR_EXAM.
  getByPatient: async (patientId: string, caseType?: PhysioCaseType): Promise<PhysioCase[]> => {
    const { data } = await apiClient.get(`/physio/cases/by-patient/${patientId}`, {
      params: caseType ? { caseType } : undefined,
    });
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  submitComplaint: async (id: string, dto: Partial<UpdatePhysioCaseDto>): Promise<PhysioCase> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/complaint`, dto);
    return data?.data ?? data;
  },

  submitPainMap: async (id: string, dto: PainMapDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/pain-map`, dto);
    return data?.data ?? data;
  },

  submitMedicalHistory: async (id: string, dto: MedicalHistoryDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/medical-history`, dto);
    return data?.data ?? data;
  },

  addSurgery: async (id: string, dto: SurgeryDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/medical-history/surgeries`, dto);
    return data?.data ?? data;
  },

  submitGoals: async (id: string, dto: GoalsDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/goals`, dto);
    return data?.data ?? data;
  },

  submitPosturalAssessment: async (id: string, dto: PosturalAssessmentDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/postural-assessment`, dto);
    return data?.data ?? data;
  },

  submitTreatmentPlan: async (id: string, dto: TreatmentPlanDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/treatment-plan`, dto);
    return data?.data ?? data;
  },

  submitEvaluation: async (id: string, dto: EvaluationDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/evaluation`, dto);
    return data?.data ?? data;
  },

  supervisorReview: async (id: string, dto: SupervisorReviewDto): Promise<PhysioCase> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/treatment-plan/supervisor-review`, dto);
    return data?.data ?? data;
  },

  doctorReview: async (id: string, dto: DoctorReviewDto): Promise<PhysioCase> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/treatment-plan/doctor-review`, dto);
    return data?.data ?? data;
  },

  signTreatmentPlan: async (id: string, signatureBase64: string) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/treatment-plan/doctor-sign`, { signatureBase64 });
    return data?.data ?? data;
  },

  getSessions: async (id: string): Promise<PhysioSession[]> => {
    const { data } = await apiClient.get(`/physio/cases/${id}/sessions`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  addSession: async (id: string, dto: CreatePhysioSessionDto): Promise<PhysioSession> => {
    const { data } = await apiClient.post(`/physio/cases/${id}/sessions`, dto);
    return data?.data ?? data;
  },

  updateSession: async (id: string, sessionId: string, dto: UpdatePhysioSessionDto): Promise<PhysioSession> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/sessions/${sessionId}`, dto);
    return data?.data ?? data;
  },

  deleteSession: async (id: string, sessionId: string): Promise<void> => {
    await apiClient.delete(`/physio/cases/${id}/sessions/${sessionId}`);
  },

  getFollowUps: async (id: string): Promise<PhysioFollowUp[]> => {
    const { data } = await apiClient.get(`/physio/cases/${id}/follow-ups`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  addFollowUp: async (id: string, dto: PhysioFollowUpDto): Promise<PhysioFollowUp> => {
    const { data } = await apiClient.post(`/physio/cases/${id}/follow-ups`, dto);
    return data?.data ?? data;
  },

  updateFollowUp: async (id: string, followUpId: string, dto: Partial<PhysioFollowUpDto>): Promise<PhysioFollowUp> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/follow-ups/${followUpId}`, dto);
    return data?.data ?? data;
  },

  deleteFollowUp: async (id: string, followUpId: string): Promise<void> => {
    await apiClient.delete(`/physio/cases/${id}/follow-ups/${followUpId}`);
  },

  submitFinalSummary: async (id: string, dto: FinalSummaryDto): Promise<{ caseId: string; finalSummary: string }> => {
    const { data } = await apiClient.post(`/physio/cases/${id}/final-summary`, dto);
    return data?.data ?? data;
  },

  downloadFinalSummaryPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/physio/cases/${id}/final-summary/pdf`, { responseType: 'blob' });
    return response.data;
  },

  getTimeline: async (id: string): Promise<TimelineEvent[]> => {
    const { data } = await apiClient.get(`/physio/cases/${id}/timeline`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/physio/cases/${id}/pdf`, { responseType: "blob" });
    return response.data;
  },

  // ── Emergency alerts ──────────────────────────────────────────────────────
  sendEmergencyAlert: async (caseId: string, note?: string): Promise<EmergencyAlert> => {
    const { data } = await apiClient.post("/physio/emergency", { caseId, ...(note ? { note } : {}) });
    return data?.data ?? data;
  },

  respondToAlert: async (id: string, note: string): Promise<EmergencyAlert> => {
    const { data } = await apiClient.post(`/physio/emergency/${id}/respond`, { note });
    return data?.data ?? data;
  },

  getIncomingAlerts: async (): Promise<EmergencyAlert[]> => {
    const { data } = await apiClient.get("/physio/emergency/incoming");
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getMyAlerts: async (): Promise<EmergencyAlert[]> => {
    const { data } = await apiClient.get("/physio/emergency/my");
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getCaseAlerts: async (caseId: string): Promise<EmergencyAlert[]> => {
    const { data } = await apiClient.get(`/physio/emergency/case/${caseId}`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getAlertById: async (alertId: string): Promise<EmergencyAlert> => {
    const { data } = await apiClient.get(`/physio/emergency/${alertId}`);
    return data?.data ?? data;
  },
};
