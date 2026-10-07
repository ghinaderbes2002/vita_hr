import { apiClient } from "./client";

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
  arrivalMethod?: PotentialClientArrivalMethod | null;
  /** Free text — what the person was interested in. */
  interestedService: string;
  contactNumber: string;
  notes?: string | null;
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
  arrivalMethod?: PotentialClientArrivalMethod;
  interestedService: string;
  contactNumber: string;
  notes?: string;
}

/** PUT takes only the fields that changed. */
export type UpdatePotentialClientDto = Partial<CreatePotentialClientDto>;

export interface PotentialClientFilters {
  /** Exact match on the service text. */
  interestedService?: string;
  /** Partial, case-insensitive match on name, contact number or service. */
  search?: string;
  /** Registration date range, inclusive, as YYYY-MM-DD. */
  dateFrom?: string;
  dateTo?: string;
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
};
