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
