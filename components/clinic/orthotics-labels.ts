// Arabic labels for the orthotics enums, shared by the list, the reception page
// and the assessment forms. The clinic forms this mirrors are Arabic-only sheets.
import type {
  OrthoticsActivityLevel, OrthoticsAnkleRom, OrthoticsAssistiveDevice,
  OrthoticsCerebralPalsyType, OrthoticsDeformityFlexibility, OrthoticsDeformityStatus,
  OrthoticsDiagnosisType, OrthoticsDoctorAssessment, OrthoticsGaitProblem, OrthoticsHipRom,
  OrthoticsKneeRom, OrthoticsMobilityLevel, OrthoticsMuscleMovement, OrthoticsMuscleStrength,
  OrthoticsMuscleTone, OrthoticsPhysioAssessment, OrthoticsReception, OrthoticsSensation,
  OrthoticsSkinCondition, OrthoticsTrunkMovement, OrthoticsTrunkScale,
} from "@/lib/api/clinic-orthotics";

/** An ordered option list: the order is the order the form shows them in. */
export type Options<T extends string> = { value: T; label: string }[];

export const DIAGNOSIS_TYPES: Options<OrthoticsDiagnosisType> = [
  { value: "POLIO", label: "شلل الأطفال" },
  { value: "CEREBRAL_PALSY", label: "الشلل الدماغي" },
  { value: "SPINA_BIFIDA", label: "السنسنة المشقوقة" },
  { value: "FOOT_DROP", label: "هبوط القدم" },
  { value: "OTHER", label: "أخرى" },
];

export const CEREBRAL_PALSY_TYPES: Options<OrthoticsCerebralPalsyType> = [
  { value: "SPASTIC", label: "تشنّجي" },
  { value: "HYPOTONIC", label: "رخو" },
  { value: "ATAXIC", label: "رنحي" },
];

export const MUSCLE_TONES: Options<OrthoticsMuscleTone> = [
  { value: "NORMAL", label: "طبيعية" },
  { value: "SPASTIC", label: "تشنّجية" },
  { value: "HYPOTONIC", label: "رخوة" },
];

export const SENSATIONS: Options<OrthoticsSensation> = [
  { value: "INTACT", label: "سليم" },
  { value: "REDUCED", label: "ناقص" },
  { value: "ABSENT", label: "معدوم" },
];

export const MUSCLE_STRENGTHS: Options<OrthoticsMuscleStrength> = [
  { value: "EXCELLENT", label: "ممتازة" },
  { value: "MODERATE", label: "متوسطة" },
  { value: "WEAK", label: "ضعيفة" },
];

export const SKIN_CONDITIONS: Options<OrthoticsSkinCondition> = [
  { value: "INTACT", label: "سليم" },
  { value: "PRESSURE_POINTS", label: "نقاط ضغط" },
  { value: "EDEMA", label: "وذمة" },
];

export const MOBILITY_LEVELS: Options<OrthoticsMobilityLevel> = [
  { value: "INDEPENDENT", label: "مستقل" },
  { value: "WALKS_WITH_AIDS", label: "يمشي بمساعدة" },
  { value: "WHEELCHAIR_USER", label: "مستخدم كرسي متحرك" },
];

export const ASSISTIVE_DEVICES: Options<OrthoticsAssistiveDevice> = [
  { value: "CRUTCHES", label: "عكازات" },
  { value: "WALKER", label: "مشّاية" },
  { value: "CANE", label: "عصا" },
  { value: "NONE", label: "لا يوجد" },
];

export const GAIT_PROBLEMS: Options<OrthoticsGaitProblem> = [
  { value: "TOE_DRAG", label: "جرّ أصابع القدم" },
  { value: "KNEE_INSTABILITY", label: "عدم ثبات الركبة" },
  { value: "PELVIS_TRUNK_TILT", label: "ميلان الحوض / الجذع" },
  { value: "SCISSORING_GAIT", label: "المشية المقصّية" },
];

export const HIP_ROM: Options<OrthoticsHipRom> = [
  { value: "FREE", label: "حر" },
  { value: "LIMITED", label: "محدود" },
  { value: "DISLOCATED_SUBLUXED", label: "خلع / خلع جزئي" },
];

export const KNEE_ROM: Options<OrthoticsKneeRom> = [
  { value: "NORMAL", label: "طبيعي" },
  { value: "FLEXION_CONTRACTURE", label: "تقفّع انثنائي" },
  { value: "VALGUS_VARUS", label: "روح / فحج" },
  { value: "GENU_RECURVATUM", label: "فرط بسط الركبة" },
];

