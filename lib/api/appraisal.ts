import { apiClient } from "./client";

/**
 * تقييم الأداء 360 درجة — وحدة مستقلة عن evaluation-forms وعن تقييم فترة التجربة.
 * كل الردود `{ success, data, meta }`؛ الدوال هنا ترجع `data` مباشرة.
 * الخدمة ترفض أي حقل غير موثّق بـ 400، فلا ترسلوا إلا الحقول المعرّفة بالأنواع أدناه.
 */

export type AppraisalAxis = "MANAGER" | "CUSTOMER" | "PEER" | "UPWARD" | "COMMITMENT" | "SELF";
/** المحاور التي لها نماذج إدخال — CUSTOMER و COMMITMENT آليّان. */
export type AppraisalInputAxis = "SELF" | "MANAGER" | "UPWARD" | "PEER";
export type AppraisalCycleStatus = "DRAFT" | "OPEN" | "CLOSED" | "FINALIZED";
export type AppraisalTaskStatus = "NOT_STARTED" | "DRAFT" | "SUBMITTED";
export type AppraisalSubmissionStatus = "DRAFT" | "SUBMITTED";
export type BonusTier = "EXCEPTIONAL" | "HIGH" | "BASIC" | "PIP";
export type SatisfactionSource = "PROSTHETICS" | "PHYSIO" | "PODIATRY" | null;

export const APPRAISAL_AXES: AppraisalAxis[] = ["MANAGER", "CUSTOMER", "PEER", "UPWARD", "COMMITMENT", "SELF"];
/** المحاور السرّية: لا يُعرض اسم المقيّم إلا بصلاحية view-raters. */
export const ANONYMOUS_AXES: AppraisalAxis[] = ["PEER", "UPWARD"];

