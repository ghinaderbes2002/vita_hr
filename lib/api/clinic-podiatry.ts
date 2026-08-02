import { apiClient } from "./client";

// ── Enums, mirrored from the podiatry API ─────────────────────────────────────
export type AffectedSide = "R" | "L" | "BILATERAL";
export type FootSymptom = "PAIN" | "NUMBNESS" | "SWELLING" | "INSTABILITY" | "FATIGUE";
export type VisitType =
  | "FOOT_PAIN" | "FOOTBALANCE_ASSESSMENT" | "CUSTOM_INSOLES"
  | "PERFORMANCE_OPTIMIZATION" | "FOLLOW_UP";
export type MedicalHistoryItem =
  | "DIABETES" | "HYPERTENSION" | "NEUROLOGICAL" | "VASCULAR" | "ARTHRITIS" | "OTHER";
export type ClinicalPlanItem =
  | "CUSTOM_FOOTBALANCE_INSOLE" | "THERAPEUTIC_EXERCISES" | "FOOTWEAR_MODIFICATION"
  | "MEDICAL_REFERRAL" | "PHYSICAL_THERAPY";

export interface PodiatrySession {
  id: string;
  receptionId: string;
  clinicalPlan?: ClinicalPlanItem[] | null;
  rightFlatFoot?: boolean | null;
  rightHighArch?: boolean | null;
  rightPronation?: boolean | null;
  rightSupination?: boolean | null;
  rightPressureNotes?: string | null;
  rightAsymmetry?: string | null;
  leftFlatFoot?: boolean | null;
  leftHighArch?: boolean | null;
  leftPronation?: boolean | null;
  leftSupination?: boolean | null;
  leftPressureNotes?: string | null;
  leftAsymmetry?: string | null;
  clinicianName?: string | null;
  clinicianSignature?: string | null;
  createdAt?: string;
  /** Set once the session has been archived; archived ones are hidden by default. */
  archivedAt?: string | null;
  archivedBy?: string | null;
}

export interface PodiatryReception {
  id: string;
  patientId: string;
  patient?: { id: string; firstName?: string; lastName?: string; patientNumber?: string } | null;
  height?: number | null;
  weight?: number | null;
  occupation?: string | null;
  activities?: string | null;
  problemDescription?: string | null;
  historyOfSymptoms?: string | null;
  affectedSide?: AffectedSide[] | null;
  footSymptoms?: FootSymptom[] | null;
  visitTypes?: VisitType[] | null;
  medicalHistory?: MedicalHistoryItem[] | null;
  medicalHistoryOther?: string | null;
  vasScore?: number | null;
  // Physician-form complaint fields (backend contract — mirror the paper form)
  mainComplaint?: string | null;
  startDate?: string | null;
  possibleCause?: string | null;
  previousDoctor?: string | null;
  previousTreatment?: string | null;
  symptomsBetterTime?: string | null;
  symptomsWorseTime?: string | null;
  painType?: string | null;
  painLevel?: string | null;
  painTrend?: string | null;
  hadInjuryBefore?: boolean | null;
  sessions?: PodiatrySession[];
  createdAt?: string;
}

export interface PodiatryReceptionDto {
  patientId?: string;
  height?: number;
  weight?: number;
  occupation?: string;
  activities?: string;
  problemDescription?: string;
  historyOfSymptoms?: string;
  affectedSide?: AffectedSide[];
  footSymptoms?: FootSymptom[];
  visitTypes?: VisitType[];
  medicalHistory?: MedicalHistoryItem[];
  medicalHistoryOther?: string;
  vasScore?: number;
}

export type PodiatrySessionDto = Partial<Omit<PodiatrySession, "id" | "receptionId" | "createdAt">>;

// Dedicated "physician form" upserts on a reception (all fields optional).
// Field names/enums mirror the podiatry backend contract exactly.
export type PodiatryPainType = "INTERMITTENT" | "CONSTANT" | "WITH_CERTAIN_MOTIONS";
export type PodiatryPainLevel = "MILD" | "MODERATE" | "SEVERE" | "EXCRUCIATING";
export type PodiatryPainTrend = "BETTER" | "WORSE" | "SAME";

export interface PodiatryComplaintDto {
  mainComplaint?: string;          // ما هي شكواك الرئيسية والأعراض
  startDate?: string;              // تاريخ البدء
  possibleCause?: string;          // السبب المحتمل
  previousDoctor?: string;         // طبيب سابق بسبب الشكوى
  previousTreatment?: string;      // العلاج السابق للشكوى
  symptomsBetterTime?: string;     // وقت تحسّن الأعراض
  symptomsWorseTime?: string;      // وقت تفاقم الأعراض
  painType?: PodiatryPainType;     // نوع الألم
  painLevel?: PodiatryPainLevel;   // مستوى الألم الحالي
  painTrend?: PodiatryPainTrend;   // يتحسن / يزداد / كما هو
  hadInjuryBefore?: boolean;       // سبق التعرض للإصابة
}