export const ANKLE_ROM: Options<OrthoticsAnkleRom> = [
  { value: "FREE", label: "حر" },
  { value: "EQUINUS", label: "قدم خيلية" },
  { value: "VARUS_VALGUS", label: "روح / فحج" },
];

export const MUSCLE_MOVEMENTS: Options<OrthoticsMuscleMovement> = [
  { value: "HIP_FLEXION", label: "ثني الورك" },
  { value: "HIP_EXTENSION", label: "بسط الورك" },
  { value: "HIP_ABDUCTION", label: "تبعيد الورك" },
  { value: "HIP_ADDUCTION", label: "تقريب الورك" },
  { value: "KNEE_FLEXION", label: "ثني الركبة" },
  { value: "KNEE_EXTENSION", label: "بسط الركبة" },
  { value: "ANKLE_DORSIFLEXION", label: "عطف ظهري للكاحل" },
  { value: "ANKLE_PLANTARFLEXION", label: "عطف أخمصي للكاحل" },
  { value: "ANKLE_EVERSION", label: "قلب الكاحل للخارج" },
  { value: "ANKLE_INVERSION", label: "قلب الكاحل للداخل" },
  { value: "GREAT_TOE_FLEXION", label: "ثني إصبع القدم الكبير" },
];

export const DEFORMITY_FLEXIBILITY: Options<OrthoticsDeformityFlexibility> = [
  { value: "FLEXIBLE", label: "مرن" },
  { value: "RIGID", label: "متصلّب" },
];

export const DEFORMITY_STATUS: Options<OrthoticsDeformityStatus> = [
  { value: "ACTIVE", label: "نشط" },
  { value: "DORMANT", label: "خامد" },
];

export const TRUNK_MOVEMENTS: Options<OrthoticsTrunkMovement> = [
  { value: "TRUNK_FLEXION", label: "ثني الجذع" },
  { value: "TRUNK_EXTENSION", label: "بسط الجذع" },
  { value: "RIGHT_LATERAL_TILT", label: "ميلان جانبي أيمن" },
  { value: "LEFT_LATERAL_TILT", label: "ميلان جانبي أيسر" },
  { value: "ROTATION_RIGHT", label: "دوران لليمين" },
  { value: "ROTATION_LEFT", label: "دوران لليسار" },
];

export const TRUNK_SCALE: Options<OrthoticsTrunkScale> = [
  { value: "GOOD", label: "جيد" },
  { value: "MODERATE", label: "متوسط" },
  { value: "WEAK", label: "ضعيف" },
  { value: "ABSENT", label: "معدوم" },
];

/** The five trunk fields, each graded on TRUNK_SCALE on its own. */
export const TRUNK_SCALE_FIELDS = [
  { key: "trunkControlSitting", label: "التحكم بالجذع — جلوس" },
  { key: "trunkBalanceDynamicSitting", label: "التوازن الديناميكي — جلوس" },
  { key: "trunkControlStanding", label: "التحكم بالجذع — وقوف" },
  { key: "trunkBalanceStaticStanding", label: "التوازن الثابت — وقوف" },
  { key: "trunkBalanceDynamicStanding", label: "التوازن الديناميكي — وقوف" },
] as const satisfies readonly { key: keyof OrthoticsPhysioAssessment; label: string }[];

export const ACTIVITY_LEVELS: Options<OrthoticsActivityLevel> = [
  { value: "K0", label: "K0 — لا يمشي" },
  { value: "K1", label: "K1 — مشي داخل المنزل" },
  { value: "K2", label: "K2 — مشي محدود خارج المنزل" },
  { value: "K3", label: "K3 — مشي بسرعات متغيرة" },
  { value: "K4", label: "K4 — نشاط عالٍ" },
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

/** Which of the three sections hold anything yet — drives the progress badges. */
export function sectionsFilled(r: OrthoticsReception) {
  const d = doctorAssessmentOf(r);
  const p = physioAssessmentOf(r);
  return {
    doctor: !!(d.diagnosisTypes?.length || d.chiefComplaint || d.muscleTone || d.doctorOpinion),
    physio: !!(p.mobilityLevel || p.gaitProblems?.length || p.activityLevel || p.physioOpinion),
    prosthetist: !!prosthetistOpinionOf(r).trim(),
  };
}
