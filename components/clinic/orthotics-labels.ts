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
} from "@/lib/api/clinic-orthotics";

/** An ordered option list: the order is the order the form shows them in. */
export type Options<T extends string> = { value: T; label: string }[];

export const DIAGNOSIS_TYPES: Options<OrthoticsDiagnosisType> = [
  { value: "POLIO", label: "شلل الأطفال" },
  { value: "CEREBRAL_PALSY", label: "نقص الأكسجة الدماغية / الشلل الدماغي" },
  { value: "SPINA_BIFIDA", label: "الشوك المشقوق" },
  { value: "FOOT_DROP", label: "هبوط القدم" },
  { value: "OTHER", label: "أخرى" },
];

export const CEREBRAL_PALSY_TYPES: Options<OrthoticsCerebralPalsyType> = [
  { value: "SPASTIC", label: "تشنجي" },
  { value: "HYPOTONIC", label: "ارتخائي" },
  { value: "ATAXIC", label: "حركي التَّرَنُّح" },
];

export const MUSCLE_TONES: Options<OrthoticsMuscleTone> = [
  { value: "NORMAL", label: "طبيعية" },
  { value: "SPASTIC", label: "تشنجية" },
  { value: "HYPOTONIC", label: "ارتخاء" },
];

export const SENSATIONS: Options<OrthoticsSensation> = [
  { value: "INTACT", label: "سليمة" },
  { value: "REDUCED", label: "مخفضة" },
  { value: "ABSENT", label: "غائبة" },
];

export const MUSCLE_STRENGTHS: Options<OrthoticsMuscleStrength> = [
  { value: "EXCELLENT", label: "ممتازة" },
  { value: "MODERATE", label: "متوسطة" },
  { value: "WEAK", label: "ضعيفة" },
];

export const SKIN_CONDITIONS: Options<OrthoticsSkinCondition> = [
  { value: "INTACT", label: "سليمة تماماً" },
  { value: "PRESSURE_POINTS", label: "وجود قرح فراش / نقاط ضغط" },
  { value: "EDEMA", label: "تورم أو وذمة في الطرف" },
];

export const MOBILITY_LEVELS: Options<OrthoticsMobilityLevel> = [
  { value: "INDEPENDENT", label: "مستقل تماماً" },
  { value: "WALKS_WITH_AIDS", label: "يمشي بمساعدة أدوات" },
  { value: "WHEELCHAIR_USER", label: "مستخدم كرسي متحرك" },
];

export const ASSISTIVE_DEVICES: Options<OrthoticsAssistiveDevice> = [
  { value: "CRUTCHES", label: "عكازات" },
  { value: "WALKER", label: "مشاية" },
  { value: "CANE", label: "عصا" },
  { value: "NONE", label: "لا يوجد" },
];

export const GAIT_PROBLEMS: Options<OrthoticsGaitProblem> = [
  { value: "TOE_DRAG", label: "سحب القدم أثناء المشي" },
  { value: "KNEE_INSTABILITY", label: "عدم استقرار الركبة" },
  { value: "PELVIS_TRUNK_TILT", label: "ميلان الحوض أو الجذع أثناء المشي" },
  { value: "SCISSORING_GAIT", label: "مشية المقص" },
];

export const HIP_ROM: Options<OrthoticsHipRom> = [
  { value: "FREE", label: "حر" },
  { value: "LIMITED", label: "محدد المدى" },
  { value: "DISLOCATED_SUBLUXED", label: "خلع/تحت خلع" },
];

export const KNEE_ROM: Options<OrthoticsKneeRom> = [
  { value: "NORMAL", label: "طبيعي" },
  { value: "FLEXION_CONTRACTURE", label: "ثني ثابت" },
  { value: "VALGUS_VARUS", label: "ركبة روحاء/فحجاء" },
  { value: "GENU_RECURVATUM", label: "ارتداد للخلف" },
];

export const ANKLE_ROM: Options<OrthoticsAnkleRom> = [
  { value: "FREE", label: "حر" },
  { value: "EQUINUS", label: "تشوه قدم قفداء" },
  { value: "VARUS_VALGUS", label: "تشوه منقلب للداخل/الخارج" },
];

