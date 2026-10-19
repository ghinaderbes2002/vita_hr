import { apiClient } from "./client";
import { toUploadableImage } from "@/lib/utils/heic";

/** How the person found the clinic — the same set the waiting list uses. */
export type PotentialClientArrivalMethod =
  | "SOCIAL_MEDIA" | "HOSPITAL" | "DOCTOR" | "ASSOCIATION" | "FRIEND" | "STAFF";

export type PotentialClientGender = "MALE" | "FEMALE";

/**
 * Someone who asked about a service but is not a patient or on the waiting
 * list yet. Kept apart from the waiting list on purpose: no priority, no status.
 */
export interface PotentialClient {
  id: string;
  patientName: string;
  gender: PotentialClientGender;
  age?: number | null;
  /** Free text — where the person lives. */
  residence?: string | null;
  arrivalMethod?: PotentialClientArrivalMethod | null;
  /** Free text — what the person was interested in. */
  interestedService: string;
  contactNumber: string;
  notes?: string | null;
  /** Did the person come to the centre? null = not recorded. */
  visitedCenter?: boolean | null;
  /** Did the person actually pay for a service? Independent of visitedCenter; null = not recorded. */
  paidVisit?: boolean | null;
  /** Stamped by the server at creation; never sent by the client. */
  registrationDate: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
}

export interface CreatePotentialClientDto {
  patientName: string;
  gender: PotentialClientGender;
  age?: number;
  residence?: string;
  arrivalMethod?: PotentialClientArrivalMethod;
  interestedService: string;
  contactNumber: string;
  notes?: string;
  /** null resets the answer to "not recorded". */
  visitedCenter?: boolean | null;
  paidVisit?: boolean | null;
}

/** PUT takes only the fields that changed. */
export type UpdatePotentialClientDto = Partial<CreatePotentialClientDto>;

/** A photo or PDF kept on a potential client's record. */
export interface PotentialClientAttachment {
  id: string;
  potentialClientId: string;
  /** A path on the server's disk — never a link. The file comes from `downloadAttachment`. */
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string | null;
}

/** What the server accepts on upload; anything else comes back as 400. */
export const POTENTIAL_CLIENT_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const POTENTIAL_CLIENT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export interface PotentialClientFilters {
  /** Exact match on the service text. */
  interestedService?: string;
  /** Partial, case-insensitive match on name, contact number or service. */
  search?: string;
  /** Registration date range, inclusive, as YYYY-MM-DD. */
  dateFrom?: string;
  dateTo?: string;
  visitedCenter?: boolean;
  paidVisit?: boolean;
}

export interface PotentialClientParams extends PotentialClientFilters {
  page?: number;
  limit?: number;
}

const BASE = "/appointments/potential-clients";

export const clinicPotentialClientsApi = {
  /** Ordered by the server: registration date, oldest first. */
  list: async (params?: PotentialClientParams) => {
    const { data } = await apiClient.get(BASE, { params });
    const d = data?.data ?? data;
    const total = d?.total ?? 0;
    const limit = d?.limit ?? params?.limit ?? 15;
    return {
      items: (d?.items ?? d?.data ?? (Array.isArray(d) ? d : [])) as PotentialClient[],
      total,
      totalPages: d?.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0),
    };
  },

  /** The distinct services on record, sorted by the server. */
  getServices: async (): Promise<string[]> => {
    const { data } = await apiClient.get(`${BASE}/services`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : [];
  },

  /** The list as an .xlsx file — narrowed by the same filters as the list. */
  exportXlsx: async (params?: PotentialClientFilters): Promise<Blob> => {
    const response = await apiClient.get(`${BASE}/export-xlsx`, { params, responseType: "blob" });
    return response.data;
  },

  getById: async (id: string): Promise<PotentialClient> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data?.data ?? data;
  },

  create: async (dto: CreatePotentialClientDto): Promise<PotentialClient> => {
    const { data } = await apiClient.post(BASE, dto);
    return data?.data ?? data;
  },

  update: async (id: string, dto: UpdatePotentialClientDto): Promise<PotentialClient> => {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data?.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  /** Newest first, as the server orders them. */
  listAttachments: async (id: string): Promise<PotentialClientAttachment[]> => {
    const { data } = await apiClient.get(`${BASE}/${id}/attachments`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : [];
  },

  uploadAttachment: async (id: string, file: File): Promise<PotentialClientAttachment> => {
    const form = new FormData();
    form.append("file", await toUploadableImage(file));
    const { data } = await apiClient.post(`${BASE}/${id}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data ?? data;
  },

  /** The file itself. An <img src> cannot carry the token, so callers show it through an object URL. */
  downloadAttachment: async (id: string, attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(`${BASE}/${id}/attachments/${attachmentId}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  removeAttachment: async (id: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}/attachments/${attachmentId}`);
  },
};
