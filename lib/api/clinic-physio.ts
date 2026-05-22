import { apiClient } from "./client";

export type PhysioStatus =
  | "COMPLAINT"
  | "PAIN_MAP"
  | "MEDICAL_HISTORY"
  | "GOALS"
  | "POSTURAL_ASSESSMENT"
  | "TREATMENT_PLAN"
  | "ACTIVE_SESSIONS"
  | "COMPLETED"
  | "CANCELLED";

export type PainLevel = "MILD" | "MODERATE" | "SEVERE" | "EXCRUCIATING";
export type PainDuration = "INTERMITTENT" | "CONSTANT" | "WITH_MOTION";

export interface PhysioCase {
  id: string;
  patientId: string;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string };
  status: PhysioStatus;
  supervisingDoctorId?: string | null;
  assignedTherapistId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhysioCaseDto {
  patientId: string;
  notes?: string;
}

export interface PainPoint {
  id?: string;
  side: "front" | "back";
  x: number;
  y: number;
  intensity: number;
  painType: string;
  notes?: string;
}

export interface PainMapDto {
  points: PainPoint[];
}

export interface MedicalHistoryDto {
  isSmoker?: boolean;
  hasAllergies?: boolean;
  allergyDetails?: string;
  isPregnant?: boolean;
  hasPacemaker?: boolean;
  currentMedications?: string;
  hasPrescription?: boolean;
  chronicDiseases?: string[];
  surgeries?: Array<{ description: string; date?: string; hospital?: string }>;
  imagingStudies?: Array<{ type: "MRI" | "XRAY" | "CT" | "MYELOGRAM"; date?: string; findings?: string }>;
  labTests?: Array<{ type: string; date?: string; isNew: boolean }>;
}

export interface GoalsDto {
  goals: string[];
  standTarget?: number;
  sleepTarget?: number;
  sitTarget?: number;
}

export interface PosturalAssessmentDto {
  head?: Record<string, boolean>;
  shoulders?: Record<string, boolean>;
  elbows?: Record<string, boolean>;
  thorax?: Record<string, boolean>;
  spine?: Record<string, boolean | string>;
  pelvis?: Record<string, boolean>;
  hips?: Record<string, boolean>;
  knees?: Record<string, boolean>;
  feet?: Record<string, boolean>;
  spasticityNotes?: string;
  diagnosis?: string;
}

export interface TreatmentPlanDto {
  modalities: string[];
  remarks?: string;
  supervisorNotes?: string;
  doctorNotes?: string;
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
  createdAt: string;
}

export interface CreatePhysioSessionDto {
  date: string;
  time?: string;
  modalitiesApplied: string[];
  notes?: string;
  painLevel?: number;
  romUpdates?: Record<string, number>;
}

export interface PhysioCaseListParams {
  page?: number;
  limit?: number;
  status?: PhysioStatus;
  patientId?: string;
}

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

  update: async (id: string, dto: Partial<CreatePhysioCaseDto>): Promise<PhysioCase> => {
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

  updatePainMap: async (id: string, dto: PainMapDto) => {
    const { data } = await apiClient.put(`/physio/cases/${id}/pain-map`, dto);
    return data?.data ?? data;
  },

  submitMedicalHistory: async (id: string, dto: MedicalHistoryDto) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/medical-history`, dto);
    return data?.data ?? data;
  },

  addSurgery: async (id: string, dto: { description: string; date?: string; hospital?: string }) => {
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

  updateTreatmentPlan: async (id: string, dto: TreatmentPlanDto) => {
    const { data } = await apiClient.put(`/physio/cases/${id}/treatment-plan`, dto);
    return data?.data ?? data;
  },

  signTreatmentPlan: async (id: string, signatureBase64: string) => {
    const { data } = await apiClient.post(`/physio/cases/${id}/treatment-plan/doctor-sign`, { signatureBase64 });
    return data?.data ?? data;
  },

  supervisorReview: async (id: string, notes: string) => {
    const { data } = await apiClient.put(`/physio/cases/${id}/treatment-plan/supervisor-review`, { notes });
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

  getTimeline: async (id: string) => {
    const { data } = await apiClient.get(`/physio/cases/${id}/timeline`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/physio/cases/${id}/pdf`, { responseType: "blob" });
    return response.data;
  },
};