export interface AppraisalCycle {
  id: string;
  code: string;
  nameAr: string;
  startDate: string;
  endDate: string;
  status: AppraisalCycleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppraisalQuestion {
  id: string;
  axis: AppraisalAxis;
  displayOrder: number;
  textAr: string;
  /** الدرجة من 1 إلى maxScore (10 أو 5 أو 3). */
  maxScore: number;
}

export interface AppraisalTask {
  axis: AppraisalInputAxis;
  evaluateeId: string;
  evaluateeName: string;
  evaluateeJobTitle?: string | null;
  submissionId: string | null;
  status: AppraisalTaskStatus;
}

export interface AppraisalTasksResponse {
  cycle: Pick<AppraisalCycle, "id" | "code" | "nameAr" | "status">;
  canEdit: boolean;
  tasks: AppraisalTask[];
}

export interface AppraisalAnswer {
  questionId: string;
  score: number;
}

export interface AppraisalSubmission {
  id: string;
  axis: AppraisalAxis;
  status: AppraisalSubmissionStatus;
  comments?: string | null;
  achievementNote?: string | null;
  achievementFileUrl?: string | null;
  answers: AppraisalAnswer[];
}

export interface SaveSubmissionData {
  axis: AppraisalInputAxis;
  evaluateeId: string;
  answers: AppraisalAnswer[];
  comments?: string;
  /** مسموح فقط مع axis = SELF. */
  achievementNote?: string;
}

export interface AxisResult {
  axis: AppraisalAxis;
  /** null = المحور لا ينطبق. */
  percent: number | null;
  weight: number;
}

export interface CommitmentBreakdown {
  score: number;
  deductions: {
    penalties: number;
    justifications: number;
    excessLeaveDays: number;
    excessLeaveHours: number;
  };
  bonus: number;
}

export interface MyAppraisalResult {
  cycle: Pick<AppraisalCycle, "id" | "code" | "nameAr">;
  axes: AxisResult[];
  peerCount: number;
  upwardCount: number;
  commitment?: CommitmentBreakdown | null;
  finalScore: number | null;
  bonusTier: BonusTier | null;
  missingAxes: AppraisalAxis[];
}

// ─── HR ───────────────────────────────────────────────────────────────

export interface DepartmentConfig {
  departmentId: string;
  code: string;
  nameAr: string;
  parentId: string | null;
  configured: boolean;
  isCenterMedical: boolean;
  satisfactionSource: SatisfactionSource;
}

export interface ReadinessJobTitle {
  id: string;
  code: string;
  nameAr: string;
  isReadiness: boolean;
}

export interface AppraisalSettings {
  penaltyPoints: number;
  justificationPoints: number;
  excessLeaveDayPoints: number;
  excessLeaveHourPoints: number;
  starOfMonthPoints: number;
  monthlyLeaveDaysAllowance: number;
  monthlyLeaveHoursAllowance: number;
  countedLeaveTypeCodes: string[];
}

export interface CreateCycleData {
  code: string;
  nameAr: string;
  startDate: string;
  endDate: string;
}

export type UpdateCycleData = Partial<Pick<CreateCycleData, "nameAr" | "startDate" | "endDate">>;

export interface AxisProgress {
  axis: AppraisalAxis;
  expected: number;
  submitted: number;
  drafts: number;
}

export interface ComputeResponse {
  computed: number;
  warnings?: {
    unconfiguredDepartments?: string[];
    noReadinessJobTitles?: boolean;
  };
}

export interface EmployeeAppraisalResult {
  employeeId: string;
  employeeName: string;
  managerPercent: number | null;
  customerPercent: number | null;
  peerPercent: number | null;
  upwardPercent: number | null;
  commitmentPercent: number | null;
  selfPercent: number | null;
  peerCount: number;
  upwardCount: number;
  appliedWeights: Partial<Record<AppraisalAxis, number>>;
  missingAxes: AppraisalAxis[];
  finalScore: number | null;
  bonusTier: BonusTier | null;
  details?: {
    employee?: { departmentName?: string; jobTitleName?: string; gradeCode?: string };
    customer?: Record<string, unknown>;
    commitment?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ResultSubmission {
  id: string;
  axis: AppraisalAxis;
  status: AppraisalSubmissionStatus;
  /** null لمحاور PEER/UPWARD إلا لمن يملك view-raters. */
  evaluatorId: string | null;
  evaluatorName: string | null;
  score?: number | null;
  percent?: number | null;
  comments?: string | null;
  achievementNote?: string | null;
  answers?: AppraisalAnswer[];
}

export interface EmployeeAppraisalDetail {
  result: EmployeeAppraisalResult;
  submissions: ResultSubmission[];
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const appraisalApi = {
  // ─── الموظف ───
  getCurrentCycle: async (): Promise<AppraisalCycle | null> =>
    unwrap(await apiClient.get("/appraisal/me/current-cycle")) ?? null,

  getQuestions: async (): Promise<AppraisalQuestion[]> =>
    unwrap(await apiClient.get("/appraisal/me/questions")) ?? [],

  getMyTasks: async (cycleId: string): Promise<AppraisalTasksResponse> =>
    unwrap(await apiClient.get(`/appraisal/me/cycles/${cycleId}/tasks`)),

  getMySubmission: async (
    cycleId: string,
    axis: AppraisalInputAxis,
    evaluateeId: string,
  ): Promise<AppraisalSubmission | null> =>
    unwrap(await apiClient.get(`/appraisal/me/cycles/${cycleId}/submissions/${axis}/${evaluateeId}`)) ?? null,

  saveSubmission: async (cycleId: string, data: SaveSubmissionData): Promise<AppraisalSubmission> =>
    unwrap(await apiClient.put(`/appraisal/me/cycles/${cycleId}/submissions`, data)),

  submitSubmission: async (cycleId: string, submissionId: string): Promise<AppraisalSubmission> =>
    unwrap(await apiClient.post(`/appraisal/me/cycles/${cycleId}/submissions/${submissionId}/submit`)),

  uploadAchievementFile: async (cycleId: string, file: File): Promise<{ submissionId: string; uploaded: boolean }> => {
    const form = new FormData();
    form.append("file", file);
    return unwrap(
      await apiClient.post(`/appraisal/me/cycles/${cycleId}/achievement-file`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  /** مسموح لصاحب الملف ولمديره المباشر ولـ HR. */
  downloadAchievementFile: async (cycleId: string, employeeId: string): Promise<{ blob: Blob; fileName: string | null }> => {
    const response = await apiClient.get(`/appraisal/me/cycles/${cycleId}/achievement-file/${employeeId}`, {
      responseType: "blob",
    });
    const disposition: string | undefined = response.headers?.["content-disposition"];
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    return { blob: response.data, fileName: match ? decodeURIComponent(match[1]) : null };
  },

  /** يعمل فقط بعد FINALIZED؛ قبلها 400. */
  getMyResult: async (cycleId: string): Promise<MyAppraisalResult> =>
    unwrap(await apiClient.get(`/appraisal/me/cycles/${cycleId}/result`)),

  // ─── HR: الإعداد ───
  getDepartmentConfig: async (): Promise<DepartmentConfig[]> =>
    unwrap(await apiClient.get("/appraisal/department-config")) ?? [],

  updateDepartmentConfig: async (departmentId: string, satisfactionSource: SatisfactionSource): Promise<DepartmentConfig> =>
    unwrap(await apiClient.put(`/appraisal/department-config/${departmentId}`, { satisfactionSource })),

  getReadinessJobTitles: async (): Promise<ReadinessJobTitle[]> =>
    unwrap(await apiClient.get("/appraisal/readiness-job-titles")) ?? [],

  /** يستبدل القائمة كاملة. */
  setReadinessJobTitles: async (jobTitleIds: string[]): Promise<ReadinessJobTitle[]> =>
    unwrap(await apiClient.put("/appraisal/readiness-job-titles", { jobTitleIds })),

  getSettings: async (): Promise<AppraisalSettings> => unwrap(await apiClient.get("/appraisal/settings")),

  /** أرسلوا الحقول المتغيرة فقط. */
  updateSettings: async (data: Partial<AppraisalSettings>): Promise<AppraisalSettings> =>
    unwrap(await apiClient.put("/appraisal/settings", data)),

  // ─── HR: الدورات ───
  getCycles: async (): Promise<AppraisalCycle[]> => unwrap(await apiClient.get("/appraisal/cycles")) ?? [],

  createCycle: async (data: CreateCycleData): Promise<AppraisalCycle> =>
    unwrap(await apiClient.post("/appraisal/cycles", data)),

  updateCycle: async (id: string, data: UpdateCycleData): Promise<AppraisalCycle> =>
    unwrap(await apiClient.patch(`/appraisal/cycles/${id}`, data)),

  openCycle: async (id: string): Promise<AppraisalCycle> => unwrap(await apiClient.post(`/appraisal/cycles/${id}/open`)),

  closeCycle: async (id: string): Promise<AppraisalCycle> => unwrap(await apiClient.post(`/appraisal/cycles/${id}/close`)),

  finalizeCycle: async (id: string): Promise<AppraisalCycle> =>
    unwrap(await apiClient.post(`/appraisal/cycles/${id}/finalize`)),

  // ─── HR: المتابعة والنتائج ───
  getProgress: async (id: string): Promise<AxisProgress[]> =>
    unwrap(await apiClient.get(`/appraisal/cycles/${id}/progress`)) ?? [],

  compute: async (id: string): Promise<ComputeResponse> => unwrap(await apiClient.post(`/appraisal/cycles/${id}/compute`)),

  getResults: async (id: string): Promise<EmployeeAppraisalResult[]> =>
    unwrap(await apiClient.get(`/appraisal/cycles/${id}/results`)) ?? [],

  getEmployeeResult: async (id: string, employeeId: string): Promise<EmployeeAppraisalDetail> =>
    unwrap(await apiClient.get(`/appraisal/cycles/${id}/results/${employeeId}`)),
};
