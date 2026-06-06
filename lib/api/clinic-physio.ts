import { apiClient } from "./client";
import { TimelineEvent } from "./clinic-prosthetics";

// ─── Status ───────────────────────────────────────────────────────────────────
export type PhysioStatus =
  | "INTAKE" | "COMPLAINT" | "PAIN_MAP" | "MEDICAL_HISTORY" | "GOALS"
  | "POSTURAL_ASSESSMENT" | "TREATMENT_PLAN" | "SUPERVISOR_REVIEW"
  | "DOCTOR_SIGN" | "ACTIVE_TREATMENT" | "COMPLETED" | "DISCHARGED" | "CANCELLED";

// ─── Enums ────────────────────────────────────────────────────────────────────
export type PainLevel    = "MILD" | "MODERATE" | "SEVERE" | "EXCRUCIATING";
export type PainDuration = "INTERMITTENT" | "CONSTANT" | "WITH_CERTAIN_MOTIONS";
export type LifeType     = "PROFESSIONAL" | "NORMAL" | "SEDENTARY" | "ABNORMAL";

export type PhysioGoal =
  | "BACK_TO_SPORTS" | "BACK_TO_WORK" | "SIMPLE_WORKS" | "PAIN_RELIEF" | "OTHER";

export type ChronicCondition =
  | "DIABETES" | "HYPERTENSION" | "HEART_DISEASE" | "ASTHMA" | "COPD"
  | "OBESITY" | "OSTEOPOROSIS" | "OSTEOARTHRITIS" | "RHEUMATOID_ARTHRITIS"
  | "FIBROMYALGIA" | "MULTIPLE_SCLEROSIS" | "PARKINSON" | "STROKE"
  | "SCOLIOSIS" | "HERNIATED_DISC" | "SPINAL_STENOSIS" | "FRACTURE"
  | "SPORTS_INJURY" | "POST_SURGICAL" | "CANCER" | "KIDNEY_DISEASE"
  | "THYROID" | "EPILEPSY" | "DEPRESSION" | "ANXIETY"
  | "CEREBRAL_PALSY" | "DOWN_SYNDROME" | "AUTISM" | "PERIPHERAL_NEUROPATHY" | "OTHER";

export type TestType =
  | "MRI" | "XRAY" | "CT" | "MYELOGRAM" | "BONE_DENSITY" | "OTHER";

export type TherapyModality =
  | "HOT_PACKS" | "COLD_PACKS" | "US" | "TENS" | "IFT" | "LASER"
  | "PARAFFIN" | "TRACTION" | "MANUAL_THERAPY" | "EXERCISE_THERAPY"
  | "ELECTRICAL_STIMULATION" | "HYDROTHERAPY" | "DRY_NEEDLING"
  | "KINESIO_TAPING" | "BREATHING_EXERCISES" | "BALANCE_TRAINING"
  | "GAIT_TRAINING" | "MASSAGE" | "ULTRASOUND_GUIDED" | "OTHER";

// ─── Display labels ────────────────────────────────────────────────────────────
export const THERAPY_MODALITY_LABELS: Record<TherapyModality, string> = {
  HOT_PACKS:             "حزم ساخنة",
  COLD_PACKS:            "حزم باردة",
  US:                    "موجات فوق صوتية",
  TENS:                  "TENS",
  IFT:                   "IFT",
  LASER:                 "ليزر",
  PARAFFIN:              "حمام البارافين",
  TRACTION:              "شد (تراكشن)",
  MANUAL_THERAPY:        "علاج يدوي",
  EXERCISE_THERAPY:      "تمارين علاجية",
  ELECTRICAL_STIMULATION:"تحفيز كهربائي",
  HYDROTHERAPY:          "علاج مائي",
  DRY_NEEDLING:          "وخز إبر جافة",
  KINESIO_TAPING:        "تيب كينيزيو",
  BREATHING_EXERCISES:   "تمارين تنفس",
  BALANCE_TRAINING:      "تدريب توازن",
  GAIT_TRAINING:         "تدريب مشي",
  MASSAGE:               "مساج",
  ULTRASOUND_GUIDED:     "تحت إرشاد الأولتراساوند",
  OTHER:                 "أخرى",
};

