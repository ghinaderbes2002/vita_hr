import { apiClient } from "./client";
import { toUploadableImage } from "@/lib/utils/heic";

// ── Enums, mirrored from the orthotics API ────────────────────────────────────
// قسم المقومات: one reception per patient, filled in over time by three roles —
// the orthopaedic doctor, the physiotherapist and the prosthetist.

export type OrthoticsDiagnosisType = "POLIO" | "CEREBRAL_PALSY" | "SPINA_BIFIDA" | "FOOT_DROP" | "OTHER";
export type OrthoticsCerebralPalsyType = "SPASTIC" | "HYPOTONIC" | "ATAXIC";
export type OrthoticsMuscleTone = "NORMAL" | "SPASTIC" | "HYPOTONIC";
export type OrthoticsSensation = "INTACT" | "REDUCED" | "ABSENT";
export type OrthoticsMuscleStrength = "EXCELLENT" | "MODERATE" | "WEAK";
export type OrthoticsSkinCondition = "INTACT" | "PRESSURE_POINTS" | "EDEMA";

export type OrthoticsMobilityLevel = "INDEPENDENT" | "WALKS_WITH_AIDS" | "WHEELCHAIR_USER";
export type OrthoticsAssistiveDevice = "CRUTCHES" | "WALKER" | "CANE" | "NONE";
export type OrthoticsGaitProblem = "TOE_DRAG" | "KNEE_INSTABILITY" | "PELVIS_TRUNK_TILT" | "SCISSORING_GAIT";
export type OrthoticsHipRom = "FREE" | "LIMITED" | "DISLOCATED_SUBLUXED";
export type OrthoticsKneeRom = "NORMAL" | "FLEXION_CONTRACTURE" | "VALGUS_VARUS" | "GENU_RECURVATUM";
export type OrthoticsAnkleRom = "FREE" | "EQUINUS" | "VARUS_VALGUS";
export type OrthoticsMuscleMovement =
  | "HIP_FLEXION" | "HIP_EXTENSION" | "HIP_ABDUCTION" | "HIP_ADDUCTION"
  | "KNEE_FLEXION" | "KNEE_EXTENSION"
  | "ANKLE_DORSIFLEXION" | "ANKLE_PLANTARFLEXION"
  | "ANKLE_EVERSION" | "ANKLE_INVERSION"
  | "GREAT_TOE_FLEXION";
export type OrthoticsDeformityFlexibility = "FLEXIBLE" | "RIGID";
export type OrthoticsDeformityStatus = "ACTIVE" | "DORMANT";
export type OrthoticsTrunkMovement =
  | "TRUNK_FLEXION" | "TRUNK_EXTENSION"
  | "RIGHT_LATERAL_TILT" | "LEFT_LATERAL_TILT"
  | "ROTATION_RIGHT" | "ROTATION_LEFT";
/** The one scale shared by all five trunk control / balance fields. */
export type OrthoticsTrunkScale = "GOOD" | "MODERATE" | "WEAK" | "ABSENT";
export type OrthoticsActivityLevel = "K0" | "K1" | "K2" | "K3" | "K4";
/** Where the orthosis will be worn day to day. */
export type OrthoticsDailyUseSetting = "HOME" | "SCHOOL" | "SPORTS" | "OTHER";
export type OrthoticsLimbType = "UPPER" | "LOWER";
export type OrthoticsSide = "RIGHT" | "LEFT";
export type OrthoticsRecommendedDevice ="AFO" | "KAFO" | "ORTHOSIS_WITH_FES" | "OTHER";

/** طبيب العظمية. Every field is optional — the API upserts what it is sent. */
export interface OrthoticsDoctorAssessment {
  diagnosisTypes?: OrthoticsDiagnosisType[];
  cerebralPalsyType?: OrthoticsCerebralPalsyType;
  footDropCause?: string;
  diagnosisOther?: string;
  /** Free text on the API; the form writes it as YYYY-MM-DD. */
  injuryStartDate?: string;
  surgicalHistory?: string;
  familyHistory?: string;
  birthHistory?: string;
  medicalHistory?: string;
  previousOrthosisUse?: boolean;
  previousOrthosisDetails?: string;
  /** Up to three goals, free text. */
  functionalGoals?: string[];
  dailyUseSettings?: OrthoticsDailyUseSetting[];
  dailyUseOther?: string;
  chiefComplaint?: string;
  muscleTone?: OrthoticsMuscleTone;
  /** Free text — the Ashworth scale reading. */
  spasticityLevel?: string;
  sensation?: OrthoticsSensation;
  thighMuscleStrength?: OrthoticsMuscleStrength;
  legFootMuscleStrength?: OrthoticsMuscleStrength;
  skinConditions?: OrthoticsSkinCondition[];
  pressurePointsLocation?: string;
  doctorOpinion?: string;
  /** How many orthoses the patient needs. */
  appliancesCount?: number | null;
  affectedLimbType?: OrthoticsLimbType;
  affectedSide?: OrthoticsSide;
  soundLimbDescription?: string;
}

