import { apiClient } from "./client";

/** A leave substitution the signed-in user is currently covering. */
export interface ActiveDelegation {
  id: string;
  delegatorId: string;
  delegatorName: string;
  delegatorJobTitle?: string | null;
  from: string;
  to: string;
}

/**
 * What the signed-in user may do right now: their own permissions and job titles
 * plus those of anyone they are standing in for. Read live on every call, so it
 * changes when a delegation starts or ends without a new login.
 */
export interface EffectiveAccess {
  permissions: string[];
  jobTitleCodes: string[];
  activeDelegations: ActiveDelegation[];
}

export const effectiveAccessApi = {
  get: async (): Promise<EffectiveAccess> => {
    const { data } = await apiClient.get("/auth/me/effective");
    const d = data?.data ?? data;
    return {
      permissions: Array.isArray(d?.permissions) ? d.permissions : [],
      jobTitleCodes: Array.isArray(d?.jobTitleCodes) ? d.jobTitleCodes : [],
      activeDelegations: Array.isArray(d?.activeDelegations) ? d.activeDelegations : [],
    };
  },
};
