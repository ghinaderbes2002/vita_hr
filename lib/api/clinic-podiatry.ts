import { apiClient } from "./client";

// ── Enums, mirrored from the podiatry API ─────────────────────────────────────
export type AffectedSide = "R" | "L" | "BILATERAL";
export type FootSymptom = "PAIN" | "NUMBNESS" | "SWELLING" | "INSTABILITY" | "FATIGUE";
export type VisitType =
  | "FOOT_PAIN" | "FOOTBALANCE_ASSESSMENT" | "CUSTOM_INSOLES"
  | "PERFORMANCE_OPTIMIZATION" | "FOLLOW_UP";
export type MedicalHistoryItem =
  | "DIABETES" | "HYPERTENSION" | "NEUROLOGICAL" | "VASCULAR" | "ARTHRITIS" | "OTHER";
// ── Session (نموذج تقييم القدم الاحترافي) ─────────────────────────────────────
// One session per reception: POST upserts — it creates the form the first time
// and updates it afterwards. Single-choice groups still travel as arrays, and
// every measurement / count is a free-text string, matching the API contract.
export type PodiatryMainCause =
  | "none" | "unknown" | "acute_injury" | "post_surgery" | "chronic_overuse";
export type PodiatryPainLocation = "forefoot" | "midfoot" | "rearfoot";
export type PodiatryPainCharacteristic =
  | "morning_startup" | "eases_with_activity" | "progressively_worse"
  | "night_pain" | "pain_at_rest";
export type PodiatryRearfootAlignment = "varus" | "valgus" | "neutral";
export type PodiatryTooManyToes = "negative" | "positive";
export type PodiatryArchArchitecture = "normal" | "low" | "high";
export type PodiatryDeformityType = "flexible" | "rigid";
export type PodiatryEdemaType = "pitting" | "non_pitting" | "unilateral" | "bilateral";
export type PodiatryRomState = "normal" | "limited";
export type PodiatryJackTest = "arch_forms" | "arch_flat";
export type PodiatryWalkingLine = "normal" | "inward" | "outward";
export type PodiatryFootwear =
  | "stability_running" | "minimalist" | "high_heel" | "medical" | "custom_orthotic";
export type PodiatryOutsoleWear = "normal" | "lateral_supination" | "medial_pronation";
export type PodiatryInsoleType =
  | "VF01" | "VF02" | "VF03" | "VF04" | "VF05" | "VF06"
  | "VF07" | "VF08" | "VF09" | "VF10" | "VF11";

export interface PodiatrySubjectiveHistory {
  mainCause?: PodiatryMainCause[];
  painLocation?: PodiatryPainLocation[];
  /** 1-10, kept as text because the API stores it as a string. */
  vasScore?: string;
  painCharacteristics?: PodiatryPainCharacteristic[];
}

export interface PodiatryVisualInspection {
  leftRearfootAlignment?: PodiatryRearfootAlignment[];
  rightRearfootAlignment?: PodiatryRearfootAlignment[];
  leftTooManyToes?: PodiatryTooManyToes[];
  leftTooManyToesCount?: string;
  rightTooManyToes?: PodiatryTooManyToes[];
  rightTooManyToesCount?: string;
  leftArchArchitecture?: PodiatryArchArchitecture[];
  rightArchArchitecture?: PodiatryArchArchitecture[];
  halluxValgus?: boolean;
  halluxValgusType?: PodiatryDeformityType[];
  tailorsBunion?: boolean;
  tailorsBunionType?: PodiatryDeformityType[];
  hammerToes?: boolean;
  hammerToesAffected?: string;
  clawToes?: boolean;
  clawToesAffected?: string;
  malletToes?: boolean;
  malletToesAffected?: string;
  hyperkeratosisCallus?: boolean;
  hyperkeratosisLocation?: string;
  preTrophicLesions?: boolean;
  preTrophicLesionsNotes?: string;
  edema?: boolean;
  edemaType?: PodiatryEdemaType[];
}

export interface PodiatryPalpation {
  plantar?: boolean;
  medial?: boolean;
  lateral?: boolean;
  posterior?: boolean;
  dorsal?: boolean;
}

