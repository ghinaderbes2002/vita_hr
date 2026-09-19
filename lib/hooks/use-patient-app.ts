import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  patientAppApi,
  AccountListParams,
  AssignExerciseDto,
  CreatePatientAppAccountDto,
  ExerciseDto,
  ExerciseParams,
  RatingParams,
  TaxonomyDto,
  TaxonomyKind,
  TaxonomyParams,
  UpdateAssignmentDto,
  UpdatePatientAppAccountDto,
} from "@/lib/api/patient-app";

const KEY = "patient-app";
export const PATIENT_APP_CHAT_KEY = [KEY, "chat-conversations"];

/** The backend sends its own readable message; the fallback covers network errors. */
const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

// ── Accounts ────────────────────────────────────────────────

export function usePatientAppAccounts(params?: AccountListParams) {
  return useQuery({
    queryKey: [KEY, "accounts", params ?? {}],
    queryFn: () => patientAppApi.accounts.list(params),
  });
}

/** The list and the per-patient lookup both go stale after any account change. */
function useInvalidateAccounts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [KEY, "accounts"] });
    qc.invalidateQueries({ queryKey: [KEY, "account"] });
  };
}

export function usePatientAppAccount(erpPatientId?: string) {
  return useQuery({
    queryKey: [KEY, "account", erpPatientId],
    queryFn: () => patientAppApi.accounts.byPatient(erpPatientId!),
    enabled: !!erpPatientId,
  });
}

export function useCreatePatientAppAccount() {
  const t = useTranslations("patientApp.toasts");
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (dto: CreatePatientAppAccountDto) => patientAppApi.accounts.create(dto),
    onSuccess: () => {
      invalidate();
      toast.success(t("accountCreated"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("accountCreateFailed"))),
  });
}

export function useUpdatePatientAppAccount() {
  const t = useTranslations("patientApp.toasts");
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePatientAppAccountDto }) =>
      patientAppApi.accounts.update(id, dto),
    onSuccess: (_data, { dto }) => {
      invalidate();
      toast.success(dto.password ? t("passwordChanged") : t("accountUpdated"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("accountUpdateFailed"))),
  });
}

// ── Taxonomy ────────────────────────────────────────────────

export function useTaxonomy(kind: TaxonomyKind, params?: TaxonomyParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, "taxonomy", kind, params ?? {}],
    queryFn: () => patientAppApi.taxonomy.list(kind, params),
    enabled,
  });
}

export function useSaveTaxonomy(kind: TaxonomyKind) {
  const t = useTranslations("patientApp.toasts");
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id?: string; dto: TaxonomyDto }) =>
      id ? patientAppApi.taxonomy.update(kind, id, dto) : patientAppApi.taxonomy.create(kind, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, "taxonomy"] });
      toast.success(id ? t("saved") : t("added"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("saveFailed"))),
  });
}

// ── Exercise library ────────────────────────────────────────

export function useExercises(params?: ExerciseParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, "exercises", params ?? {}],
    queryFn: () => patientAppApi.exercises.list(params),
    enabled,
  });
}

export function useSaveExercise() {
  const t = useTranslations("patientApp.toasts");
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id?: string; dto: ExerciseDto }) =>
      id ? patientAppApi.exercises.update(id, dto) : patientAppApi.exercises.create(dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, "exercises"] });
      toast.success(id ? t("exerciseSaved") : t("exerciseAdded"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("exerciseSaveFailed"))),
  });
}

export function useUploadExerciseMedia() {
  const t = useTranslations("patientApp.toasts");
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: string; file: File; onProgress?: (p: number) => void }) =>
      patientAppApi.exercises.uploadMedia(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "exercises"] });
      toast.success(t("mediaUploaded"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("mediaUploadFailed"))),
  });
}

// ── Session programs ────────────────────────────────────────

export function usePatientSessions(erpPatientId?: string) {
  return useQuery({
    queryKey: [KEY, "patient-sessions", erpPatientId],
    queryFn: () => patientAppApi.programs.patientSessions(erpPatientId!),
    enabled: !!erpPatientId,
  });
}

export function useSessionExercises(erpSessionId?: string | null) {
  return useQuery({
    queryKey: [KEY, "session-exercises", erpSessionId],
    queryFn: () => patientAppApi.programs.sessionExercises(erpSessionId!),
    enabled: !!erpSessionId,
  });
}

export function usePatientExecutions(erpPatientId?: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, "executions", erpPatientId],
    queryFn: () => patientAppApi.programs.patientExecutions(erpPatientId!),
    enabled: !!erpPatientId && enabled,
  });
}

/** Anything that touches an assignment can change the list and the execution log. */
function useInvalidatePrograms() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [KEY, "session-exercises"] });
    qc.invalidateQueries({ queryKey: [KEY, "executions"] });
  };
}

export function useAssignExercise() {
  const t = useTranslations("patientApp.toasts");
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: ({ sessionId, dto }: { sessionId: string; dto: AssignExerciseDto }) =>
      patientAppApi.programs.assign(sessionId, dto),
    onSuccess: () => {
      invalidate();
      toast.success(t("exerciseAssigned"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("assignFailed"))),
  });
}

export function useUpdateAssignment() {
  const t = useTranslations("patientApp.toasts");
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssignmentDto }) =>
      patientAppApi.programs.updateAssignment(id, dto),
    onSuccess: () => {
      invalidate();
      toast.success(t("assignmentUpdated"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("assignmentUpdateFailed"))),
  });
}

export function useReorderAssignments() {
  const t = useTranslations("patientApp.toasts");
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: ({ sessionId, items }: { sessionId: string; items: { id: string; sortOrder: number }[] }) =>
      patientAppApi.programs.reorder(sessionId, items),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(errorMessage(e, t("reorderFailed"))),
  });
}

export function useCancelAssignment() {
  const t = useTranslations("patientApp.toasts");
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      patientAppApi.programs.cancelAssignment(id, reason),
    onSuccess: () => {
      invalidate();
      toast.success(t("assignmentCancelled"));
    },
    onError: (e: any) => toast.error(errorMessage(e, t("cancelFailed"))),
  });
}

export function usePatientSessionsProgress(erpPatientId?: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, "sessions-progress", erpPatientId],
    queryFn: () => patientAppApi.sessionsProgress(erpPatientId!),
    enabled: !!erpPatientId && enabled,
  });
}

// ── Chat ────────────────────────────────────────────────────

export function useChatConversations(enabled = true) {
  return useQuery({
    queryKey: PATIENT_APP_CHAT_KEY,
    queryFn: () => patientAppApi.chat.conversations(),
    // The list is the therapist's own patients, so it is not requested for
    // accounts that are not responsible for any (an admin).
    enabled,
    // Keeps unread counts moving while the list is on screen; the open thread
    // polls its own messages much faster.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useSendChatMessage() {
  const t = useTranslations("patientApp.toasts");
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageText }: { conversationId: string; messageText: string }) =>
      patientAppApi.chat.send(conversationId, messageText),
    onSuccess: () => qc.invalidateQueries({ queryKey: PATIENT_APP_CHAT_KEY }),
    onError: (e: any) => toast.error(errorMessage(e, t("sendFailed"))),
  });
}

// ── Ratings ─────────────────────────────────────────────────

export function useTherapistRatings(params?: RatingParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, "ratings", params ?? {}],
    queryFn: () => patientAppApi.ratings.list(params),
    enabled,
  });
}
