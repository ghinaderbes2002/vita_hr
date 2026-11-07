import { apiClient } from "./client";

export type DelegationStatus = "ACTIVE" | "UPCOMING" | "ENDED";

/** A leave substitute holding the absent employee's access for the leave's dates. */
export interface Delegation {
  id: string;
  delegatorId: string;
  delegatorName: string;
  delegatorJobTitle?: string | null;
  delegateId: string;
  delegateName: string;
  leaveRequestId?: string | null;
  from: string;
  to: string;
  status: DelegationStatus;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revokeReason?: string | null;
}

export interface PaginatedDelegations {
  items: Delegation[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const delegationsApi = {
  list: async (params: { status?: DelegationStatus; page?: number; limit?: number }): Promise<PaginatedDelegations> => {
    const { data } = await apiClient.get("/delegations", { params });
    const d = data?.data ?? data;
    const items: Delegation[] = d?.items ?? [];
    return {
      items,
      page: d?.page ?? params.page ?? 1,
      limit: d?.limit ?? params.limit ?? 20,
      total: d?.total ?? items.length,
      totalPages: d?.totalPages ?? 1,
    };
  },

  /** Ends a delegation before its date — the employee came back early, say. */
  revoke: async (id: string, reason?: string): Promise<void> => {
    await apiClient.post(`/delegations/${id}/revoke`, reason ? { reason } : {});
  },
};
