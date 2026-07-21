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
  INSTABILITY: "عدم ثبات",
  FATIGUE: "تعب",
};

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  FOOT_PAIN: "ألم القدم",
  FOOTBALANCE_ASSESSMENT: "تقييم اتزان القدم",
  CUSTOM_INSOLES: "نعال طبية مخصصة",
  PERFORMANCE_OPTIMIZATION: "تحسين الأداء",
  FOLLOW_UP: "متابعة",
};

export const MEDICAL_HISTORY_LABEL: Record<MedicalHistoryItem, string> = {
  DIABETES: "سكري",
  HYPERTENSION: "ضغط",
  NEUROLOGICAL: "عصبي",
  VASCULAR: "وعائي",
  ARTHRITIS: "التهاب مفاصل",
  OTHER: "أخرى",
};

export const CLINICAL_PLAN_LABEL: Record<ClinicalPlanItem, string> = {
  CUSTOM_FOOTBALANCE_INSOLE: "نعل اتزان مخصص",
  THERAPEUTIC_EXERCISES: "تمارين علاجية",
  FOOTWEAR_MODIFICATION: "تعديل الحذاء",
  MEDICAL_REFERRAL: "إحالة طبية",
  PHYSICAL_THERAPY: "علاج فيزيائي",
};

export const AFFECTED_SIDE_VALUES = Object.keys(AFFECTED_SIDE_LABEL) as AffectedSide[];
export const FOOT_SYMPTOM_VALUES = Object.keys(FOOT_SYMPTOM_LABEL) as FootSymptom[];
export const VISIT_TYPE_VALUES = Object.keys(VISIT_TYPE_LABEL) as VisitType[];
export const MEDICAL_HISTORY_VALUES = Object.keys(MEDICAL_HISTORY_LABEL) as MedicalHistoryItem[];
export const CLINICAL_PLAN_VALUES = Object.keys(CLINICAL_PLAN_LABEL) as ClinicalPlanItem[];
