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

// ─── Display labels ────────────────────────────────────────────────────────────
export const THERAPY_MODALITY_LABELS: Record<TherapyModality, string> = {
  MANUAL_THERAPY: "العلاج اليدوي / MANUAL THERAPY",
  MASSAGE:        "التدليك العلاجي / MASSAGE",
  KINESIO_TAPING: "الشريط اللاصق العلاجي / KINESIO TAPING",
  COMPRESSION:    "العالج بالضغط / COMPRESSION",
  PARAFFIN:       "علاج البارافين / PARAFIN",
  GRASTON:        "غراستون / GRASTON",
  MET:            "تقنية طاقة العضلات / MET",
  HOT_PACKS:      "كمادات ساخنة / Hot PACKS",
  COLD_PACKS:     "كمادات باردة / COLD PACKS",
  TRACTION:       "الشد العلاجي / TRACTION",
  EXERCISES:      "تمارين علاجية / EXERCISES",
  ESWT:           "العلاج بالموجات التصادمية / ESWT",
  US:             "الموجات فوق الصوتية / US",
  TENS:           "التحفيز الكهربائي للأعصاب عبر الجلد / TENS",
  EMS:            "التحفيز الكهربائي للعضلات / EMS",
  LASER:          "العالج بالليزر / LASER",
  CPM:            "الحركة السلبية المستمرة / CPM",
  PNF:            "التسهيل العصبي العضلي الحسي / PNF",
  INFRARED:       "الأشعة تحت الحمراء / INFRARED",
  SIS:            "التحفيز الكهرومغناطيسي / SIS",
  OTHER:          "أخرى / Other",
};

export const CHRONIC_CONDITION_LABELS: Record<ChronicCondition, string> = {
  LIVER_PROBLEMS:         "مشاكل الكبد / Liver Problems",
  PNEUMONIA:              "التهاب رئوي / Pneumonia",
  URINARY_INFECTION:      "التهاب المسالك البولية / Urinary Infection",
  DIABETES:               "السكري / Diabetes",
  HEMOPHILIA:             "الناعور / Hemophilia",
  LUNG_ISSUES:            "مشاكل الرئة / Lung Issues",
  STROKE:                 "جلطة / Stroke",
  KIDNEY_PROBLEMS:        "مشاكل الكلى / Kidney Problems",
  ANEMIA:                 "فقر الدم / Anemia",
  ASTHMA:                 "الربو / Asthma",
  CHEMICAL_DEPENDENCY:    "الإدمان الكيميائي / Chemical Dependency",
  EPILEPSY:               "الصرع / Epilepsy",
  HYPERTENSION:           "ارتفاع /انخفاض ضغط الدم/ High/Low Blood Pressure",
  AIDS_HIV:               "الإيدز / AIDS/HIV",
  ARTHRITIS:              "التهاب المفاصل / Arthritis",
  CANCER:                 "السرطان / Cancer",
  MULTIPLE_SCLEROSIS:     "التصلب المتعدد / Multiple Sclerosis",
  STDS:                   "الأمراض المنقولة جنسياً / STD",
  ANGINA:                 "ذبحة / Angina",
  BLOOD_CLOTS:            "جلطات دم / Blood Clots",
  CIRCULATION_PROBLEMS:   "مشاكل الدورة الدموية / Circulation Problems",
  EYE_INFECTION:          "التهاب العين / Eye Infection",
  JOINT_BONE_INFECTION:   "عدوى المفاصل / العظام / Joint/Bone Infection",
  MUSCULOSKELETAL:        "مشاكل الجهاز العضلي الهيكلي/Musculoskeletal Problems",
  TUBERCULOSIS:           "مرض السل / Tuberculosis",
  ARTERIOSCLEROSIS:       "تصلب الشرايين / Arteriosclerosis",
  BONE_INFECTION:         "التهاب نقي العظم / Bone Infection",
  DEPRESSION:             "اكتئاب / Depression",
  HEART_PROBLEMS:         "مشاكل القلب / Heart Problems",
  OTHER:                  "آخر / Other",
};

export const EVALUATION_MODALITY_LABELS: Record<EvaluationModality, string> = {
  MANUAL_THERAPY: "العلاج اليدوي / MANUAL THERAPY",
  MASSAGE:        "التدليك العلاجي / MASSAGE",
  KINESIO_TAPING: "الشريط اللاصق العلاجي / KINESIO TAPING",
  COMPRESSION:    "العالج بالضغط / COMPRESSION",
  PARAFFIN:       "علاج البارافين / PARAFIN",
  GRASTON:        "غراستون / GRASTON",
  MET:            "تقنية طاقة العضلات / MET",
  HOT_PACKS:      "كمادات ساخنة / Hot PACKS",
  COLD_PACKS:     "كمادات باردة / COLD PACKS",
  TRACTION:       "الشد العلاجي / TRACTION",
  EXERCISES:      "تمارين علاجية / EXERCISES",
  ESWT:           "العلاج بالموجات التصادمية / ESWT",
  US:             "الموجات فوق الصوتية / US",
  TENS:           "التحفيز الكهربائي للأعصاب عبر الجلد / TENS",
  EMS:            "التحفيز الكهربائي للعضلات / EMS",
  LASER:          "العالج بالليزر / LASER",
  CPM:            "الحركة السلبية المستمرة / CPM",
  PNF:            "التسهيل العصبي العضلي الحسي / PNF",
  INFRARED:       "الأشعة تحت الحمراء / INFRARED",
  SIS:            "التحفيز الكهرومغناطيسي / SIS",
  OTHER:          "أخرى / Other",
};

export const PHYSIO_GOAL_LABELS: Record<PhysioGoal, string> = {
  BACK_TO_SPORTS: "العودة للرياضة / Back to sports",
  BACK_TO_WORK:   "العودة للعمل / Back to work",
  SIMPLE_WORKS:   "القيام بالأعمال البسيطة / Doing simple works",
  PAIN_RELIEF:    " تسكين الألم فقط/ Pain relief only",
  OTHER:          "أي شيء أخرى / Anything else",
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface PhysioCase {
  id: string;
  caseNumber?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhysioCaseDto {
  patientId: string;
  majorComplaint?: string;
  symptoms?: string;
  notes?: string;
}

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

export interface FinalSummaryDto {
  finalSummary: string;
}

export interface PhysioCaseListParams {
  page?: number;
  limit?: number;
  status?: PhysioStatus;
  patientId?: string;
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
    return {
      items: d?.items ?? d?.data ?? (Array.isArray(d) ? d : []) as PhysioCase[],
      total: d?.total ?? 0,
      totalPages: d?.totalPages ?? 0,
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

  updateStatus: async (id: string, status: PhysioStatus): Promise<PhysioCase> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/status`, { status });
    return data?.data ?? data;
  },

  getByPatient: async (patientId: string): Promise<PhysioCase[]> => {
    const { data } = await apiClient.get(`/physio/cases/by-patient/${patientId}`);
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
};
