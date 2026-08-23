// Option tables for the podiatry assessment form (نموذج تقييم القدم الاحترافي).
// Each option is [value, Arabic label, English label] — the web form uses the
// Arabic label, the printed sheet prints both. Arabic labels never contain
// Latin characters: react-pdf has no bidi pass, so a mixed string prints
// scrambled — the Latin half belongs in the English column instead.
import {
  PodiatryArchArchitecture, PodiatryDeformityType, PodiatryEdemaType, PodiatryFootwear,
  PodiatryInsoleType, PodiatryJackTest, PodiatryMainCause, PodiatryOutsoleWear,
  PodiatryPainCharacteristic, PodiatryPainLocation, PodiatryRearfootAlignment,
  PodiatryRomState, PodiatryTooManyToes, PodiatryWalkingLine,
} from "@/lib/api/clinic-podiatry";

export type Opt<T extends string> = readonly [T, string, string];

export const MAIN_CAUSE_OPTS: Opt<PodiatryMainCause>[] = [
  ["none", "لا يوجد", "None"],
  ["unknown", "غير معروف", "Unknown"],
  ["acute_injury", "إصابة حادة", "Acute Injury"],
  ["post_surgery", "ما بعد جراحة", "Post Surgery"],
  ["chronic_overuse", "إجهاد مزمن", "Chronic Overuse"],
];

export const PAIN_LOCATION_OPTS: Opt<PodiatryPainLocation>[] = [
  ["forefoot", "مقدمة القدم", "Forefoot"],
  ["midfoot", "منتصف القدم", "Midfoot"],
  ["rearfoot", "مؤخرة القدم", "Rearfoot"],
];

export const PAIN_CHARACTERISTIC_OPTS: Opt<PodiatryPainCharacteristic>[] = [
  ["morning_startup", "ألم بدء الحركة صباحاً", "Morning Startup"],
  ["eases_with_activity", "يخف مع النشاط", "Eases With Activity"],
  ["progressively_worse", "يزداد تدريجياً", "Progressively Worse"],
  ["night_pain", "ألم ليلي", "Night Pain"],
  ["pain_at_rest", "ألم أثناء الراحة", "Pain At Rest"],
];

export const REARFOOT_ALIGNMENT_OPTS: Opt<PodiatryRearfootAlignment>[] = [
  ["varus", "انحراف إنسي", "Varus"],
  ["valgus", "انحراف وحشي", "Valgus"],
  ["neutral", "محايد", "Neutral"],
];

export const TOO_MANY_TOES_OPTS: Opt<PodiatryTooManyToes>[] = [
  ["negative", "سلبي", "Negative"],
  ["positive", "إيجابي", "Positive"],
];

export const ARCH_ARCHITECTURE_OPTS: Opt<PodiatryArchArchitecture>[] = [
  ["normal", "طبيعي", "Normal"],
  ["low", "منخفض", "Low"],
  ["high", "مرتفع", "High"],
];

export const DEFORMITY_TYPE_OPTS: Opt<PodiatryDeformityType>[] = [
  ["flexible", "مرن", "Flexible"],
  ["rigid", "متيبّس", "Rigid"],
];

export const EDEMA_TYPE_OPTS: Opt<PodiatryEdemaType>[] = [
  ["pitting", "انطباعي", "Pitting"],
  ["non_pitting", "غير انطباعي", "Non-Pitting"],
  ["unilateral", "أحادي الجانب", "Unilateral"],
  ["bilateral", "ثنائي الجانب", "Bilateral"],
];

export const ROM_OPTS: Opt<PodiatryRomState>[] = [
  ["normal", "طبيعي", "Normal"],
  ["limited", "محدود", "Limited"],
];

export const JACK_TEST_OPTS: Opt<PodiatryJackTest>[] = [
  ["arch_forms", "يتشكل القوس", "Arch Forms"],
  ["arch_flat", "يبقى مسطحاً", "Arch Flat"],
];

export const WALKING_LINE_OPTS: Opt<PodiatryWalkingLine>[] = [
  ["normal", "طبيعي", "Normal"],
  ["inward", "للداخل", "Inward"],
  ["outward", "للخارج", "Outward"],
];

export const FOOTWEAR_OPTS: Opt<PodiatryFootwear>[] = [
  ["stability_running", "حذاء ركض داعم", "Stability Running"],
  ["minimalist", "حذاء خفيف", "Minimalist"],
  ["high_heel", "كعب عالٍ", "High Heel"],
  ["medical", "حذاء طبي", "Medical"],
  ["custom_orthotic", "ضبانة مخصصة", "Custom Orthotic"],
];

export const OUTSOLE_WEAR_OPTS: Opt<PodiatryOutsoleWear>[] = [
  ["normal", "طبيعي", "Normal"],
  ["lateral_supination", "تآكل وحشي", "Lateral / Supination"],
  ["medial_pronation", "تآكل إنسي", "Medial / Pronation"],
];

export const INSOLE_TYPE_OPTS: Opt<PodiatryInsoleType>[] = [
  "VF01", "VF02", "VF03", "VF04", "VF05", "VF06", "VF07", "VF08", "VF09", "VF10", "VF11",
].map((v) => [v, v, v] as Opt<PodiatryInsoleType>);

/** The palpation points, in the order the printed sheet lists them. */
export const PALPATION_POINTS = [
  ["plantar", "أخمصي", "Plantar"],
  ["medial", "إنسي", "Medial"],
  ["lateral", "وحشي", "Lateral"],
  ["posterior", "خلفي", "Posterior"],
  ["dorsal", "ظهري", "Dorsal"],
] as const;

/**
 * The measurement rows. `key` is the field prefix — the payload appends
 * `Left` / `Right` to it (footLength → footLengthLeft / footLengthRight).
 */
export const FOOT_MEASUREMENT_ROWS = [
  ["footLength", "طول القدم", "Foot Length"],
  ["footWidth", "عرض القدم", "Foot Width"],
  ["archHeight", "ارتفاع القوس", "Arch Height"],
  ["ballWidth", "عرض مشط القدم", "Ball Width"],
  ["ballCircumference", "محيط مشط القدم", "Ball Circumference"],
  ["heelWidth", "عرض الكعب", "Heel Width"],
  ["metatarsalBaseHeight", "ارتفاع قاعدة المشط", "Metatarsal Base Height"],
  ["footAlignment", "محاذاة القدم", "Foot Alignment"],
  ["navicularHeight", "ارتفاع الزورقي", "Navicular Height"],
  ["navicularDrop", "هبوط الزورقي", "Navicular Drop"],
  ["navicularHeightWithOrthotic", "ارتفاع الزورقي مع الضبانة", "Navicular Height w/ Orthotic"],
  ["navicularDropWithOrthotic", "هبوط الزورقي مع الضبانة", "Navicular Drop w/ Orthotic"],
] as const;

/** Arabic labels for the option values, for read-only rendering and the PDF. */
export const labelOf = <T extends string>(opts: Opt<T>[], v?: string | null): string =>
  opts.find((o) => o[0] === v)?.[1] ?? (v ?? "");

/** Joins the picked values of a group into one Arabic line ("، " separated). */
export const labelsOf = <T extends string>(opts: Opt<T>[], vs?: readonly string[] | null): string =>
  (vs ?? []).map((v) => labelOf(opts, v)).filter(Boolean).join("، ");