export const CHRONIC_CONDITION_LABELS: Record<ChronicCondition, string> = {
  DIABETES:               "السكري",
  HYPERTENSION:           "ضغط الدم",
  HEART_DISEASE:          "أمراض القلب",
  ASTHMA:                 "الربو",
  COPD:                   "الانسداد الرئوي المزمن",
  OBESITY:                "السمنة",
  OSTEOPOROSIS:           "هشاشة العظام",
  OSTEOARTHRITIS:         "التهاب المفاصل التنكسي",
  RHEUMATOID_ARTHRITIS:   "التهاب المفاصل الروماتويدي",
  FIBROMYALGIA:           "الفيبروميالجيا",
  MULTIPLE_SCLEROSIS:     "التصلب المتعدد",
  PARKINSON:              "باركنسون",
  STROKE:                 "السكتة الدماغية",
  SCOLIOSIS:              "الجنف",
  HERNIATED_DISC:         "انزلاق غضروفي",
  SPINAL_STENOSIS:        "تضيق العمود الفقري",
  FRACTURE:               "كسر",
  SPORTS_INJURY:          "إصابة رياضية",
  POST_SURGICAL:          "ما بعد الجراحة",
  CANCER:                 "السرطان",
  KIDNEY_DISEASE:         "أمراض الكلى",
  THYROID:                "أمراض الغدة الدرقية",
  EPILEPSY:               "الصرع",
  DEPRESSION:             "الاكتئاب",
  ANXIETY:                "القلق",
  CEREBRAL_PALSY:         "الشلل الدماغي",
  DOWN_SYNDROME:          "متلازمة داون",
  AUTISM:                 "التوحد",
  PERIPHERAL_NEUROPATHY:  "الاعتلال العصبي المحيطي",
  OTHER:                  "أخرى",
};

export const PHYSIO_GOAL_LABELS: Record<PhysioGoal, string> = {
  BACK_TO_SPORTS: "العودة للرياضة",
  BACK_TO_WORK:   "العودة للعمل",
  SIMPLE_WORKS:   "القيام بالأعمال البسيطة",
  PAIN_RELIEF:    "تخفيف الألم",
  OTHER:          "أخرى",
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
  hadPreviousInjury?: boolean | null;
  bestTimeOfDay?: string | null;
  worstTimeOfDay?: string | null;
  painTypes?: string[] | null;
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
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhysioCaseDto {
  patientId: string;
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
  hadPreviousInjury?: boolean;
  bestTimeOfDay?: string;
  worstTimeOfDay?: string;
  painTypes?: string[];
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

export interface PainMapDto {
  regions: PainRegion[];
}

export interface MedicalHistoryDto {
  smokes?: boolean;
  hasSmokedBefore?: boolean;
  smokingFrequency?: string;
  hasPacemaker?: boolean;
  allergies?: string;
  adhesiveAllergy?: boolean;
  currentMedications?: string;
  prescriptionDrugs?: boolean;
  herbalSupplements?: boolean;
  supplementsList?: string;
  isPregnant?: boolean;
  previousDiagnoses?: string;
  chronicConditions?: ChronicCondition[];
  otherConditions?: string;
  doctorRestrictions?: string;
  testsHad?: TestType[];
  testsOther?: string;
  testResults?: string;
  newAnalysis?: string;
  newAnalysisDate?: string;
  oldAnalysis?: string;
  oldAnalysisDate?: string;
  hospitalizedLastYear?: boolean;
  receivingOtherTreatment?: boolean;
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
  standLongerMinutes?: number;
  sleepLongerMinutes?: number;
  sitLongerMinutes?: number;
  otherGoals?: string;
}

export interface PosturalAssessmentDto {
  head?: { position?: string };
  shoulders?: { right?: string; left?: string };
  elbows?: { right?: string; left?: string };
  thorax?: { position?: string };
  spine?: {
    lumbar?: string;
    scoliosis?: boolean;
    scoliosisApex?: string;
    scoliosisDirection?: string;
  };
  pelvis?: { tilt?: string; lateralTilt?: string };
  hips?: { right?: string; left?: string };
  knees?: { right?: string; left?: string };
  feet?: { right?: string; left?: string };
  spasticityNotes?: string;
  generalNotes?: string;
  diagnosis?: string;
  seatedPosition?: string;
  trunkControl?: string;
}

export interface TreatmentPlanDto {
  modalities: TherapyModality[];
  remarks?: string;
  observation?: string;
}

export interface SupervisorReviewDto {
  supervisorGaze?: string;
}

export interface PhysioSession {
  id: string;
  caseId: string;
  date: string;
  time?: string;
  modalitiesApplied: string[];
  notes?: string;
  painLevel?: number | null;
  romUpdates?: Record<string, number>;
  appointmentId?: string | null;
  createdAt: string;
}

export interface CreatePhysioSessionDto {
  date: string;
  time?: string;
  modalitiesApplied: string[];
  notes?: string;
  painLevel?: number;
  romUpdates?: Record<string, number>;
  appointmentId?: string;
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

  supervisorReview: async (id: string, dto: SupervisorReviewDto): Promise<PhysioCase> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/treatment-plan/supervisor-review`, dto);
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

  updateSession: async (id: string, sessionId: string, dto: Partial<CreatePhysioSessionDto>): Promise<PhysioSession> => {
    const { data } = await apiClient.put(`/physio/cases/${id}/sessions/${sessionId}`, dto);
    return data?.data ?? data;
  },

  deleteSession: async (id: string, sessionId: string): Promise<void> => {
    await apiClient.delete(`/physio/cases/${id}/sessions/${sessionId}`);
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
