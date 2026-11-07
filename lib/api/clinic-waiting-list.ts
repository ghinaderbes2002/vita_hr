import { apiClient } from "./client";
import type { AppointmentType } from "./clinic-appointments";

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
  /** The service wanted, as one of the appointment types. Missing on older entries. */
  appointmentType?: AppointmentType | null;
  /** Free text from before appointmentType existed — kept only for older entries. */
  serviceType?: string | null;
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
  /** What new entries send. */
  appointmentType?: AppointmentType;
  /** Legacy; new entries leave it out. */
  serviceType?: string;
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
  appointmentType?: AppointmentType;
  /** Partial, case-insensitive match on name, contact number or service — over the whole list. */
  search?: string;
}

/** What narrows the export: the same filters the list screen shows. */
export type WaitingListExportFilters = Pick<WaitingListParams, "status" | "search" | "appointmentType">;

/**
 * An existing appointment that may be this entry's booking. Matching is by
 * patient number or normalised name, so a candidate is a suggestion to confirm,
 * never something to link without asking.
 */
export interface WaitingListAppointmentMatch {
  id: string;
  patientName: string;
  date: string;
  startTime: string;
  appointmentType: AppointmentType;
  practitioner?: string | null;
  /** Same type as the entry. The server lists these first, then by nearest date. */
  sameType: boolean;
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

  /** The list as an .xlsx file, narrowed by the same status and search as the screen. */
  exportXlsx: async (filters?: WaitingListExportFilters): Promise<Blob> => {
    const response = await apiClient.get(`${BASE}/export-xlsx`, {
      params: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.appointmentType ? { appointmentType: filters.appointmentType } : {}),
      },
      responseType: "blob",
    });
    return response.data;
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

  /** Already ordered by the server: same type first, then nearest date. */
  appointmentMatches: async (id: string): Promise<WaitingListAppointmentMatch[]> => {
    const { data } = await apiClient.get(`${BASE}/${id}/appointment-matches`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  /**
   * Links the entry to an existing appointment and turns it SCHEDULED. The
   * server refuses (400) a cancelled appointment or one linked to another entry.
   */
  linkAppointment: async (id: string, appointmentId: string): Promise<WaitingListEntry> => {
    const { data } = await apiClient.post(`${BASE}/${id}/link-appointment`, { appointmentId });
    return data?.data ?? data;
  },
};
