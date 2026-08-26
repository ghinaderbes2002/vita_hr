// The option tables for the podiatry assessment form (نموذج تقييم القدم
// الاحترافي). Only the stored values live here — every label the user reads
// comes from `clinic.podiatry.form` in messages/{ar,en,tr}.json, so the web
// form and the printed sheet both follow the reader's locale.
// The Arabic wording in those files is transcribed verbatim from the printed
// VitaFoot sheet and is the source the other two are translated from.
import {
  PodiatryArchArchitecture, PodiatryDeformityType, PodiatryEdemaType, PodiatryFootwear,
  PodiatryInsoleType, PodiatryJackTest, PodiatryMainCause, PodiatryOutsoleWear,
  PodiatryPainCharacteristic, PodiatryPainLocation, PodiatryRearfootAlignment,
  PodiatryRomState, PodiatryTooManyToes, PodiatryWalkingLine,
} from "@/lib/api/clinic-podiatry";

/** A translator scoped to `clinic.podiatry.form`. */
export type FormT = (key: string) => string;

/** An option group: the stored values plus the message sub-key they live under. */
export interface OptGroup<T extends string> {
  group: string;
  values: readonly T[];
}

const g = <T extends string>(group: string, values: readonly T[]): OptGroup<T> => ({ group, values });

export const MAIN_CAUSE = g<PodiatryMainCause>("mainCause", [
  "none", "unknown", "acute_injury", "post_surgery", "chronic_overuse",
]);

export const PAIN_LOCATION = g<PodiatryPainLocation>("painLocation", [
  "forefoot", "midfoot", "rearfoot",
]);

export const PAIN_CHARACTERISTIC = g<PodiatryPainCharacteristic>("painCharacteristic", [
  "morning_startup", "eases_with_activity", "progressively_worse", "night_pain", "pain_at_rest",
]);

export const REARFOOT_ALIGNMENT = g<PodiatryRearfootAlignment>("rearfootAlignment", [
  "varus", "valgus", "neutral",
]);

export const TOO_MANY_TOES = g<PodiatryTooManyToes>("tooManyToes", ["negative", "positive"]);

export const ARCH_ARCHITECTURE = g<PodiatryArchArchitecture>("archArchitecture", [
  "normal", "low", "high",
]);

export const DEFORMITY_TYPE = g<PodiatryDeformityType>("deformityType", ["flexible", "rigid"]);

export const EDEMA_TYPE = g<PodiatryEdemaType>("edemaType", [
  "pitting", "non_pitting", "unilateral", "bilateral",
]);

export const ROM = g<PodiatryRomState>("rom", ["normal", "limited"]);

export const JACK_TEST = g<PodiatryJackTest>("jackTest", ["arch_forms", "arch_flat"]);

export const WALKING_LINE = g<PodiatryWalkingLine>("walkingLine", ["normal", "inward", "outward"]);

export const FOOTWEAR = g<PodiatryFootwear>("footwear", [
  "stability_running", "minimalist", "high_heel", "medical", "custom_orthotic",
]);

export const OUTSOLE_WEAR = g<PodiatryOutsoleWear>("outsoleWear", [
  "normal", "lateral_supination", "medial_pronation",
]);

/** Product codes, not words — the same in every locale. */
export const INSOLE_TYPE_VALUES = [
  "VF01", "VF02", "VF03", "VF04", "VF05", "VF06", "VF07", "VF08", "VF09", "VF10", "VF11",
] as unknown as readonly PodiatryInsoleType[];

/** The palpation points, in the order the printed sheet lists them. */
export const PALPATION_KEYS = ["plantar", "medial", "lateral", "posterior", "dorsal"] as const;

/**
 * The measurement rows. Each key is the field prefix — the payload appends
 * `Left` / `Right` to it (footLength → footLengthLeft / footLengthRight).
 */
export const FOOT_MEASUREMENT_KEYS = [
  "footLength", "footWidth", "archHeight", "ballWidth", "ballCircumference", "heelWidth",
  "metatarsalBaseHeight", "footAlignment", "navicularHeight", "navicularDrop",
  "navicularHeightWithOrthotic", "navicularDropWithOrthotic",
] as const;

/** The label one picked value reads as. */
export const labelOf = <T extends string>(t: FormT, o: OptGroup<T>, v?: string | null): string =>
  (v ? t(`opts.${o.group}.${v}`) : "");

/** Joins the picked values of a group into one line, in the reader's script. */
export const labelsOf = <T extends string>(
  t: FormT,
  o: OptGroup<T>,
  vs?: readonly string[] | null,
  sep = ", ",
): string => (vs ?? []).map((v) => labelOf(t, o, v)).filter(Boolean).join(sep);
