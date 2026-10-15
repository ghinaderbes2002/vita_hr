import { apiClient } from "./client";

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
}

/**
 * The reception as the API returns it. The three assessments come back flat on
 * the reception — every field listed in the two interfaces above, plus the
 * prosthetist's opinion — so they are merged in rather than nested.
 */
export interface OrthoticsReception extends OrthoticsDoctorAssessment, OrthoticsPhysioAssessment {
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

  saveProsthetistOpinion: async (id: string, prosthetistOpinion: string): Promise<OrthoticsReception> => {
    const { data } = await apiClient.patch(`${BASE}/${id}/prosthetist-opinion`, { prosthetistOpinion });
    return unwrap(data) as OrthoticsReception;
  },

  deleteReception: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
};
