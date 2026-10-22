// Arabic labels for the orthotics enums, shared by the list, the reception page
// and the assessment forms. The clinic forms this mirrors are Arabic-only sheets.
import type {
  OrthoticsActivityLevel, OrthoticsAnkleRom, OrthoticsAssistiveDevice,
  OrthoticsCerebralPalsyType, OrthoticsDeformityFlexibility, OrthoticsDeformityStatus,
  OrthoticsDiagnosisType, OrthoticsDoctorAssessment, OrthoticsGaitProblem, OrthoticsHipRom,
  OrthoticsKneeRom, OrthoticsMobilityLevel, OrthoticsMuscleMovement, OrthoticsMuscleStrength,
  OrthoticsMuscleTone, OrthoticsPhysioAssessment, OrthoticsReception, OrthoticsSensation,
  OrthoticsSkinCondition, OrthoticsTrunkMovement, OrthoticsTrunkScale,
  OrthoticsDailyUseSetting, OrthoticsRecommendedDevice, OrthoticsProsthetistAssessment,
  OrthoticsLimbType, OrthoticsSide,
} from "@/lib/api/clinic-orthotics";

/**
 * An ordered option list: the order is the order the form shows them in. `label`
 * is a key under the `clinic.orthotics` messages, translated where it is shown.
 */
export type Options<T extends string> = { value: T; label: string }[];

export const DIAGNOSIS_TYPES: Options<OrthoticsDiagnosisType> = [
  { value: "POLIO", label: "options.DIAGNOSIS_TYPES.POLIO" },
  { value: "CEREBRAL_PALSY", label: "options.DIAGNOSIS_TYPES.CEREBRAL_PALSY" },
  { value: "SPINA_BIFIDA", label: "options.DIAGNOSIS_TYPES.SPINA_BIFIDA" },
  { value: "FOOT_DROP", label: "options.DIAGNOSIS_TYPES.FOOT_DROP" },
  { value: "OTHER", label: "options.DIAGNOSIS_TYPES.OTHER" },
];

export const CEREBRAL_PALSY_TYPES: Options<OrthoticsCerebralPalsyType> = [
  { value: "SPASTIC", label: "options.CEREBRAL_PALSY_TYPES.SPASTIC" },
  { value: "HYPOTONIC", label: "options.CEREBRAL_PALSY_TYPES.HYPOTONIC" },
  { value: "ATAXIC", label: "options.CEREBRAL_PALSY_TYPES.ATAXIC" },
];

export const MUSCLE_TONES: Options<OrthoticsMuscleTone> = [
  { value: "NORMAL", label: "options.MUSCLE_TONES.NORMAL" },
  { value: "SPASTIC", label: "options.MUSCLE_TONES.SPASTIC" },
  { value: "HYPOTONIC", label: "options.MUSCLE_TONES.HYPOTONIC" },
];

export const LIMB_TYPES: Options<OrthoticsLimbType> = [
  { value: "UPPER", label: "options.LIMB_TYPES.UPPER" },
  { value: "LOWER", label: "options.LIMB_TYPES.LOWER" },
];

export const SIDES: Options<OrthoticsSide> = [
  { value: "RIGHT", label: "options.SIDES.RIGHT" },
  { value: "LEFT", label: "options.SIDES.LEFT" },
];

export const SENSATIONS: Options<OrthoticsSensation> = [
  { value: "INTACT", label: "options.SENSATIONS.INTACT" },
  { value: "REDUCED", label: "options.SENSATIONS.REDUCED" },
  { value: "ABSENT", label: "options.SENSATIONS.ABSENT" },
];

export const MUSCLE_STRENGTHS: Options<OrthoticsMuscleStrength> = [
  { value: "EXCELLENT", label: "options.MUSCLE_STRENGTHS.EXCELLENT" },
  { value: "MODERATE", label: "options.MUSCLE_STRENGTHS.MODERATE" },
  { value: "WEAK", label: "options.MUSCLE_STRENGTHS.WEAK" },
];

export const SKIN_CONDITIONS: Options<OrthoticsSkinCondition> = [
  { value: "INTACT", label: "options.SKIN_CONDITIONS.INTACT" },
  { value: "PRESSURE_POINTS", label: "options.SKIN_CONDITIONS.PRESSURE_POINTS" },
  { value: "EDEMA", label: "options.SKIN_CONDITIONS.EDEMA" },
];

export const MOBILITY_LEVELS: Options<OrthoticsMobilityLevel> = [
  { value: "INDEPENDENT", label: "options.MOBILITY_LEVELS.INDEPENDENT" },
  { value: "WALKS_WITH_AIDS", label: "options.MOBILITY_LEVELS.WALKS_WITH_AIDS" },
  { value: "WHEELCHAIR_USER", label: "options.MOBILITY_LEVELS.WHEELCHAIR_USER" },
];

export const ASSISTIVE_DEVICES: Options<OrthoticsAssistiveDevice> = [
  { value: "CRUTCHES", label: "options.ASSISTIVE_DEVICES.CRUTCHES" },
  { value: "WALKER", label: "options.ASSISTIVE_DEVICES.WALKER" },
  { value: "CANE", label: "options.ASSISTIVE_DEVICES.CANE" },
  { value: "NONE", label: "options.ASSISTIVE_DEVICES.NONE" },
];

