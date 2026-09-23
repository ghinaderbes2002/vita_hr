import { apiClient } from "./client";

/**
 * خدمة تطبيق المريض (apps/patient-app) — جهة الداشبورد فقط.
 * مرجع: PATIENT_APP_FRONTEND_INTEGRATION_GUIDE.md §5 و§6 و§8.
 * مسارات `/me/*` تخص تطبيق الموبايل وتعمل بتوكن المريض، فلا مكان لها هنا.
 */

const BASE = "/patient-app";

/** Every response is wrapped as `{ success, data, meta }`. */
function unwrap<T>(res: { data: any }): T {
  return res.data?.data ?? res.data;
}

function unwrapList<T>(res: { data: any }): T[] {
  const d = unwrap<any>(res);
  return Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
}

// ── Accounts ────────────────────────────────────────────────

export type PatientAppAccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export interface PatientAppAccount {
  id: string;
  erpPatientId: string;
  username: string;
  status: PatientAppAccountStatus;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Row of the accounts list. `patient` is the ERP record joined in so the list can
 * show a name without a request per row.
 */
export interface PatientAppAccountListItem extends PatientAppAccount {
  patient?: { firstName: string; lastName: string; phone?: string | null; patientNumber?: string | null } | null;
}

export interface AccountListParams {
  page?: number;
  limit?: number;
  /** Patient name, phone, patient number or username. */
  search?: string;
  status?: PatientAppAccountStatus;
}

export interface CreatePatientAppAccountDto {
  erpPatientId: string;
  username: string;
  password: string;
}

export interface UpdatePatientAppAccountDto {
  status?: PatientAppAccountStatus;
  password?: string;
}

// ── Taxonomy ────────────────────────────────────────────────

export type TaxonomyKind = "body-regions" | "target-regions" | "sub-target-regions" | "goals";

export interface TaxonomyItem {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number | null;
  /** target-regions only. */
  bodyRegionId?: string | null;
  /** sub-target-regions only. */
  targetRegionId?: string | null;
}

export interface TaxonomyDto {
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
  bodyRegionId?: string;
  targetRegionId?: string;
}

export interface TaxonomyParams {
  bodyRegionId?: string;
  targetRegionId?: string;
}

/** Taxonomy and exercise records carry both languages; pick the viewer's, falling back to the other. */
export const localizedName = (
  item: { nameAr: string; nameEn: string } | null | undefined,
  locale: string,
) => (!item ? "" : locale === "ar" ? item.nameAr || item.nameEn : item.nameEn || item.nameAr);

// ── Exercise library ────────────────────────────────────────

export type ExerciseMediaType = "VIDEO" | "IMAGE";

export interface Exercise {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  /** Seeded regions use fixed text ids like `seed-body-region-knee`, not UUIDs. */
  bodyRegionId: string;
  targetRegionId?: string | null;
  subTargetRegionId?: string | null;
  bodyRegion?: TaxonomyItem | null;
  targetRegion?: TaxonomyItem | null;
  subTargetRegion?: TaxonomyItem | null;
  mediaType?: ExerciseMediaType | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  executionMethodAr?: string | null;
  executionMethodEn?: string | null;
  warningsAr?: string | null;
  warningsEn?: string | null;
  commonMistakesAr?: string | null;
  commonMistakesEn?: string | null;
  defaultDurationSeconds?: number | null;
  // Defaults carried by the exercise itself; an assignment that leaves a field
  // empty is filled in with these server-side.
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultHoldSeconds?: number | null;
  defaultRestSeconds?: number | null;
  goalIds?: string[];
  /** Some responses carry the goal join rows instead of plain ids. */
  goals?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseDto {
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  bodyRegionId: string;
  targetRegionId: string | null;
  subTargetRegionId: string | null;
  mediaType: ExerciseMediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  executionMethodAr: string | null;
  executionMethodEn: string | null;
  warningsAr: string | null;
  warningsEn: string | null;
  commonMistakesAr: string | null;
  commonMistakesEn: string | null;
  defaultDurationSeconds: number | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultHoldSeconds: number | null;
  defaultRestSeconds: number | null;
  goalIds: string[];
}

export interface ExerciseParams {
  bodyRegionId?: string;
  targetRegionId?: string;
  subTargetRegionId?: string;
  goalId?: string;
  search?: string;
}

export function exerciseGoalIds(ex: Exercise): string[] {
  if (ex.goalIds) return ex.goalIds;
  return (ex.goals ?? [])
    .map((g: any) => g?.goalId ?? g?.goal?.id ?? g?.id)
    .filter(Boolean);
}

export const MEDIA_ACCEPT =
  "video/mp4,video/quicktime,video/webm,video/x-msvideo,image/jpeg,image/png";
const MEDIA_TYPES = MEDIA_ACCEPT.split(",");
export const MAX_MEDIA_BYTES = 200 * 1024 * 1024;

/**
 * Why the server would refuse this file, or null when it's fine. The value is a
 * key under `patientApp.media` in the translation files.
 */
export function mediaFileProblem(file: File): "unsupportedType" | "tooLarge" | null {
  if (!MEDIA_TYPES.includes(file.type)) return "unsupportedType";
  if (file.size > MAX_MEDIA_BYTES) return "tooLarge";
  return null;
}

/**
 * Media URLs come back path-only (`/api/v1/patient-app/public/...`) and need no
 * auth header, so they go straight into `src` once the API host is in front.
 * The path never changes on re-upload, hence the `updatedAt` cache-buster.
 */
export function resolveMediaUrl(url?: string | null, version?: string | null): string | null {
  if (!url) return null;
  let full = url;
  if (!/^https?:\/\//i.test(url)) {
    try {
      full = new URL(url, apiClient.defaults.baseURL).toString();
    } catch {
      // Relative API base (served behind the same origin) — the path works as is.
    }
  }
  return version ? `${full}${full.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}` : full;
}

// ── Session programs ────────────────────────────────────────

/** A physio session read live from the ERP. */
export interface ErpSession {
  id: string;
  caseId?: string | null;
  sessionNumber?: number | null;
  sessionDate?: string | null;
  /** The patient can rate the session only once this is true. */
  attendanceConfirmed?: boolean;
  physiotherapistId?: string | null;
  appointmentId?: string | null;
}

export interface SessionProgress {
  session: {
    id: string;
    sessionNumber?: number | null;
    sessionDate?: string | null;
    attendanceConfirmed?: boolean;
  };
  totalExercises: number;
  completed: number;
  skipped: number;
  inProgress: number;
  notStarted: number;
  /** Every active exercise of the session is done — no need to add the numbers up. */
  allCompleted: boolean;
}

export type AssignmentStatus = "ACTIVE" | "CANCELLED";

export interface Assignment {
  id: string;
  erpSessionId: string;
  exerciseId: string;
  exercise?: Exercise | null;
  sortOrder?: number | null;
  durationSeconds?: number | null;
  sets?: number | null;
  reps?: number | null;
  holdSeconds?: number | null;
  restSeconds?: number | null;
  /** الرقمان الاختياريان بجانب frequencyText النصي. */
  timesPerDay?: number | null;
  daysPerWeek?: number | null;
  frequencyTextAr?: string | null;
  frequencyTextEn?: string | null;
  customInstructionAr?: string | null;
  customInstructionEn?: string | null;
  /** Cancelled assignments stay listed — they are never deleted. */
  status: AssignmentStatus | string;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
}

export interface AssignExerciseDto {
  exerciseId: string;
  sortOrder?: number;
  durationSeconds?: number | null;
  sets?: number | null;
  reps?: number | null;
  holdSeconds?: number | null;
  restSeconds?: number | null;
  timesPerDay?: number | null;
  daysPerWeek?: number | null;
  frequencyTextAr?: string | null;
  frequencyTextEn?: string | null;
  customInstructionAr?: string | null;
  customInstructionEn?: string | null;
}

export type UpdateAssignmentDto = Omit<AssignExerciseDto, "exerciseId" | "sortOrder">;

export interface Execution {
  id: string;
  assignmentId: string;
  status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | string;
  startedAt?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  completionNote?: string | null;
  skipReasonId?: string | null;
  skipReason?: { nameAr?: string; labelAr?: string; textAr?: string } | null;
  skipReasonText?: string | null;
  erpSessionId?: string | null;
  assignment?: (Partial<Assignment> & { exercise?: Exercise | null }) | null;
  createdAt?: string;
}

// ── Chat ────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderType: "PATIENT" | "THERAPIST" | string;
  senderId?: string | null;
  messageText: string;
  readAt?: string | null;
  /** وقت الرسالة الوحيد في المخطّط — لا يوجد createdAt على الرسائل. */
  sentAt: string;
}

export interface ChatConversation {
  id: string;
  erpPatientId: string;
  erpTherapistId?: string | null;
  status?: string | null;
  patientName?: string | null;
  lastMessage?: ChatMessage | null;
  lastMessageAt?: string | null;
  unreadCount?: number | null;
  createdAt?: string;
}

/** وقت الرسالة (sentAt)، أو "" حين لا تكون هناك رسالة أصلاً. */
export const messageTime = (m?: Pick<ChatMessage, "sentAt"> | null) => m?.sentAt ?? "";

export const isFromPatient = (m: Pick<ChatMessage, "senderType">) =>
  String(m.senderType ?? "").toUpperCase() === "PATIENT";

// ── Ratings (confidential) ──────────────────────────────────

export interface TherapistRating {
  id: string;
  erpSessionId: string;
  erpPatientId: string;
  erpTherapistId: string;
  score: number;
  privateNote?: string | null;
  createdAt: string;
}

export interface RatingParams {
  erpTherapistId?: string;
  erpPatientId?: string;
}

// ── API ─────────────────────────────────────────────────────

export const patientAppApi = {
  accounts: {
    /** Accounts with the ERP patient joined in (`patient`); `limit` is capped at 100 server-side. */
    list: async (params?: AccountListParams) => {
      const d = unwrap<any>(await apiClient.get(`${BASE}/accounts`, { params }));
      const items: PatientAppAccountListItem[] = Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
      const total = d?.total ?? items.length;
      const limit = d?.limit ?? params?.limit ?? 15;
      return {
        items,
        total,
        totalPages: d?.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0),
      };
    },
    /** Null when the patient has no app account yet. */
    byPatient: async (erpPatientId: string): Promise<PatientAppAccount | null> => {
      try {
        return unwrap<PatientAppAccount>(
          await apiClient.get(`${BASE}/accounts/by-patient/${erpPatientId}`),
        ) ?? null;
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
    create: async (dto: CreatePatientAppAccountDto) =>
      unwrap<PatientAppAccount>(await apiClient.post(`${BASE}/accounts`, dto)),
    update: async (id: string, dto: UpdatePatientAppAccountDto) =>
      unwrap<PatientAppAccount>(await apiClient.patch(`${BASE}/accounts/${id}`, dto)),
  },

  taxonomy: {
    list: async (kind: TaxonomyKind, params?: TaxonomyParams) =>
      unwrapList<TaxonomyItem>(await apiClient.get(`${BASE}/taxonomy/${kind}`, { params })),
    create: async (kind: TaxonomyKind, dto: TaxonomyDto) =>
      unwrap<TaxonomyItem>(await apiClient.post(`${BASE}/taxonomy/${kind}`, dto)),
    update: async (kind: TaxonomyKind, id: string, dto: TaxonomyDto) =>
      unwrap<TaxonomyItem>(await apiClient.put(`${BASE}/taxonomy/${kind}/${id}`, dto)),
  },

  exercises: {
    list: async (params?: ExerciseParams) =>
      unwrapList<Exercise>(await apiClient.get(`${BASE}/exercises`, { params })),
    getById: async (id: string) =>
      unwrap<Exercise>(await apiClient.get(`${BASE}/exercises/${id}`)),
    create: async (dto: ExerciseDto) =>
      unwrap<Exercise>(await apiClient.post(`${BASE}/exercises`, dto)),
    update: async (id: string, dto: ExerciseDto) =>
      unwrap<Exercise>(await apiClient.put(`${BASE}/exercises/${id}`, dto)),
    uploadMedia: async (id: string, file: File, onProgress?: (percent: number) => void) => {
      const form = new FormData();
      form.append("file", file);
      return unwrap<Exercise>(
        await apiClient.post(`${BASE}/exercises/${id}/media`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
          },
        }),
      );
    },
  },

  programs: {
    patientSessions: async (erpPatientId: string) =>
      unwrapList<ErpSession>(await apiClient.get(`${BASE}/patients/${erpPatientId}/sessions`)),
    sessionExercises: async (erpSessionId: string) =>
      unwrapList<Assignment>(await apiClient.get(`${BASE}/sessions/${erpSessionId}/exercises`)),
    assign: async (erpSessionId: string, dto: AssignExerciseDto) =>
      unwrap<Assignment>(await apiClient.post(`${BASE}/sessions/${erpSessionId}/exercises`, dto)),
    reorder: async (erpSessionId: string, items: { id: string; sortOrder: number }[]) =>
      unwrap<Assignment[]>(
        await apiClient.patch(`${BASE}/sessions/${erpSessionId}/exercises/reorder`, { items }),
      ),
    updateAssignment: async (id: string, dto: UpdateAssignmentDto) =>
      unwrap<Assignment>(await apiClient.patch(`${BASE}/assignments/${id}`, dto)),
    cancelAssignment: async (id: string, reason?: string) =>
      unwrap<Assignment>(
        await apiClient.post(`${BASE}/assignments/${id}/cancel`, reason ? { reason } : {}),
      ),
    patientExecutions: async (erpPatientId: string) =>
      unwrapList<Execution>(await apiClient.get(`${BASE}/patients/${erpPatientId}/executions`)),
  },

  /** Per-session exercise progress for one patient, for the therapist's view. */
  sessionsProgress: async (erpPatientId: string) =>
    unwrapList<SessionProgress>(
      await apiClient.get(`${BASE}/patients/${erpPatientId}/sessions-progress`),
    ),

  chat: {
    conversations: async () =>
      unwrapList<ChatConversation>(await apiClient.get(`${BASE}/chat/conversations`)),
    /** With `after`, only messages newer than that timestamp — used for polling. */
    messages: async (conversationId: string, after?: string) =>
      unwrapList<ChatMessage>(
        await apiClient.get(`${BASE}/chat/conversations/${conversationId}/messages`, {
          params: after ? { after } : undefined,
        }),
      ),
    send: async (conversationId: string, messageText: string) =>
      unwrap<ChatMessage>(
        await apiClient.post(`${BASE}/chat/conversations/${conversationId}/messages`, { messageText }),
      ),
    markRead: async (conversationId: string) => {
      await apiClient.post(`${BASE}/chat/conversations/${conversationId}/read`);
    },
  },

  ratings: {
    /** Every call is written to the audit log server-side. */
    list: async (params?: RatingParams) =>
      unwrapList<TherapistRating>(await apiClient.get(`${BASE}/admin/ratings`, { params })),
  },
};