export interface PodiatryRangeOfMotion {
  ankleDorsiflexion?: PodiatryRomState[];
  anklePlantarflexion?: PodiatryRomState[];
}

export interface PodiatryDynamicAnalysis {
  leftJackTest?: PodiatryJackTest[];
  rightJackTest?: PodiatryJackTest[];
  leftWalkingLine?: PodiatryWalkingLine[];
  rightWalkingLine?: PodiatryWalkingLine[];
}

export interface PodiatryShoeWearPattern {
  currentFootwear?: PodiatryFootwear[];
  outsoleWear?: PodiatryOutsoleWear[];
}

/** Every measurement is a free-text string (cm), one value per foot. */
export interface PodiatryFootMeasurements {
  footLengthLeft?: string;                    footLengthRight?: string;
  footWidthLeft?: string;                     footWidthRight?: string;
  archHeightLeft?: string;                    archHeightRight?: string;
  ballWidthLeft?: string;                     ballWidthRight?: string;
  ballCircumferenceLeft?: string;             ballCircumferenceRight?: string;
  heelWidthLeft?: string;                     heelWidthRight?: string;
  metatarsalBaseHeightLeft?: string;          metatarsalBaseHeightRight?: string;
  footAlignmentLeft?: string;                 footAlignmentRight?: string;
  navicularHeightLeft?: string;               navicularHeightRight?: string;
  navicularDropLeft?: string;                 navicularDropRight?: string;
  navicularHeightWithOrthoticLeft?: string;   navicularHeightWithOrthoticRight?: string;
  navicularDropWithOrthoticLeft?: string;     navicularDropWithOrthoticRight?: string;
}