/** أخصائي العلاج الفيزيائي. Every field is optional, upserted the same way. */
export interface OrthoticsPhysioAssessment {
  mobilityLevel?: OrthoticsMobilityLevel;
  assistiveDevices?: OrthoticsAssistiveDevice[];
  gaitProblems?: OrthoticsGaitProblem[];
  hipROM?: OrthoticsHipRom;
  kneeROM?: OrthoticsKneeRom;
  ankleROM?: OrthoticsAnkleRom;
  /** Ticked movements only — no numeric grade. */
  muscleStrengthMovements?: OrthoticsMuscleMovement[];
  deformityFlexibility?: OrthoticsDeformityFlexibility;
  deformityStatus?: OrthoticsDeformityStatus;
  trunkStrengthMovements?: OrthoticsTrunkMovement[];
  trunkControlSitting?: OrthoticsTrunkScale;
  trunkBalanceDynamicSitting?: OrthoticsTrunkScale;
  trunkControlStanding?: OrthoticsTrunkScale;
  trunkBalanceStaticStanding?: OrthoticsTrunkScale;
  trunkBalanceDynamicStanding?: OrthoticsTrunkScale;
  activityLevel?: OrthoticsActivityLevel;
  physioOpinion?: string;
  /** Hours a day; null clears it. Moved here from the prosthetist's opinion. */
  dailyWearHours?: number | null;
}

/** أخصائي الأطراف الصناعية — the opinion plus the device recommendation. All optional. */
export interface OrthoticsProsthetistAssessment {
  prosthetistOpinion?: string;
  recommendedDeviceTypes?: OrthoticsRecommendedDevice[];
  recommendedDeviceOther?: string;
  additionalNotes?: string;
  /**
   * How many of each device type are needed, set with − / + in the form. Sent
   * whole on save — it replaces what was there; a missing type means 0.
   */
  deviceUsageCounts?: Partial<Record<OrthoticsRecommendedDevice, number>> | null;
}

/**
 * The reception as the API returns it. The three assessments come back flat on
 * the reception — every field listed in the interfaces above — so they are
 * merged in rather than nested.
 */
