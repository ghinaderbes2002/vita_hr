// Arabic labels for the podiatry enums, shared by the list, the reception form
// and the session cards.
import {
  AffectedSide, ClinicalPlanItem, FootSymptom, MedicalHistoryItem, VisitType,
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

export const CLINICAL_PLAN_LABEL: Record<ClinicalPlanItem, string> = {
  CUSTOM_FOOTBALANCE_INSOLE: "ضبان مخصص",
  THERAPEUTIC_EXERCISES: "تمارين علاجية",
  FOOTWEAR_MODIFICATION: "تعديل الحذاء",
  MEDICAL_REFERRAL: "تحويل طبي",
  PHYSICAL_THERAPY: "علاج فيزيائي",
};

// The four per-foot findings, in the order the session form lists them. The
// key is the suffix of the session fields (rightFlatFoot / leftFlatFoot, ...).
export const FOOT_FLAGS = [
  { key: "FlatFoot", label: "قدم مسطحة" },
  { key: "HighArch", label: "قوس مرتفع" },
  { key: "Pronation", label: "انكباب" },
  { key: "Supination", label: "انقلاب" },
] as const;

export const AFFECTED_SIDE_VALUES = Object.keys(AFFECTED_SIDE_LABEL) as AffectedSide[];
export const FOOT_SYMPTOM_VALUES = Object.keys(FOOT_SYMPTOM_LABEL) as FootSymptom[];
export const VISIT_TYPE_VALUES = Object.keys(VISIT_TYPE_LABEL) as VisitType[];
export const MEDICAL_HISTORY_VALUES = Object.keys(MEDICAL_HISTORY_LABEL) as MedicalHistoryItem[];
export const CLINICAL_PLAN_VALUES = Object.keys(CLINICAL_PLAN_LABEL) as ClinicalPlanItem[];
