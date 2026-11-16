import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  appraisalApi,
  AppraisalInputAxis,
  AppraisalSettings,
  CreateCycleData,
  SaveSubmissionData,
  SatisfactionSource,
  UpdateCycleData,
} from "@/lib/api/appraisal";

/** الخدمة ترجع رسالة عربية جاهزة في `message` — تُعرض كما هي. */
export function appraisalErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; error?: { message?: string } } } } | null)?.response
    ?.data;
  return data?.error?.message || data?.message || fallback;
}

const KEYS = {
  all: ["appraisal"] as const,
  currentCycle: ["appraisal", "me", "current-cycle"] as const,
  questions: ["appraisal", "me", "questions"] as const,
  tasks: (cycleId: string) => ["appraisal", "me", "tasks", cycleId] as const,
  submission: (cycleId: string, axis: string, evaluateeId: string) =>
    ["appraisal", "me", "submission", cycleId, axis, evaluateeId] as const,
  myResult: (cycleId: string) => ["appraisal", "me", "result", cycleId] as const,
  departmentConfig: ["appraisal", "department-config"] as const,
  readiness: ["appraisal", "readiness-job-titles"] as const,
  settings: ["appraisal", "settings"] as const,
  cycles: ["appraisal", "cycles"] as const,
  progress: (id: string) => ["appraisal", "cycles", id, "progress"] as const,
  results: (id: string) => ["appraisal", "cycles", id, "results"] as const,
  employeeResult: (id: string, employeeId: string) => ["appraisal", "cycles", id, "results", employeeId] as const,
};

// ─── الموظف ───────────────────────────────────────────────────────────

export function useAppraisalCurrentCycle() {
  return useQuery({ queryKey: KEYS.currentCycle, queryFn: appraisalApi.getCurrentCycle });
}

/** الأسئلة ثابتة — تُحمَّل مرة وحدة. */
export function useAppraisalQuestions() {
  return useQuery({ queryKey: KEYS.questions, queryFn: appraisalApi.getQuestions, staleTime: Infinity });
}

export function useAppraisalTasks(cycleId?: string) {
  return useQuery({
    queryKey: KEYS.tasks(cycleId ?? ""),
    queryFn: () => appraisalApi.getMyTasks(cycleId!),
    enabled: !!cycleId,
  });
}

export function useAppraisalSubmission(cycleId?: string, axis?: AppraisalInputAxis, evaluateeId?: string) {
  return useQuery({
    queryKey: KEYS.submission(cycleId ?? "", axis ?? "", evaluateeId ?? ""),
    queryFn: () => appraisalApi.getMySubmission(cycleId!, axis!, evaluateeId!),
    enabled: !!cycleId && !!axis && !!evaluateeId,
  });
}

export function useMyAppraisalResult(cycleId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.myResult(cycleId ?? ""),
    queryFn: () => appraisalApi.getMyResult(cycleId!),
    enabled: !!cycleId && enabled,
    retry: false,
  });
}

export function useSaveAppraisalSubmission(cycleId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: (data: SaveSubmissionData) => appraisalApi.saveSubmission(cycleId, data),
    onSuccess: (saved, data) => {
      queryClient.setQueryData(KEYS.submission(cycleId, data.axis, data.evaluateeId), saved);
      queryClient.invalidateQueries({ queryKey: KEYS.tasks(cycleId) });
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.saveError"))),
  });
}

export function useSubmitAppraisalSubmission(cycleId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: (submissionId: string) => appraisalApi.submitSubmission(cycleId, submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appraisal", "me"] });
      toast.success(t("messages.submitted"));
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.submitError"))),
  });
}

export function useUploadAchievementFile(cycleId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: (file: File) => appraisalApi.uploadAchievementFile(cycleId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appraisal", "me", "submission", cycleId, "SELF"] });
      queryClient.invalidateQueries({ queryKey: KEYS.tasks(cycleId) });
      toast.success(t("messages.fileUploaded"));
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.uploadError"))),
  });
}

