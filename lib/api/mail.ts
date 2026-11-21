import { apiClient } from "./client";

export type RecipientType = "TO" | "CC" | "BCC";
export type MailFolder = "INBOX" | "SENT" | "DRAFTS" | "ARCHIVE" | "TRASH";
/** Exact values the API accepts — anything else is a 400. */
export type MailImportance = "LOW" | "NORMAL" | "HIGH";
export type MailReplyType = "REPLY" | "REPLY_ALL" | "FORWARD";

export const MAIL_PERMISSIONS = {
  SEND:     "mail:send",
  READ_OWN: "mail:read_own",
  READ_ALL: "mail:read_all",
  DRAFT:    "mail:draft",
  UPDATE:   "mail:update",
  DELETE:   "mail:delete",
  MANAGE:   "mail:manage",
} as const;

export interface MailRecipient {
  id: string;
  messageId: string;
  recipientId: string;
  type: RecipientType;
  folder: MailFolder;
  isRead: boolean;
  readAt: string | null;
  isStarred: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipient?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    employeeNumber?: string;
  };
  employeeInfo?: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    employeeId: string;
  };
}

export interface MailAttachment {
  id: string;
  messageId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface EditHistory {
  editedAt: string;
  editedByUserId: string;
  editedByName: string;
  previousSubject: string;
  previousBody: string;
}

export interface EditMailDto {
  subject?: string;
  body?: string;
}

export interface MailMessage {
  id: string;
  senderId: string;
  sender?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    employeeNumber?: string;
  };
  senderInfo?: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
    employeeId: string;
  };
  subject: string;
  body: string;
  threadRootId: string | null;
  parentMessageId: string | null;
  isDraft: boolean;
  importance?: MailImportance;
  /** Plain text, first ~150 chars, images stripped — for the list line. */
  preview?: string;
  /** Drafts only: what the draft answers, and how. */
  replyType?: MailReplyType | null;
  departmentIds?: string[];
  deletedAt: string | null;
  recipients: MailRecipient[];
  attachments: MailAttachment[];
  editHistory?: EditHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface MailRecipientWithMessage extends MailRecipient {
  message: MailMessage;
  preview?: string;
}

export type SentMessage = MailMessage;

