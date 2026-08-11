import { apiClient } from "./client";

// Referral sources — the doctors, hospitals and associations that send patients
// to the clinic, plus the marketing visits paid to each of them.
export const REFERRAL_SOURCE_TYPES = ["DOCTOR", "HOSPITAL", "ASSOCIATION"] as const;
export type ReferralSourceType = (typeof REFERRAL_SOURCE_TYPES)[number];

export const REFERRAL_VISIT_TYPES = ["INTRODUCTORY", "FOLLOW_UP"] as const;
export type ReferralVisitType = (typeof REFERRAL_VISIT_TYPES)[number];

export const REFERRAL_SOURCE_TYPE_LABEL: Record<ReferralSourceType, string> = {
  DOCTOR:      "طبيب",
  HOSPITAL:    "مشفى",
  ASSOCIATION: "جمعية",
};

export const REFERRAL_VISIT_TYPE_LABEL: Record<ReferralVisitType, string> = {
  INTRODUCTORY: "تعريفية",
  FOLLOW_UP:    "متابعة",
};

export interface ReferralVisit {
  id: string;
  sourceId: string;
  visitType: ReferralVisitType;
  visitDate: string;
  topics?: string | null;
  nextVisitDate?: string | null;
  notes?: string | null;
  /** Filled by the backend from the token — never sent by the client. */
  visitedById?: string | null;
  visitedBy?: { id: string; fullName?: string } | null;
  createdAt: string;
}

export interface ReferralSource {
  id: string;
  type: ReferralSourceType;
  name: string;
  specialty?: string | null;
  city?: string | null;
  region?: string | null;
  street?: string | null;
  landmark?: string | null;
  floor?: string | null;
  address?: string | null;
  clinicPhone?: string | null;
  mobile?: string | null;
  clinicRating?: number | null;
  patientDensityRating?: number | null;
  interests?: string[] | null;
  visitDays?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Present on the detail response. */
  visits?: ReferralVisit[];
  /** Prisma-style aggregate the list/stats endpoints return. */
  _count?: { visits?: number };
  visitsCount?: number;
  /** Everyone recorded under this source, whether or not they ever showed up. */
  patientCount?: number;
  /** Those who actually entered a service (physio / prosthetics / podiatry). */
  realPatientCount?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `_count.visits` (list) and `visits.length` (detail) both mean the same thing. */
export const visitsCountOf = (s: ReferralSource): number =>
  s._count?.visits ?? s.visitsCount ?? s.visits?.length ?? 0;

export interface CreateReferralSourceDto {
  type: ReferralSourceType;
  name: string;
  specialty?: string;
  city?: string;
  region?: string;
  street?: string;
  landmark?: string;
  floor?: string;
  address?: string;
  clinicPhone?: string;
  mobile?: string;
  clinicRating?: number;
  patientDensityRating?: number;
  interests?: string[];
  visitDays?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export type UpdateReferralSourceDto = Partial<CreateReferralSourceDto>;

export interface CreateReferralVisitDto {
  visitType: ReferralVisitType;
  visitDate: string;
  topics?: string;
  nextVisitDate?: string;
  notes?: string;
}

export type UpdateReferralVisitDto = Partial<CreateReferralVisitDto>;

export interface ReferralSourceListParams {
  type?: ReferralSourceType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedReferralSources {
  items: ReferralSource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReferralStats {
  byType: { type: ReferralSourceType; _count: { id: number } }[];
  topSources: ReferralSource[];
}

const BASE = "/referrals/sources";

export const clinicReferralsApi = {
  list: async (params?: ReferralSourceListParams): Promise<PaginatedReferralSources> => {
    const { data } = await apiClient.get(BASE, { params });
    const d = data?.data ?? data;
    const items: ReferralSource[] = d?.items ?? d?.data ?? (Array.isArray(d) ? d : []);
    const limit = d?.limit ?? params?.limit ?? 20;
    const total = d?.total ?? items.length;
    return {
      items,
      total,
      page: d?.page ?? params?.page ?? 1,
      limit,
      totalPages: d?.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    };
  },

  getStats: async (): Promise<ReferralStats> => {
    const { data } = await apiClient.get(`${BASE}/stats`);
    const d = data?.data ?? data;
    return { byType: d?.byType ?? [], topSources: d?.topSources ?? [] };
  },

  getById: async (id: string): Promise<ReferralSource> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data?.data ?? data;
  },

  create: async (dto: CreateReferralSourceDto): Promise<ReferralSource> => {
    const { data } = await apiClient.post(BASE, dto);
    return data?.data ?? data;
  },

  update: async (id: string, dto: UpdateReferralSourceDto): Promise<ReferralSource> => {
    const { data } = await apiClient.patch(`${BASE}/${id}`, dto);
    return data?.data ?? data;
  },

  // Soft delete — the source stops appearing in list().
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  getPatientCount: async (id: string): Promise<number> => {
    const { data } = await apiClient.get(`${BASE}/${id}/patient-count`);
    const d = data?.data ?? data;
    return d?.patientCount ?? 0;
  },

  listVisits: async (sourceId: string): Promise<ReferralVisit[]> => {
    const { data } = await apiClient.get(`${BASE}/${sourceId}/visits`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  createVisit: async (sourceId: string, dto: CreateReferralVisitDto): Promise<ReferralVisit> => {
    const { data } = await apiClient.post(`${BASE}/${sourceId}/visits`, dto);
    return data?.data ?? data;
  },

  updateVisit: async (
    sourceId: string,
    visitId: string,
    dto: UpdateReferralVisitDto,
  ): Promise<ReferralVisit> => {
    const { data } = await apiClient.patch(`${BASE}/${sourceId}/visits/${visitId}`, dto);
    return data?.data ?? data;
  },

  deleteVisit: async (sourceId: string, visitId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sourceId}/visits/${visitId}`);
  },
};