export const GAIT_PROBLEMS: Options<OrthoticsGaitProblem> = [
  { value: "TOE_DRAG", label: "options.GAIT_PROBLEMS.TOE_DRAG" },
  { value: "KNEE_INSTABILITY", label: "options.GAIT_PROBLEMS.KNEE_INSTABILITY" },
  { value: "PELVIS_TRUNK_TILT", label: "options.GAIT_PROBLEMS.PELVIS_TRUNK_TILT" },
  { value: "SCISSORING_GAIT", label: "options.GAIT_PROBLEMS.SCISSORING_GAIT" },
];

export const HIP_ROM: Options<OrthoticsHipRom> = [
  { value: "FREE", label: "options.HIP_ROM.FREE" },
  { value: "LIMITED", label: "options.HIP_ROM.LIMITED" },
  { value: "DISLOCATED_SUBLUXED", label: "options.HIP_ROM.DISLOCATED_SUBLUXED" },
];

export const KNEE_ROM: Options<OrthoticsKneeRom> = [
  { value: "NORMAL", label: "options.KNEE_ROM.NORMAL" },
  { value: "FLEXION_CONTRACTURE", label: "options.KNEE_ROM.FLEXION_CONTRACTURE" },
  { value: "VALGUS_VARUS", label: "options.KNEE_ROM.VALGUS_VARUS" },
  { value: "GENU_RECURVATUM", label: "options.KNEE_ROM.GENU_RECURVATUM" },
];

export const ANKLE_ROM: Options<OrthoticsAnkleRom> = [
  { value: "FREE", label: "options.ANKLE_ROM.FREE" },
  { value: "EQUINUS", label: "options.ANKLE_ROM.EQUINUS" },
  { value: "VARUS_VALGUS", label: "options.ANKLE_ROM.VARUS_VALGUS" },
];

export const MUSCLE_MOVEMENTS: Options<OrthoticsMuscleMovement> = [
  { value: "HIP_FLEXION", label: "options.MUSCLE_MOVEMENTS.HIP_FLEXION" },
  { value: "HIP_EXTENSION", label: "options.MUSCLE_MOVEMENTS.HIP_EXTENSION" },
  { value: "HIP_ABDUCTION", label: "options.MUSCLE_MOVEMENTS.HIP_ABDUCTION" },
  { value: "HIP_ADDUCTION", label: "options.MUSCLE_MOVEMENTS.HIP_ADDUCTION" },
  { value: "KNEE_FLEXION", label: "options.MUSCLE_MOVEMENTS.KNEE_FLEXION" },
  { value: "KNEE_EXTENSION", label: "options.MUSCLE_MOVEMENTS.KNEE_EXTENSION" },
  { value: "ANKLE_DORSIFLEXION", label: "options.MUSCLE_MOVEMENTS.ANKLE_DORSIFLEXION" },
  { value: "ANKLE_PLANTARFLEXION", label: "options.MUSCLE_MOVEMENTS.ANKLE_PLANTARFLEXION" },
  { value: "ANKLE_EVERSION", label: "options.MUSCLE_MOVEMENTS.ANKLE_EVERSION" },
  { value: "ANKLE_INVERSION", label: "options.MUSCLE_MOVEMENTS.ANKLE_INVERSION" },
  { value: "GREAT_TOE_FLEXION", label: "options.MUSCLE_MOVEMENTS.GREAT_TOE_FLEXION" },
];

export const DEFORMITY_FLEXIBILITY: Options<OrthoticsDeformityFlexibility> = [
  { value: "FLEXIBLE", label: "options.DEFORMITY_FLEXIBILITY.FLEXIBLE" },
  { value: "RIGID", label: "options.DEFORMITY_FLEXIBILITY.RIGID" },
];

export const DEFORMITY_STATUS: Options<OrthoticsDeformityStatus> = [
  { value: "ACTIVE", label: "options.DEFORMITY_STATUS.ACTIVE" },
  { value: "DORMANT", label: "options.DEFORMITY_STATUS.DORMANT" },
];

export const TRUNK_MOVEMENTS: Options<OrthoticsTrunkMovement> = [
  { value: "TRUNK_FLEXION", label: "options.TRUNK_MOVEMENTS.TRUNK_FLEXION" },
  { value: "TRUNK_EXTENSION", label: "options.TRUNK_MOVEMENTS.TRUNK_EXTENSION" },
  { value: "RIGHT_LATERAL_TILT", label: "options.TRUNK_MOVEMENTS.RIGHT_LATERAL_TILT" },
  { value: "LEFT_LATERAL_TILT", label: "options.TRUNK_MOVEMENTS.LEFT_LATERAL_TILT" },
  { value: "ROTATION_RIGHT", label: "options.TRUNK_MOVEMENTS.ROTATION_RIGHT" },
  { value: "ROTATION_LEFT", label: "options.TRUNK_MOVEMENTS.ROTATION_LEFT" },
];

