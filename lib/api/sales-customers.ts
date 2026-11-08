import { apiClient } from "./client";

/** How the customer found the centre. Unlike the waiting list, there is no ASSOCIATION. */
export type SalesCustomerArrivalMethod = "HOSPITAL" | "FRIEND" | "DOCTOR" | "STAFF" | "SOCIAL_MEDIA";

export type SalesCustomerGender = "MALE" | "FEMALE";

/** A sales department customer — its own record, apart from patients and potential clients. */
export interface SalesCustomer {
  id: string;
  name: string;
  gender: SalesCustomerGender;
  age?: number | null;
  arrivalMethod?: SalesCustomerArrivalMethod | null;
  contactNumber: string;
  /** Free text — where the customer lives. */
  residence?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSalesCustomerDto {
  name: string;
  gender: SalesCustomerGender;
  /** 0–120. */
  age?: number;
  arrivalMethod?: SalesCustomerArrivalMethod;
  contactNumber: string;
  residence?: string;
  notes?: string;
}

/** PATCH: any subset of the create fields. */
export type UpdateSalesCustomerDto = Partial<CreateSalesCustomerDto>;

export interface SalesCustomerParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: SalesCustomerGender;
  arrivalMethod?: SalesCustomerArrivalMethod;
}

const BASE = "/referrals/customers";

export const salesCustomersApi = {
  list: async (params?: SalesCustomerParams) => {
    const { data } = await apiClient.get(BASE, { params });
    const d = data?.data ?? data;
    const total = d?.total ?? 0;
    const limit = d?.limit ?? params?.limit ?? 20;
    return {
      items: (d?.items ?? d?.data ?? (Array.isArray(d) ? d : [])) as SalesCustomer[],
      total,
      totalPages: d?.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0),
    };
  },

  getById: async (id: string): Promise<SalesCustomer> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data?.data ?? data;
  },

  create: async (dto: CreateSalesCustomerDto): Promise<SalesCustomer> => {
    const { data } = await apiClient.post(BASE, dto);
    return data?.data ?? data;
  },

  update: async (id: string, dto: UpdateSalesCustomerDto): Promise<SalesCustomer> => {
    const { data } = await apiClient.patch(`${BASE}/${id}`, dto);
    return data?.data ?? data;
  },

  /** Soft delete on the server: the record leaves the list but is kept in the database. */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
};