/** ينزّل مرفق الإنجازات عبر apiClient (الطلب يحتاج التوكن، فلا يكفي رابط مباشر). */
export function useDownloadAchievementFile() {
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: async ({ cycleId, employeeId }: { cycleId: string; employeeId: string }) => {
      const { blob, fileName } = await appraisalApi.downloadAchievementFile(cycleId, employeeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `achievements-${employeeId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.downloadError"))),
  });
}

// ─── HR: الإعداد ──────────────────────────────────────────────────────

export function useAppraisalDepartmentConfig() {
  return useQuery({ queryKey: KEYS.departmentConfig, queryFn: appraisalApi.getDepartmentConfig });
}

export function useUpdateAppraisalDepartmentConfig() {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: ({ departmentId, satisfactionSource }: { departmentId: string; satisfactionSource: SatisfactionSource }) =>
      appraisalApi.updateDepartmentConfig(departmentId, satisfactionSource),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.departmentConfig });
      toast.success(t("messages.saved"));
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.saveError"))),
  });
}

export function useAppraisalReadinessJobTitles() {
  return useQuery({ queryKey: KEYS.readiness, queryFn: appraisalApi.getReadinessJobTitles });
}

export function useSetAppraisalReadinessJobTitles() {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: (jobTitleIds: string[]) => appraisalApi.setReadinessJobTitles(jobTitleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.readiness });
      toast.success(t("messages.saved"));
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.saveError"))),
  });
}

export function useAppraisalSettings() {
  return useQuery({ queryKey: KEYS.settings, queryFn: appraisalApi.getSettings });
}

export function useUpdateAppraisalSettings() {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: (data: Partial<AppraisalSettings>) => appraisalApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.settings });
      toast.success(t("messages.saved"));
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.saveError"))),
  });
}

// ─── HR: الدورات ──────────────────────────────────────────────────────

export function useAppraisalCycles() {
  return useQuery({ queryKey: KEYS.cycles, queryFn: appraisalApi.getCycles });
}

function useCycleMutation<TVars>(fn: (vars: TVars) => Promise<unknown>, successKey: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      toast.success(t(successKey));
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.actionError"))),
  });
}

export const useCreateAppraisalCycle = () =>
  useCycleMutation((data: CreateCycleData) => appraisalApi.createCycle(data), "messages.saved");
export const useUpdateAppraisalCycle = () =>
  useCycleMutation(({ id, data }: { id: string; data: UpdateCycleData }) => appraisalApi.updateCycle(id, data), "messages.saved");
export const useOpenAppraisalCycle = () => useCycleMutation((id: string) => appraisalApi.openCycle(id), "messages.cycleOpened");
export const useCloseAppraisalCycle = () => useCycleMutation((id: string) => appraisalApi.closeCycle(id), "messages.cycleClosed");
export const useFinalizeAppraisalCycle = () =>
  useCycleMutation((id: string) => appraisalApi.finalizeCycle(id), "messages.cycleFinalized");

// ─── HR: المتابعة والنتائج ────────────────────────────────────────────

export function useAppraisalProgress(cycleId?: string) {
  return useQuery({
    queryKey: KEYS.progress(cycleId ?? ""),
    queryFn: () => appraisalApi.getProgress(cycleId!),
    enabled: !!cycleId,
  });
}

export function useComputeAppraisal() {
  const queryClient = useQueryClient();
  const t = useTranslations("appraisal");
  return useMutation({
    mutationFn: (cycleId: string) => appraisalApi.compute(cycleId),
    onSuccess: (_, cycleId) => {
      queryClient.invalidateQueries({ queryKey: ["appraisal", "cycles", cycleId] });
    },
    onError: (error) => toast.error(appraisalErrorMessage(error, t("messages.actionError"))),
  });
}

export function useAppraisalResults(cycleId?: string) {
  return useQuery({
    queryKey: KEYS.results(cycleId ?? ""),
    queryFn: () => appraisalApi.getResults(cycleId!),
    enabled: !!cycleId,
  });
}

export function useAppraisalEmployeeResult(cycleId?: string, employeeId?: string) {
  return useQuery({
    queryKey: KEYS.employeeResult(cycleId ?? "", employeeId ?? ""),
    queryFn: () => appraisalApi.getEmployeeResult(cycleId!, employeeId!),
    enabled: !!cycleId && !!employeeId,
  });
}