export interface OrthoticsReception
  extends OrthoticsDoctorAssessment, OrthoticsPhysioAssessment,
    Omit<OrthoticsProsthetistAssessment, "prosthetistOpinion"> {
  id: string;
  patientId: string;
  /** Resolved by the API from the patients service on GET / POST. */
  patient?: { id?: string; firstName?: string; lastName?: string; patientNumber?: string } | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  /** Employee ids of the practitioners assigned to this reception. */
  practitionerIds?: string[] | null;
  prosthetistOpinion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrthoticsGuardianDto {
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
}

export interface CreateOrthoticsReceptionDto extends OrthoticsGuardianDto {
  patientId: string;
}

/**
 * One filled measurement sheet (public/orthotics/form_orthotics.svg). Every
 * save appends a new sheet; a saved one is never edited. `values` is keyed by
 * the drawing's field ids (circ_01…circ_07, len_01…len_13), each value the text
 * as typed.
 */
/** Which drawing a sheet was filled on — the same field id means a different spot on each. */
export type OrthoticsMeasurementSheet = "BELOW_KNEE" | "FULL_LEG" | "FOOT_ACCESSORIES";

export interface OrthoticsMeasurement {
  id: string;
  receptionId?: string;
  sheet: OrthoticsMeasurementSheet;
  side: OrthoticsSide;
  notes?: string | null;
  values: Record<string, string>;
  examinedAt: string;
  createdBy?: string | null;
}

export interface CreateOrthoticsMeasurementDto {
  sheet: OrthoticsMeasurementSheet;
  side: OrthoticsSide;
  notes?: string;
  values: Record<string, string>;
}

export interface OrthoticsAttachment {
  id: string;
  receptionId: string;
  /** A path on the server's disk — never a link. The file comes from `downloadAttachment`. */
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string | null;
}

/** Any image or a PDF, up to 15MB; anything else comes back as 400. */
export const ORTHOTICS_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
export const isOrthoticsAttachmentType = (mime: string) =>
  mime.startsWith("image/") || mime === "application/pdf";

const BASE = "/orthotics/receptions";

const unwrap = (data: { data?: unknown } | unknown) =>
  (data as { data?: unknown })?.data ?? data;
const asArray = <T>(d: unknown): T[] =>
  Array.isArray(d) ? (d as T[]) : ((d as { items?: T[] })?.items ?? []);

export const clinicOrthoticsApi = {
  getReceptions: async (patientId?: string): Promise<OrthoticsReception[]> => {
    const { data } = await apiClient.get(BASE, { params: patientId ? { patientId } : undefined });
    return asArray<OrthoticsReception>(unwrap(data));
  },

  /** Receptions the caller is assigned to; the token identifies them. */
  getMyPatients: async (): Promise<OrthoticsReception[]> => {
    const { data } = await apiClient.get(`${BASE}/my-patients`);
    return asArray<OrthoticsReception>(unwrap(data));
  },

  getReception: async (id: string): Promise<OrthoticsReception> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return unwrap(data) as OrthoticsReception;
  },

  createReception: async (dto: CreateOrthoticsReceptionDto): Promise<OrthoticsReception> => {
    const { data } = await apiClient.post(BASE, dto);
    return unwrap(data) as OrthoticsReception;
  },

  updateReception: async (id: string, dto: OrthoticsGuardianDto): Promise<OrthoticsReception> => {
    const { data } = await apiClient.patch(`${BASE}/${id}`, dto);
    return unwrap(data) as OrthoticsReception;
  },

  /**
   * Replaces the team wholesale, like podiatry — adding one practitioner means
   * sending the existing ids too. Each newly added one is notified by the API.
   */
  assignPractitioners: async (id: string, practitionerIds: string[]): Promise<OrthoticsReception> => {
    const { data } = await apiClient.patch(`${BASE}/${id}/practitioners`, { practitionerIds });
    return unwrap(data) as OrthoticsReception;
  },

  saveDoctorAssessment: async (id: string, dto: OrthoticsDoctorAssessment): Promise<OrthoticsReception> => {
    const { data } = await apiClient.patch(`${BASE}/${id}/doctor-assessment`, dto);
    return unwrap(data) as OrthoticsReception;
  },

  savePhysioAssessment: async (id: string, dto: OrthoticsPhysioAssessment): Promise<OrthoticsReception> => {
    const { data } = await apiClient.patch(`${BASE}/${id}/physio-assessment`, dto);
    return unwrap(data) as OrthoticsReception;
  },

  /** Same endpoint as the opinion alone, extended with the device recommendation. */
  saveProsthetistAssessment: async (id: string, dto: OrthoticsProsthetistAssessment): Promise<OrthoticsReception> => {
    const { data } = await apiClient.patch(`${BASE}/${id}/prosthetist-opinion`, dto);
    return unwrap(data) as OrthoticsReception;
  },

  deleteReception: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  /** Newest first. */
  listMeasurements: async (id: string): Promise<OrthoticsMeasurement[]> => {
    const { data } = await apiClient.get(`${BASE}/${id}/measurements`);
    return asArray<OrthoticsMeasurement>(unwrap(data));
  },

  /** Appends a new sheet. */
  addMeasurement: async (id: string, dto: CreateOrthoticsMeasurementDto): Promise<OrthoticsMeasurement> => {
    const { data } = await apiClient.post(`${BASE}/${id}/measurements`, dto);
    return unwrap(data) as OrthoticsMeasurement;
  },

  /** Newest first. */
  listAttachments: async (id: string): Promise<OrthoticsAttachment[]> => {
    const { data } = await apiClient.get(`${BASE}/${id}/attachments`);
    return asArray<OrthoticsAttachment>(unwrap(data));
  },

  uploadAttachment: async (id: string, file: File): Promise<OrthoticsAttachment> => {
    const form = new FormData();
    form.append("file", await toUploadableImage(file));
    const { data } = await apiClient.post(`${BASE}/${id}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(data) as OrthoticsAttachment;
  },

  /** The file itself. An <img src> cannot carry the token, so callers show it through an object URL. */
  downloadAttachment: async (id: string, attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(`${BASE}/${id}/attachments/${attachmentId}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  removeAttachment: async (id: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}/attachments/${attachmentId}`);
  },
};
