"use client";

// Labels for the physiotherapy enums, bound to the active locale. The stored
// values and their display order live in lib/api/clinic-physio; the words live
// in `clinic.physio.sheet`, shared by the case screens and the printed sheet.
import { useTranslations } from "next-intl";
import {
  ChronicCondition, EvaluationModality, PhysioGoal, TherapyModality,
} from "@/lib/api/clinic-physio";

/** A translator scoped to `clinic.physio.sheet`. */
export type SheetT = (key: string) => string;

export function usePhysioSheetT(): SheetT {
  return useTranslations("clinic.physio.sheet") as unknown as SheetT;
}

export function usePhysioLabels() {
  const t = usePhysioSheetT();
  return {
    t,
    modality: (v: TherapyModality | EvaluationModality) => t(`modality.${v}`),
    chronic: (v: ChronicCondition) => t(`chronic.${v}`),
    goal: (v: PhysioGoal) => t(`goal.${v}`),
  };
}