export const TRUNK_SCALE: Options<OrthoticsTrunkScale> = [
  { value: "GOOD", label: "options.TRUNK_SCALE.GOOD" },
  { value: "MODERATE", label: "options.TRUNK_SCALE.MODERATE" },
  { value: "WEAK", label: "options.TRUNK_SCALE.WEAK" },
  { value: "ABSENT", label: "options.TRUNK_SCALE.ABSENT" },
];

/** The five trunk fields, each graded on TRUNK_SCALE on its own. */
export const TRUNK_SCALE_FIELDS = [
  { key: "trunkControlSitting", label: "physio.trunkFields.trunkControlSitting" },
  { key: "trunkBalanceDynamicSitting", label: "physio.trunkFields.trunkBalanceDynamicSitting" },
  { key: "trunkControlStanding", label: "physio.trunkFields.trunkControlStanding" },
  { key: "trunkBalanceStaticStanding", label: "physio.trunkFields.trunkBalanceStaticStanding" },
  { key: "trunkBalanceDynamicStanding", label: "physio.trunkFields.trunkBalanceDynamicStanding" },
] as const satisfies readonly { key: keyof OrthoticsPhysioAssessment; label: string }[];

export const ACTIVITY_LEVELS: Options<OrthoticsActivityLevel> = [
  { value: "K0", label: "options.ACTIVITY_LEVELS.K0" },
  { value: "K1", label: "options.ACTIVITY_LEVELS.K1" },
  { value: "K2", label: "options.ACTIVITY_LEVELS.K2" },
  { value: "K3", label: "options.ACTIVITY_LEVELS.K3" },
  { value: "K4", label: "options.ACTIVITY_LEVELS.K4" },
];

export const DAILY_USE_SETTINGS: Options<OrthoticsDailyUseSetting> = [
  { value: "HOME", label: "options.DAILY_USE_SETTINGS.HOME" },
  { value: "SCHOOL", label: "options.DAILY_USE_SETTINGS.SCHOOL" },
  { value: "SPORTS", label: "options.DAILY_USE_SETTINGS.SPORTS" },
  { value: "OTHER", label: "options.DAILY_USE_SETTINGS.OTHER" },
];

export const RECOMMENDED_DEVICES: Options<OrthoticsRecommendedDevice> = [
  { value: "KAFO", label: "options.RECOMMENDED_DEVICES.KAFO" },
  { value: "AFO", label: "options.RECOMMENDED_DEVICES.AFO" },
  { value: "ORTHOSIS_WITH_FES", label: "options.RECOMMENDED_DEVICES.ORTHOSIS_WITH_FES" },
  { value: "OTHER", label: "options.RECOMMENDED_DEVICES.OTHER" },
];

export const labelOf = <T extends string>(options: Options<T>, value?: T | null) =>
  options.find((o) => o.value === value)?.label ?? value ?? "";

// ── Reading the sections off a reception ─────────────────────────────────────
// The spec says the reception comes back "with every field". Whether the three
// sections sit flat on it or nested under their own key isn't pinned down, so
// both shapes are read — a nested section wins over a flat field.

type Nested = {
  doctorAssessment?: OrthoticsDoctorAssessment | null;
  physioAssessment?: OrthoticsPhysioAssessment | null;
  prosthetistOpinion?: string | { prosthetistOpinion?: string | null } | null;
};

export function doctorAssessmentOf(r: OrthoticsReception): OrthoticsDoctorAssessment {
  return { ...r, ...((r as unknown as Nested).doctorAssessment ?? {}) } as OrthoticsDoctorAssessment;
}

export function physioAssessmentOf(r: OrthoticsReception): OrthoticsPhysioAssessment {
  return { ...r, ...((r as unknown as Nested).physioAssessment ?? {}) } as OrthoticsPhysioAssessment;
}

export function prosthetistOpinionOf(r: OrthoticsReception): string {
  const v = (r as unknown as Nested).prosthetistOpinion;
  return (typeof v === "string" ? v : v?.prosthetistOpinion) ?? "";
}

/** The prosthetist's section: the opinion plus the device recommendation. */
export function prosthetistAssessmentOf(r: OrthoticsReception): OrthoticsProsthetistAssessment {
  return {
    prosthetistOpinion: prosthetistOpinionOf(r),
    recommendedDeviceTypes: r.recommendedDeviceTypes ?? undefined,
    recommendedDeviceOther: r.recommendedDeviceOther ?? undefined,
    additionalNotes: r.additionalNotes ?? undefined,
  };
}

/** Which of the three sections hold anything yet — drives the progress badges. */
export function sectionsFilled(r: OrthoticsReception) {
  const d = doctorAssessmentOf(r);
  const p = physioAssessmentOf(r);
  return {
    doctor: !!(d.diagnosisTypes?.length || d.chiefComplaint || d.muscleTone || d.doctorOpinion),
    physio: !!(p.mobilityLevel || p.gaitProblems?.length || p.activityLevel || p.physioOpinion),
    prosthetist: !!prosthetistOpinionOf(r).trim(),
    clinicalHistory: !!(d.birthHistory || d.medicalHistory || d.functionalGoals?.length
      || r.recommendedDeviceTypes?.length),
  };
}
