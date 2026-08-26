"use client";

// The reception enums: the stored values here, the words in
// `clinic.podiatry.form.enums` so the list, the reception form and the printed
// sheet all read in the user's locale. The assessment form's own option tables
// live in podiatry-session-schema.
import { useTranslations } from "next-intl";
import {
  AffectedSide, FootSymptom, MedicalHistoryItem, VisitType,
} from "@/lib/api/clinic-podiatry";

export const AFFECTED_SIDE_VALUES: AffectedSide[] = ["R", "L", "BILATERAL"];

export const FOOT_SYMPTOM_VALUES: FootSymptom[] = [
  "PAIN", "NUMBNESS", "SWELLING", "INSTABILITY", "FATIGUE",
];

export const VISIT_TYPE_VALUES: VisitType[] = [
  "FOOT_PAIN", "FOOTBALANCE_ASSESSMENT", "CUSTOM_INSOLES",
  "PERFORMANCE_OPTIMIZATION", "FOLLOW_UP",
];

export const MEDICAL_HISTORY_VALUES: MedicalHistoryItem[] = [
  "DIABETES", "HYPERTENSION", "NEUROLOGICAL", "VASCULAR", "ARTHRITIS", "OTHER",
];

/** One label function per reception enum, bound to the active locale. */
export function usePodiatryEnumLabels() {
  const t = useTranslations("clinic.podiatry.form.enums") as unknown as (k: string) => string;
  return {
    affectedSide: (v: AffectedSide) => t(`affectedSide.${v}`),
    footSymptom: (v: FootSymptom) => t(`footSymptom.${v}`),
    visitType: (v: VisitType) => t(`visitType.${v}`),
    medicalHistory: (v: MedicalHistoryItem) => t(`medicalHistory.${v}`),
  };
}
