import { apiClient } from "./client";

/**
 * استبيان رضا العملاء — بديل داخلي عن SurveyMars. القسم يحدد مجموعة الأسئلة
 * الإضافية، والباك يربط الاستبيان تلقائياً بآخر حالة للمريض في نفس القسم
 * ويجمّد معالجيها لحظة الإنشاء، فلا يُرسل الفرونت caseId ولا practitionerId.
 */
export type SurveyDepartment = "PROSTHETICS" | "PODIATRY" | "PHYSIO";
export type SurveyGender = "MALE" | "FEMALE";
export type SurveyAgeGroup =
  | "UNDER_18" | "FROM_18_25" | "FROM_26_30" | "FROM_31_40"
  | "FROM_41_50" | "FROM_51_60" | "OVER_60";
export type ComplaintStage = "ASSESSMENT" | "MEASUREMENT" | "TRAINING_REHAB" | "SOCKET_FITTING" | "NONE";
export type PodiatryServiceType = "ANALYSIS_ONLY" | "ANALYSIS_AND_FITTING";

/** تقييم من 1 إلى 5. */
export type SurveyRating = 1 | 2 | 3 | 4 | 5;

export interface CreatePatientSurveyDto {
  patientId: string;
  department: SurveyDepartment;
  customerName: string;
  gender: SurveyGender;
  ageGroup: SurveyAgeGroup;
  overallCompanyRating: number;
  additionalNotes?: string;
  // مشتركة اختيارية
  staffExplanationRating?: number;
  specialistCareRating?: number;
  waitingAreaRating?: number;
  waitingDurationRating?: number;
  // PROSTHETICS
  measurementAccuracyRating?: number;
  movementEaseRating?: number;
  complaintStage?: ComplaintStage;
  // PODIATRY
  podiatryServiceType?: PodiatryServiceType;
  medicalRecommendationRating?: number;
  // PHYSIO
  exerciseQualityRating?: number;
  mobilityImprovementRating?: number;
}

export interface PatientSurvey extends CreatePatientSurveyDto {
  id: string;
  /** آخر حالة للمريض في نفس القسم وقت الإنشاء — null إن لم توجد. */
  caseId?: string | null;
  /** معالجو تلك الحالة لحظة الإنشاء — فارغة إن لم توجد حالة، وليس خطأ. */
  practitionerIds?: string[];
  patient?: { id: string; firstName?: string; lastName?: string; patientNumber?: string } | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface PatientSurveyListParams {
  patientId?: string;
  department?: SurveyDepartment;
  page?: number;
  limit?: number;
}

export interface PaginatedPatientSurveys {
  items: PatientSurvey[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const patientSurveysApi = {
  create: async (dto: CreatePatientSurveyDto): Promise<PatientSurvey> => {
    const { data } = await apiClient.post("/patients/surveys", dto);
    return data?.data ?? data;
  },

  /** الأحدث أولاً. */
  list: async (params?: PatientSurveyListParams): Promise<PaginatedPatientSurveys> => {
    const { data } = await apiClient.get("/patients/surveys", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items ?? (Array.isArray(d) ? d : []),
      page: d?.page ?? 1,
      limit: d?.limit ?? 20,
      total: d?.total ?? 0,
      totalPages: d?.totalPages ?? 0,
    };
  },

  get: async (id: string): Promise<PatientSurvey> => {
    const { data } = await apiClient.get(`/patients/surveys/${id}`);
    return data?.data ?? data;
  },
};
