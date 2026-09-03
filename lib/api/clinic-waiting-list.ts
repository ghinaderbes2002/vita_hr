import { apiClient } from "./client";

/** How the person found the clinic. */
export type WaitingArrivalMethod =
  | "SOCIAL_MEDIA" | "HOSPITAL" | "DOCTOR" | "ASSOCIATION" | "FRIEND" | "STAFF";

/** A new entry always starts as WAITING; the other two are set by editing. */
export type WaitingStatus = "WAITING" | "SCHEDULED" | "NOT_SCHEDULED";

export type WaitingGender = "MALE" | "FEMALE";

export interface WaitingListEntry {
  id: string;
  patientName: string;
  gender: WaitingGender;
  age?: number | null;
  arrivalMethod?: WaitingArrivalMethod | null;
  /** Free text — the API deliberately keeps no fixed list of services. */
  serviceType: string;
  contactNumber: string;
  /** 5 is the most urgent, 1 the least. */
  priority: number;
  notes?: string | null;
  status: WaitingStatus;
  /** Stamped by the server at creation; never sent by the client. */
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

/**
 * Fields the client owns. Everything else on the record — id, registrationDate,
 * the initial status, the audit stamps — is filled server-side, so sending them
 * is at best ignored.
 */
export interface CreateWaitingListDto {
  patientName: string;
  gender: WaitingGender;
  age?: number;
  arrivalMethod?: WaitingArrivalMethod;
  serviceType: string;
  contactNumber: string;
  priority: number;
  notes?: string;
}

/** Editing adds the one field creation doesn't accept. */
export interface UpdateWaitingListDto extends Partial<CreateWaitingListDto> {
  status?: WaitingStatus;
}

export interface WaitingListParams {
  page?: number;
  limit?: number;
  status?: WaitingStatus;
}

const BASE = "/appointments/waiting-list";

export const clinicWaitingListApi = {
  /** Ordered by the server: highest priority first, oldest registration within it. */
  list: async (params?: WaitingListParams) => {
    const { data } = await apiClient.get(BASE, { params });
    const d = data?.data ?? data;
    const total = d?.total ?? 0;
    const limit = d?.limit ?? params?.limit ?? 15;
    return {
      items: (d?.items ?? d?.data ?? (Array.isArray(d) ? d : [])) as WaitingListEntry[],
      total,
      totalPages: d?.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0),
    };
  },

  getById: async (id: string): Promise<WaitingListEntry> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data?.data ?? data;
  },

  create: async (dto: CreateWaitingListDto): Promise<WaitingListEntry> => {
    const { data } = await apiClient.post(BASE, dto);
    return data?.data ?? data;
  },

  update: async (id: string, dto: UpdateWaitingListDto): Promise<WaitingListEntry> => {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data?.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
};