export const MUSCLE_MOVEMENTS: Options<OrthoticsMuscleMovement> = [
  { value: "HIP_FLEXION", label: "عطف الورك" },
  { value: "HIP_EXTENSION", label: "بسط الورك" },
  { value: "HIP_ABDUCTION", label: "تبعيد الورك" },
  { value: "HIP_ADDUCTION", label: "تقريب الورك" },
  { value: "KNEE_FLEXION", label: "عطف الركبة" },
  { value: "KNEE_EXTENSION", label: "بسط الركبة" },
  { value: "ANKLE_DORSIFLEXION", label: "عطف ظهري للكاحل" },
  { value: "ANKLE_PLANTARFLEXION", label: "عطف اخمصي للكاحل" },
  { value: "ANKLE_EVERSION", label: "انقلاب وحشي للكاحل" },
  { value: "ANKLE_INVERSION", label: "انقلاب انسي للكاحل" },
  { value: "GREAT_TOE_FLEXION", label: "عطف الاصبع الكبير" },
];

export const DEFORMITY_FLEXIBILITY: Options<OrthoticsDeformityFlexibility> = [
  { value: "FLEXIBLE", label: "مرنة وقابلة للتعديل" },
  { value: "RIGID", label: "ثابتة وغير قابلة للتعديل" },
];

export const DEFORMITY_STATUS: Options<OrthoticsDeformityStatus> = [
  { value: "ACTIVE", label: "نشط" },
  { value: "DORMANT", label: "خامل" },
];

export const TRUNK_MOVEMENTS: Options<OrthoticsTrunkMovement> = [
  { value: "TRUNK_FLEXION", label: "عطف الجذع" },
  { value: "TRUNK_EXTENSION", label: "بسط الجذع" },
  { value: "RIGHT_LATERAL_TILT", label: "الميلان الجانبي الأيمن" },
  { value: "LEFT_LATERAL_TILT", label: "الميلان الجانبي الأيسر" },
  { value: "ROTATION_RIGHT", label: "الدوران يميناً" },
  { value: "ROTATION_LEFT", label: "الدوران يساراً" },
];

export const TRUNK_SCALE: Options<OrthoticsTrunkScale> = [
  { value: "GOOD", label: "جيد" },
  { value: "MODERATE", label: "متوسط" },
  { value: "WEAK", label: "ضعيف" },
  { value: "ABSENT", label: "معدوم" },
];

/** The five trunk fields, each graded on TRUNK_SCALE on its own. */
export const TRUNK_SCALE_FIELDS = [
  { key: "trunkControlSitting", label: "التحكم بالجذع أثناء الجلوس" },
  { key: "trunkBalanceDynamicSitting", label: "التوازن الديناميكي أثناء الجلوس" },
  { key: "trunkControlStanding", label: "التحكم بالجذع أثناء الوقوف" },
  { key: "trunkBalanceStaticStanding", label: "التوازن الثابت أثناء الوقوف" },
  { key: "trunkBalanceDynamicStanding", label: "التوازن الديناميكي أثناء الوقوف" },
] as const satisfies readonly { key: keyof OrthoticsPhysioAssessment; label: string }[];

export const ACTIVITY_LEVELS: Options<OrthoticsActivityLevel> = [
  { value: "K0", label: "k0" },
  { value: "K1", label: "k1" },
  { value: "K2", label: "k2" },
  { value: "K3", label: "k3" },
  { value: "K4", label: "k4" },
];

export const DAILY_USE_SETTINGS: Options<OrthoticsDailyUseSetting> = [
  { value: "HOME", label: "المنزل" },
  { value: "SCHOOL", label: "المدرسة" },
  { value: "SPORTS", label: "الرياضة" },
  { value: "OTHER", label: "أخرى" },
];

export const RECOMMENDED_DEVICES: Options<OrthoticsRecommendedDevice> = [
  { value: "KAFO", label: "KAFO" },
  { value: "AFO", label: "AFO" },
  { value: "ORTHOSIS_WITH_FES", label: "جهاز تقويمي + FES" },
  { value: "OTHER", label: "أخرى" },
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
    dailyWearHours: r.dailyWearHours ?? undefined,
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
      || r.recommendedDeviceTypes?.length || r.dailyWearHours != null),
  };
}