export interface MailListResponse {
  items: MailRecipientWithMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface SentListResponse {
  items: SentMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface MailQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  archiveFolderId?: string;
  /** Inbox / sent / archive / trash only. Read and starred are per user. */
  isRead?: boolean;
  hasAttachments?: boolean;
  isStarred?: boolean;
  senderId?: string;
}

export interface SendMailDto {
  subject: string;
  body?: string;
  recipients: { employeeId: string; type: RecipientType }[];
  departmentIds?: string[];
  parentMessageId?: string;
  importance?: MailImportance;
  /** معرّفات مرفقات رُفعت مسبقاً عبر uploadAttachment وتُربط بالرسالة عند الإرسال */
  attachmentIds?: string[];
}

/**
 * Every field optional. On PATCH a field left out is kept as is — send
 * `recipients: []` to clear them. Attachments are only ever added this way.
 */
export interface SaveDraftDto {
  subject?: string;
  body?: string;
  recipients?: { employeeId: string; type: RecipientType }[];
  departmentIds?: string[];
  importance?: MailImportance;
  attachmentIds?: string[];
  parentMessageId?: string;
  replyType?: MailReplyType;
}

export interface ForwardMailDto {
  recipients: { employeeId: string; type: RecipientType }[];
  subject?: string;
  body?: string;
  attachmentIds?: string[];
}

export interface ArchiveFolder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export const mailApi = {
  /**
   * The attachment's bytes. The route needs the bearer token, which a plain
   * <a href> or window.open cannot carry — so the caller fetches the blob
   * and opens that instead of linking straight at the API.
   */
  getAttachmentFile: async (attachmentId: string): Promise<Blob> => {
    const res = await apiClient.get(`/mail/attachments/${attachmentId}/file`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  send: async (dto: SendMailDto): Promise<MailMessage> => {
    const res = await apiClient.post("/mail/send", dto);
    return res.data.data;
  },

  saveDraft: async (dto: SaveDraftDto): Promise<MailMessage> => {
    const res = await apiClient.post("/mail/draft", dto);
    return res.data.data;
  },

  /** The whole draft, recipients with names and attachments — ready to edit. */
  getDraft: async (id: string): Promise<MailMessage> => {
    const res = await apiClient.get(`/mail/draft/${id}`);
    return res.data?.data ?? res.data;
  },

  /** Always updates the same draft (autosave-safe); returns a fresh updatedAt. */
  updateDraft: async (id: string, dto: SaveDraftDto): Promise<MailMessage> => {
    const res = await apiClient.patch(`/mail/draft/${id}`, dto);
    return res.data?.data ?? res.data;
  },

  /** The draft itself becomes the sent message. A second send is DRAFT_NOT_FOUND. */
  sendDraft: async (id: string): Promise<MailMessage> => {
    const res = await apiClient.post(`/mail/draft/${id}/send`);
    return res.data?.data ?? res.data;
  },

  deleteDraft: async (id: string): Promise<void> => {
    await apiClient.delete(`/mail/draft/${id}`);
  },

  reply: async (messageId: string, dto: SendMailDto): Promise<MailMessage> => {
    const res = await apiClient.post(`/mail/${messageId}/reply`, dto);
    return res.data.data;
  },

  replyAll: async (messageId: string, dto: SendMailDto): Promise<MailMessage> => {
    const res = await apiClient.post(`/mail/${messageId}/reply-all`, dto);
    return res.data.data;
  },

  forward: async (messageId: string, dto: ForwardMailDto): Promise<MailMessage> => {
    const res = await apiClient.post(`/mail/${messageId}/forward`, dto);
    return res.data.data;
  },

  getInbox: async (params?: MailQueryParams): Promise<MailListResponse> => {
    const res = await apiClient.get("/mail/inbox", { params });
    return res.data.data;
  },

  getSent: async (params?: MailQueryParams): Promise<MailListResponse> => {
    const res = await apiClient.get("/mail/sent", { params });
    return res.data.data;
  },

  getDrafts: async (params?: MailQueryParams): Promise<SentListResponse> => {
    const res = await apiClient.get("/mail/drafts", { params });
    return res.data.data;
  },

  getArchive: async (params?: MailQueryParams): Promise<MailListResponse> => {
    const res = await apiClient.get("/mail/archive", { params });
    return res.data.data;
  },

  getTrash: async (params?: MailQueryParams): Promise<MailListResponse> => {
    const res = await apiClient.get("/mail/trash", { params });
    return res.data.data;
  },

  getById: async (messageId: string): Promise<MailRecipientWithMessage | MailMessage> => {
    const res = await apiClient.get(`/mail/${messageId}`);
    return res.data.data;
  },

  getThread: async (messageId: string): Promise<MailMessage[]> => {
    const res = await apiClient.get(`/mail/thread/${messageId}`);
    const d = res.data?.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },

  updateRead: async (messageIds: string[], isRead: boolean): Promise<{ updated: number }> => {
    const res = await apiClient.patch("/mail/read", { messageIds, isRead });
    return res.data.data;
  },

  updateStar: async (messageIds: string[], isStarred: boolean): Promise<{ updated: number }> => {
    const res = await apiClient.patch("/mail/star", { messageIds, isStarred });
    return res.data.data;
  },

  move: async (messageIds: string[], folder: MailFolder, archiveFolderId?: string): Promise<{ moved: number }> => {
    const res = await apiClient.patch("/mail/move", {
      messageIds,
      folder,
      ...(archiveFolderId ? { archiveFolderId } : {}),
    });
    return res.data.data;
  },

  edit: async (messageId: string, dto: EditMailDto): Promise<MailMessage> => {
    const res = await apiClient.patch(`/mail/${messageId}/edit`, dto);
    return res.data.data;
  },

  delete: async (messageId: string): Promise<{ deleted: boolean }> => {
    const res = await apiClient.delete(`/mail/${messageId}`);
    return res.data.data;
  },

  // Archive Folders
  getArchiveFolders: async (): Promise<ArchiveFolder[]> => {
    const res = await apiClient.get("/mail/archive-folders");
    const d = res.data?.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },

  createArchiveFolder: async (name: string): Promise<ArchiveFolder> => {
    const res = await apiClient.post("/mail/archive-folders", { name });
    return res.data?.data ?? res.data;
  },

  deleteArchiveFolder: async (id: string): Promise<void> => {
    await apiClient.delete(`/mail/archive-folders/${id}`);
  },

  /**
   * يرفع الملف مستقلاً عن أي رسالة ويرجّع معرّفه. يُمرَّر المعرّف بعدها في
   * `attachmentIds` عند الإرسال. المرفق غير المرتبط برسالة يُحذف تلقائياً
   * بعد 24 ساعة من طرف الباك.
   */
  uploadAttachment: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<MailAttachment> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/mail/attachments", formData, {
      headers: { "Content-Type": undefined },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return res.data.data;
  },
};

/** The API's own message for a failed mail call (e.g. MAIL_BODY_TOO_LARGE), else a fallback. */
export function mailErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
  return data?.error?.message || data?.message || fallback;
}

export function mailErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { error?: { code?: string }; code?: string } } })?.response?.data;
  return data?.error?.code || data?.code;
}