// Podiatry medical-history contract. All fields optional; the API accepts any
// partial subset. Enum values mirror the backend exactly.
export type PodiatryRadiographyType = "MRI" | "X_RAY" | "CT" | "MYELOGRAM" | "OTHER";
export type PodiatryMedicalHistoryItem =
  | "LIVER_PROBLEMS" | "PNEUMONIA" | "URINARY_INFECTION" | "DIABETES"
  | "HEMOPHILIA" | "LUNG_ISSUES" | "STROKE" | "KIDNEY_PROBLEMS"
  | "ANEMIA" | "ASTHMA" | "CHEMICAL_DEPENDENCY" | "EPILEPSY"
  | "HIGH_LOW_BP" | "HEART_PROBLEMS" | "DEPRESSION" | "BONE_INFECTION"
  | "ARTERIOSCLEROSIS" | "TUBERCULOSIS" | "MUSCULOSKELETAL"
  | "JOINT_BONE_INFECTION" | "EYE_INFECTION" | "CIRCULATION_PROBLEMS"
  | "ARTHRITIS" | "CANCER" | "BLOOD_CLOTS" | "ANGINA"
  | "STD" | "MULTIPLE_SCLEROSIS" | "AIDS_HIV" | "OTHER";

export interface PodiatrySurgeryEntry {
  surgeryName?: string;
  type?: string;
  date?: string;
}

export interface PodiatryImagingProcedure {
  imageUrl?: string;      // uploaded document id
  description?: string;
}

export interface PodiatryMedicalHistoryDto {
  height?: number;
  weight?: number;
  currentMedications?: string;
  previousDiagnoses?: string;
  herbalPreparations?: boolean;
  herbalPreparationsDetails?: string;
  otherHealthProblems?: string;
  doctorRestrictions?: string;
  smoker?: boolean;
  everSmoked?: boolean;
  smokingFrequency?: string;
  hasPacemaker?: boolean;
  isPregnant?: boolean;
  allergyToAdhesives?: boolean;
  surgeries?: PodiatrySurgeryEntry[];
  hadPhysicalTherapy?: boolean;
  hasOtherTreatments?: boolean;
  radiographyTypes?: PodiatryRadiographyType[];
  radiographyOther?: string;
  radiographyResults?: string;
  hasNewAnalysis?: boolean;
  newAnalysisDate?: string;
  newAnalysisNotes?: string;   // free-text notes for the new analysis
  hasOldAnalysis?: boolean;
  oldAnalysisDate?: string;
  oldAnalysisNotes?: string;   // free-text notes for the old analysis
  boneDensityScan?: boolean;
  hospitalizedPastYear?: boolean;
  imagingProcedures?: PodiatryImagingProcedure[];  // image + description per row
  diagnosis?: string;          // free-text diagnosis (edited in the medical-history tab)
  medicalHistory?: PodiatryMedicalHistoryItem[];
  medicalHistoryOther?: string;
}

const unwrap = (data: { data?: unknown } | unknown) =>
  (data as { data?: unknown })?.data ?? data;
const asArray = <T>(d: unknown): T[] =>
  Array.isArray(d) ? (d as T[]) : ((d as { items?: T[] })?.items ?? []);

export const clinicPodiatryApi = {
  getReceptions: async (patientId?: string): Promise<PodiatryReception[]> => {
    const { data } = await apiClient.get("/podiatry/receptions", {
      params: patientId ? { patientId } : undefined,
    });
    return asArray<PodiatryReception>(unwrap(data));
  },

  getReception: async (id: string): Promise<PodiatryReception> => {
    const { data } = await apiClient.get(`/podiatry/receptions/${id}`);
    return unwrap(data) as PodiatryReception;
  },

  createReception: async (dto: PodiatryReceptionDto): Promise<PodiatryReception> => {
    const { data } = await apiClient.post("/podiatry/receptions", dto);
    return unwrap(data) as PodiatryReception;
  },

  updateReception: async (id: string, dto: PodiatryReceptionDto): Promise<PodiatryReception> => {
    const { data } = await apiClient.patch(`/podiatry/receptions/${id}`, dto);
    return unwrap(data) as PodiatryReception;
  },

  // Physician-form upserts. POST and PUT behave identically (upsert); we use PUT.
  submitComplaint: async (id: string, dto: PodiatryComplaintDto): Promise<PodiatryReception> => {
    const { data } = await apiClient.put(`/podiatry/receptions/${id}/complaint`, dto);
    return unwrap(data) as PodiatryReception;
  },
  submitMedicalHistory: async (id: string, dto: PodiatryMedicalHistoryDto): Promise<PodiatryReception> => {
    const { data } = await apiClient.put(`/podiatry/receptions/${id}/medical-history`, dto);
    return unwrap(data) as PodiatryReception;
  },

  getSessions: async (receptionId: string, includeArchived = false): Promise<PodiatrySession[]> => {
    const { data } = await apiClient.get(`/podiatry/receptions/${receptionId}/sessions`, {
      params: includeArchived ? { includeArchived: true } : undefined,
    });
    return asArray<PodiatrySession>(unwrap(data));
  },

  archiveSession: async (receptionId: string, sessionId: string): Promise<PodiatrySession> => {
    const { data } = await apiClient.post(`/podiatry/receptions/${receptionId}/sessions/${sessionId}/archive`);
    return unwrap(data) as PodiatrySession;
  },

  createSession: async (receptionId: string, dto: PodiatrySessionDto): Promise<PodiatrySession> => {
    const { data } = await apiClient.post(`/podiatry/receptions/${receptionId}/sessions`, dto);
    return unwrap(data) as PodiatrySession;
  },

  updateSession: async (
    receptionId: string,
    sessionId: string,
    dto: PodiatrySessionDto,
  ): Promise<PodiatrySession> => {
    const { data } = await apiClient.patch(`/podiatry/receptions/${receptionId}/sessions/${sessionId}`, dto);
    return unwrap(data) as PodiatrySession;
  },

  deleteSession: async (receptionId: string, sessionId: string): Promise<void> => {
    await apiClient.delete(`/podiatry/receptions/${receptionId}/sessions/${sessionId}`);
  },
};
