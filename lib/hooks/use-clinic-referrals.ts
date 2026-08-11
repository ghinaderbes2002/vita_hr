import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clinicReferralsApi,
  CreateReferralSourceDto,
  CreateReferralVisitDto,
  ReferralSourceListParams,
  UpdateReferralSourceDto,
  UpdateReferralVisitDto,
} from "@/lib/api/clinic-referrals";

export function useReferralSources(
  params?: ReferralSourceListParams,
  /** Lets a collapsed picker hold the query back until it is actually opened. */
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["referral-sources", params],
    queryFn: () => clinicReferralsApi.list(params),
    enabled: options?.enabled ?? true,
  });
}

/** Stats are separately permissioned — skip the request when it would 403. */
export function useReferralStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["referral-stats"],
    queryFn: () => clinicReferralsApi.getStats(),
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
}

export function useReferralSource(id: string) {
  return useQuery({
    queryKey: ["referral-source", id],
    queryFn: () => clinicReferralsApi.getById(id),
    enabled: !!id,
  });
}

export function useReferralSourcePatientCount(id: string) {
  return useQuery({
    queryKey: ["referral-source-patient-count", id],
    queryFn: () => clinicReferralsApi.getPatientCount(id),
    enabled: !!id,
  });
}

export function useReferralVisits(sourceId: string) {
  return useQuery({
    queryKey: ["referral-visits", sourceId],
    queryFn: () => clinicReferralsApi.listVisits(sourceId),
    enabled: !!sourceId,
  });
}

export function useCreateReferralSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReferralSourceDto) => clinicReferralsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referral-sources"] });
      qc.invalidateQueries({ queryKey: ["referral-stats"] });
      toast.success("تمت إضافة المصدر");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إضافة المصدر"),
  });
}

export function useUpdateReferralSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReferralSourceDto }) =>
      clinicReferralsApi.update(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["referral-source", id] });
      qc.invalidateQueries({ queryKey: ["referral-sources"] });
      qc.invalidateQueries({ queryKey: ["referral-stats"] });
      toast.success("تم تحديث المصدر");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل تحديث المصدر"),
  });
}

export function useDeleteReferralSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicReferralsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referral-sources"] });
      qc.invalidateQueries({ queryKey: ["referral-stats"] });
      toast.success("تم حذف المصدر");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حذف المصدر"),
  });
}

// A visit changes the source's visit count, so the source row/detail and the
// stats board are refreshed alongside the visit list itself.
function invalidateVisitScope(qc: ReturnType<typeof useQueryClient>, sourceId: string) {
  qc.invalidateQueries({ queryKey: ["referral-visits", sourceId] });
  qc.invalidateQueries({ queryKey: ["referral-source", sourceId] });
  qc.invalidateQueries({ queryKey: ["referral-sources"] });
  qc.invalidateQueries({ queryKey: ["referral-stats"] });
}

export function useCreateReferralVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, dto }: { sourceId: string; dto: CreateReferralVisitDto }) =>
      clinicReferralsApi.createVisit(sourceId, dto),
    onSuccess: (_data, { sourceId }) => {
      invalidateVisitScope(qc, sourceId);
      toast.success("تم تسجيل الزيارة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل تسجيل الزيارة"),
  });
}

export function useUpdateReferralVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, visitId, dto }: { sourceId: string; visitId: string; dto: UpdateReferralVisitDto }) =>
      clinicReferralsApi.updateVisit(sourceId, visitId, dto),
    onSuccess: (_data, { sourceId }) => {
      invalidateVisitScope(qc, sourceId);
      toast.success("تم تحديث الزيارة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل تحديث الزيارة"),
  });
}

export function useDeleteReferralVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, visitId }: { sourceId: string; visitId: string }) =>
      clinicReferralsApi.deleteVisit(sourceId, visitId),
    onSuccess: (_data, { sourceId }) => {
      invalidateVisitScope(qc, sourceId);
      toast.success("تم حذف الزيارة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حذف الزيارة"),
  });
}
