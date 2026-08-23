// Arabic labels for the reception enums, shared by the list and the reception
// form. The assessment form has its own tables in podiatry-session-schema.
import {
  AffectedSide, FootSymptom, MedicalHistoryItem, VisitType,
} from "@/lib/api/clinic-podiatry";

export const AFFECTED_SIDE_LABEL: Record<AffectedSide, string> = {
  R: "يمين",
  L: "يسار",
  BILATERAL: "الطرفان",
};

export const FOOT_SYMPTOM_LABEL: Record<FootSymptom, string> = {
  PAIN: "ألم",
  NUMBNESS: "تنميل",
  SWELLING: "تورّم",
  INSTABILITY: "عدم ثباته",
  FATIGUE: "  تعب سريع",
};

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  FOOT_PAIN: "ألم القدم",
  FOOTBALANCE_ASSESSMENT: "تحليل  ",
  CUSTOM_INSOLES: " ضبان مخصصة",
  PERFORMANCE_OPTIMIZATION: "تحسين الأداء",
  FOLLOW_UP: "متابعة",
};

export const MEDICAL_HISTORY_LABEL: Record<MedicalHistoryItem, string> = {
  DIABETES: "سكري",
  HYPERTENSION: "ارتفاع ضغط",
  NEUROLOGICAL: "أمراض أعصاب",
  VASCULAR: "أمراض أوعية",
  ARTHRITIS: "التهاب مفاصل",
  OTHER: "أخرى",
};

export const AFFECTED_SIDE_VALUES = Object.keys(AFFECTED_SIDE_LABEL) as AffectedSide[];
export const FOOT_SYMPTOM_VALUES = Object.keys(FOOT_SYMPTOM_LABEL) as FootSymptom[];
export const VISIT_TYPE_VALUES = Object.keys(VISIT_TYPE_LABEL) as VisitType[];
export const MEDICAL_HISTORY_VALUES = Object.keys(MEDICAL_HISTORY_LABEL) as MedicalHistoryItem[];
