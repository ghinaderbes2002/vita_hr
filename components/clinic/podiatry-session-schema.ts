// Option tables for the podiatry assessment form (نموذج تقييم القدم الاحترافي).
// The wording is transcribed verbatim from the printed VitaFoot sheet — the web
// form and the PDF must read exactly like the paper the clinician fills in.
// Each option is [value, Arabic label, English label] — the web form shows the
// Arabic with the English underneath, the printed sheet prints both columns.
// Arabic labels never contain Latin characters: react-pdf has no bidi pass, so
// a mixed string prints scrambled — the Latin half belongs in the English column.
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
  ["post_surgery", "بعد الجراحة", "Post Surgery"],
  ["chronic_overuse", "إجهاد مفرط مزمن", "Chronic Overuse"],
];

export const PAIN_LOCATION_OPTS: Opt<PodiatryPainLocation>[] = [
  ["forefoot", "مقدمة القدم", "Forefoot"],
  ["midfoot", "منتصف القدم", "Midfoot"],
  ["rearfoot", "الجزء الخلفي من القدم", "Rearfoot"],
];

export const PAIN_CHARACTERISTIC_OPTS: Opt<PodiatryPainCharacteristic>[] = [
  ["morning_startup", "ألم عند الاستيقاظ صباحاً / الخطوة الأولى", "Morning startup pain"],
  ["eases_with_activity", "يقل الألم ويزول مع النشاط والحركة", "Eases with activity"],
  ["progressively_worse", "يزداد الألم سوءاً تدريجياً أثناء النشاط", "Progressively worse during activity"],
  ["night_pain", "ألم ليلي", "Night pain"],
  ["pain_at_rest", "ألم أثناء الراحة الساكنة", "Pain at rest"],
];

export const REARFOOT_ALIGNMENT_OPTS: Opt<PodiatryRearfootAlignment>[] = [
  ["varus", "انحراف إنسي", "Varus"],
  ["valgus", "انحراف وحشي", "Valgus"],
  ["neutral", "محايد", "Neutral"],
];

export const TOO_MANY_TOES_OPTS: Opt<PodiatryTooManyToes>[] = [
  ["negative", "سلبية", "Negative"],
  ["positive", "إيجابية", "Positive"],
];

export const ARCH_ARCHITECTURE_OPTS: Opt<PodiatryArchArchitecture>[] = [
  ["normal", "طبيعي", "Normal"],
  ["low", "منخفض", "Low"],
  ["high", "عالي", "High"],
];

export const DEFORMITY_TYPE_OPTS: Opt<PodiatryDeformityType>[] = [
  ["flexible", "مرن", "Flexible"],
  ["rigid", "قاس", "Rigid"],
];

export const EDEMA_TYPE_OPTS: Opt<PodiatryEdemaType>[] = [
  ["pitting", "انطباعية", "Pitting"],
  ["non_pitting", "غير انطباعية", "Non-Pitting"],
  ["unilateral", "أحادية الجانب", "Unilateral"],
  ["bilateral", "ثنائية الجانب", "Bilateral"],
];

export const ROM_OPTS: Opt<PodiatryRomState>[] = [
  ["normal", "طبيعي", "Normal"],
  ["limited", "محدود", "Limited"],
];

export const JACK_TEST_OPTS: Opt<PodiatryJackTest>[] = [
  ["arch_forms", "تتشكل القوس وترتفع", "Arch forms and rises"],
  ["arch_flat", "تظل القوس مسطحة", "Arch stays flat"],
];

export const WALKING_LINE_OPTS: Opt<PodiatryWalkingLine>[] = [
  ["normal", "طبيعي ومستقيم", "Normal and straight"],
  ["inward", "يميل وينكفئ للداخل (كبّ)", "Inward (pronation)"],
  ["outward", "يميل وينكفئ للخارج (استلقاء)", "Outward (supination)"],
];

export const FOOTWEAR_OPTS: Opt<PodiatryFootwear>[] = [
  ["stability_running", "حذاء ركض ثباتي داعم", "Stability Running"],
  ["minimalist", "حذاء بسيط", "Minimalist"],
  ["high_heel", "كعب عالي", "High Heel"],
  ["medical", "حذاء طبي", "Medical"],
  ["custom_orthotic", "ضبان طبي مخصص", "Custom Orthotic"],
];

export const OUTSOLE_WEAR_OPTS: Opt<PodiatryOutsoleWear>[] = [
  ["normal", "طبيعي (من الكعب الخارجي إلى مقدمة القدم الداخلية)", "Normal"],
  ["lateral_supination", "تآكل خارجي واستلقاء مفرط", "Lateral wear / Excessive supination"],
  ["medial_pronation", "تآكل داخلي وكبّ شديد", "Medial wear / Severe pronation"],
];

export const INSOLE_TYPE_OPTS: Opt<PodiatryInsoleType>[] = [
  "VF01", "VF02", "VF03", "VF04", "VF05", "VF06", "VF07", "VF08", "VF09", "VF10", "VF11",
].map((v) => [v, v, v] as Opt<PodiatryInsoleType>);

/** The palpation points, in the order the printed sheet lists them. */
export const PALPATION_POINTS = [
  ["plantar", "أسفل القدم / اللفافة الأخمصية", "Plantar"],
  ["medial", "الجانب الداخلي للقدم أو الكاحل", "Medial"],
  ["lateral", "الجانب الخارجي للقدم أو الكاحل", "Lateral"],
  ["posterior", "خلف الكعب / وتر أخيل", "Posterior"],
  ["dorsal", "الجانب الظهري العلوي للقدم", "Dorsal"],
] as const;

/**
 * The measurement rows. `key` is the field prefix — the payload appends
 * `Left` / `Right` to it (footLength → footLengthLeft / footLengthRight).
 */
export const FOOT_MEASUREMENT_ROWS = [
  ["footLength", "طول القدم", "Foot Length"],
  ["footWidth", "عرض القدم", "Foot Width"],
  ["archHeight", "ارتفاع القوس", "Arch Height"],
  ["ballWidth", "عرض كرة القدم", "Ball Width"],
  ["ballCircumference", "محيط كرة القدم", "Ball Circumference"],
  ["heelWidth", "عرض الكعب", "Heel Width"],
  ["metatarsalBaseHeight", "ارتفاع قاعدة أمشاط القدم", "Metatarsal Base Height"],
  ["footAlignment", "محاذاة واستقامة القدم", "Foot Alignment"],
  ["navicularHeight", "ارتفاع العظم الزورقي", "Navicular Height"],
  ["navicularDrop", "اختبار هبوط الزورقي", "Navicular Drop Test"],
  ["navicularHeightWithOrthotic", "ارتفاع العظم الزورقي بالضبان", "Navicular Height w/ Orthotic"],
  ["navicularDropWithOrthotic", "اختبار هبوط الزورقي بالضبان", "Navicular Drop w/ Orthotic"],
] as const;

/** Arabic labels for the option values, for read-only rendering and the PDF. */
export const labelOf = <T extends string>(opts: Opt<T>[], v?: string | null): string =>
  opts.find((o) => o[0] === v)?.[1] ?? (v ?? "");

/** Joins the picked values of a group into one Arabic line ("، " separated). */
export const labelsOf = <T extends string>(opts: Opt<T>[], vs?: readonly string[] | null): string =>
  (vs ?? []).map((v) => labelOf(opts, v)).filter(Boolean).join("، ");
