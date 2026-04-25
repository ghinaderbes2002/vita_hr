import { apiClient } from "./client";

export type RecipientType = "TO" | "CC" | "BCC";
export type MailFolder = "INBOX" | "SENT" | "DRAFTS" | "ARCHIVE" | "TRASH";

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
  subject: string;
  body: string;
  threadRootId: string | null;
  parentMessageId: string | null;
  isDraft: boolean;
  deletedAt: string | null;
  recipients: MailRecipient[];
  attachments: MailAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface MailRecipientWithMessage extends MailRecipient {
  message: MailMessage;
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
}

export interface SendMailDto {
  subject: string;
  body: string;
  recipients: { userId: string; type: RecipientType }[];
  departmentIds?: string[];
  parentMessageId?: string;
}

export interface SaveDraftDto {
  subject?: string;
  body?: string;
  recipients?: { userId: string; type: RecipientType }[];
}

export const mailApi = {
  send: async (dto: SendMailDto): Promise<MailMessage> => {
    const res = await apiClient.post("/mail/send", dto);
    return res.data.data;
  },

  saveDraft: async (dto: SaveDraftDto): Promise<MailMessage> => {
    const res = await apiClient.post("/mail/draft", dto);
    return res.data.data;
  },

  reply: async (messageId: string, dto: SendMailDto): Promise<MailMessage> => {
    const res = await apiClient.post(`/mail/${messageId}/reply`, dto);
    return res.data.data;
  },

  replyAll: async (messageId: string, dto: SendMailDto): Promise<MailMessage> => {
    const res = await apiClient.post(`/mail/${messageId}/reply-all`, dto);
    return res.data.data;
  },

  getInbox: async (params?: MailQueryParams): Promise<MailListResponse> => {
    const res = await apiClient.get("/mail/inbox", { params });
    return res.data.data;
  },

  getSent: async (params?: MailQueryParams): Promise<SentListResponse> => {
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

  updateRead: async (messageIds: string[], isRead: boolean): Promise<{ updated: number }> => {
    const res = await apiClient.patch("/mail/read", { messageIds, isRead });
    return res.data.data;
  },

  updateStar: async (messageIds: string[], isStarred: boolean): Promise<{ updated: number }> => {
    const res = await apiClient.patch("/mail/star", { messageIds, isStarred });
    return res.data.data;
  },

  move: async (messageIds: string[], folder: MailFolder): Promise<{ moved: number }> => {
    const res = await apiClient.patch("/mail/move", { messageIds, folder });
    return res.data.data;
  },

  delete: async (messageId: string): Promise<{ deleted: boolean }> => {
    const res = await apiClient.delete(`/mail/${messageId}`);
    return res.data.data;
  },

  uploadAttachment: async (
    messageId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<MailAttachment> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post(`/mail/attachments/${messageId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return res.data.data;
  },
};