export interface PodiatrySession {
  id: string;
  receptionId: string;
  subjectiveHistory?: PodiatrySubjectiveHistory | null;
  visualInspection?: PodiatryVisualInspection | null;
  palpation?: PodiatryPalpation | null;
  rangeOfMotion?: PodiatryRangeOfMotion | null;
  dynamicAnalysis?: PodiatryDynamicAnalysis | null;
  shoeWearPattern?: PodiatryShoeWearPattern | null;
  footMeasurements?: PodiatryFootMeasurements | null;
  insoleType?: PodiatryInsoleType[] | null;
  notes?: string | null;
  clinicianName?: string | null;
  clinicianSignature?: string | null;
  doctorDecision?: string | null;
  /** Who filled the form in — resolved by the API, null if the user is gone. */
  createdBy?: string | null;
  createdByName?: string | null;
  /** Stamped once the insole is fitted; null until then. */
  installedAt?: string | null;
  installedBy?: string | null;
  installedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Every field is optional — the API merges what it is sent. */
export interface PodiatrySessionDto {
  subjectiveHistory?: PodiatrySubjectiveHistory;
  visualInspection?: PodiatryVisualInspection;
  palpation?: PodiatryPalpation;
  rangeOfMotion?: PodiatryRangeOfMotion;
  dynamicAnalysis?: PodiatryDynamicAnalysis;
  shoeWearPattern?: PodiatryShoeWearPattern;
  footMeasurements?: PodiatryFootMeasurements;
  insoleType?: PodiatryInsoleType[];
  notes?: string;
  clinicianName?: string;
  clinicianSignature?: string;
  doctorDecision?: string;
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
  // Filled instead of the shared pair when both feet are affected: each foot
  // gets its own symptoms and visit types.
  footSymptomsRight?: FootSymptom[] | null;
  footSymptomsLeft?: FootSymptom[] | null;
  visitTypesRight?: VisitType[] | null;
  visitTypesLeft?: VisitType[] | null;
  medicalHistory?: MedicalHistoryItem[] | null;
  medicalHistoryOther?: string | null;
  vasScore?: number | null;
  /** Employee ids of the therapists assigned to this case. */
  practitionerIds?: string[] | null;
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
  footSymptomsRight?: FootSymptom[];
  footSymptomsLeft?: FootSymptom[];
  visitTypesRight?: VisitType[];
  visitTypesLeft?: VisitType[];
  medicalHistory?: MedicalHistoryItem[];
  medicalHistoryOther?: string;
  vasScore?: number;
}

// ── المراجعات و قرار الطبيب ───────────────────────────────────────────────────
// A reception carries many reviews (a plain list), and one doctor decision that
// upserts on POST — GET answers with null until that first save.
export interface PodiatryReview {
  id: string;
  receptionId?: string;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PodiatryDoctorDecision {
  id?: string;
  receptionId?: string;
  decision?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

  /**
   * Replaces the practitioner team wholesale — the API does not append, so
   * adding one therapist means sending the existing ids plus the new one.
   * Answers with the updated reception.
   */
  assignPractitioners: async (id: string, practitionerIds: string[]): Promise<PodiatryReception> => {
    const { data } = await apiClient.patch(`/podiatry/receptions/${id}/practitioners`, { practitionerIds });
    return unwrap(data) as PodiatryReception;
  },

  /** Receptions the caller is assigned to; the token identifies them, no id is sent. */
  getMyPatients: async (): Promise<PodiatryReception[]> => {
    const { data } = await apiClient.get("/podiatry/receptions/my-patients");
    return asArray<PodiatryReception>(unwrap(data));
  },

  // Returns at most one session — the reception's assessment form.
  getSessions: async (receptionId: string): Promise<PodiatrySession[]> => {
    const { data } = await apiClient.get(`/podiatry/receptions/${receptionId}/sessions`);
    return asArray<PodiatrySession>(unwrap(data));
  },

  // Upsert: creates the assessment on the first call, updates it afterwards.
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

  /** Stamps the fitting date and who recorded it; takes no body. */
  installSession: async (receptionId: string, sessionId: string): Promise<PodiatrySession> => {
    const { data } = await apiClient.post(`/podiatry/receptions/${receptionId}/sessions/${sessionId}/install`);
    return unwrap(data) as PodiatrySession;
  },

  deleteSession: async (receptionId: string, sessionId: string): Promise<void> => {
    await apiClient.delete(`/podiatry/receptions/${receptionId}/sessions/${sessionId}`);
  },

  listReviews: async (receptionId: string): Promise<PodiatryReview[]> => {
    const { data } = await apiClient.get(`/podiatry/receptions/${receptionId}/reviews`);
    return asArray<PodiatryReview>(unwrap(data));
  },

  createReview: async (receptionId: string, notes: string): Promise<PodiatryReview> => {
    const { data } = await apiClient.post(`/podiatry/receptions/${receptionId}/reviews`, { notes });
    return unwrap(data) as PodiatryReview;
  },

  updateReview: async (receptionId: string, reviewId: string, notes: string): Promise<PodiatryReview> => {
    const { data } = await apiClient.patch(`/podiatry/receptions/${receptionId}/reviews/${reviewId}`, { notes });
    return unwrap(data) as PodiatryReview;
  },

  deleteReview: async (receptionId: string, reviewId: string): Promise<void> => {
    await apiClient.delete(`/podiatry/receptions/${receptionId}/reviews/${reviewId}`);
  },

  getDoctorDecision: async (receptionId: string): Promise<PodiatryDoctorDecision | null> => {
    const { data } = await apiClient.get(`/podiatry/receptions/${receptionId}/doctor-decision`);
    return (unwrap(data) as PodiatryDoctorDecision | null) ?? null;
  },

  saveDoctorDecision: async (receptionId: string, decision: string): Promise<PodiatryDoctorDecision> => {
    const { data } = await apiClient.post(`/podiatry/receptions/${receptionId}/doctor-decision`, { decision });
    return unwrap(data) as PodiatryDoctorDecision;
  },

  /** Pings every doctor on call for this clinic; answers with how many got it. */
  notifyDoctorDecision: async (receptionId: string): Promise<{ notified: number }> => {
    const { data } = await apiClient.post(`/podiatry/receptions/${receptionId}/doctor-decision/notify`);
    const d = unwrap(data) as { notified?: number };
    return { notified: d?.notified ?? 0 };
  },
};
