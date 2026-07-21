import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clinicPodiatryApi,
  PodiatryReceptionDto,
  PodiatrySessionDto,
} from "@/lib/api/clinic-podiatry";

type ApiError = { response?: { data?: { message?: string; error?: { message?: string } } } };
const errMsg = (e: unknown, fallback: string) => {
  const d = (e as ApiError)?.response?.data;
  return d?.error?.message || d?.message || fallback;
};

export function usePodiatryReceptions(patientId?: string) {
  return useQuery({
    queryKey: ["podiatry-receptions", patientId ?? "all"],
    queryFn: () => clinicPodiatryApi.getReceptions(patientId),
  });
}

export function usePodiatryReception(id: string) {
  return useQuery({
    queryKey: ["podiatry-reception", id],
    queryFn: () => clinicPodiatryApi.getReception(id),
    enabled: !!id,
  });
}

export function useCreatePodiatryReception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PodiatryReceptionDto) => clinicPodiatryApi.createReception(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["podiatry-receptions"] });
      toast.success("تم إنشاء الاستقبال");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل إنشاء الاستقبال")),
  });
}

export function useUpdatePodiatryReception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: PodiatryReceptionDto }) =>
      clinicPodiatryApi.updateReception(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-receptions"] });
      qc.invalidateQueries({ queryKey: ["podiatry-reception", id] });
      toast.success("تم حفظ التعديلات");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ التعديلات")),
  });
}

export function usePodiatrySessions(receptionId: string, includeArchived = false) {
  return useQuery({
    queryKey: ["podiatry-sessions", receptionId, includeArchived],
    queryFn: () => clinicPodiatryApi.getSessions(receptionId, includeArchived),
    enabled: !!receptionId,
  });
}

export function useArchivePodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, sessionId }: { receptionId: string; sessionId: string }) =>
      clinicPodiatryApi.archiveSession(receptionId, sessionId),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      toast.success("تمت أرشفة الجلسة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل أرشفة الجلسة")),
  });
}

export function useCreatePodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, dto }: { receptionId: string; dto: PodiatrySessionDto }) =>
      clinicPodiatryApi.createSession(receptionId, dto),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      qc.invalidateQueries({ queryKey: ["podiatry-reception", receptionId] });
      toast.success("تمت إضافة الجلسة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل إضافة الجلسة")),
  });
}

export function useUpdatePodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, sessionId, dto }: { receptionId: string; sessionId: string; dto: PodiatrySessionDto }) =>
      clinicPodiatryApi.updateSession(receptionId, sessionId, dto),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      toast.success("تم حفظ الجلسة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ الجلسة")),
  });
}

export function useDeletePodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, sessionId }: { receptionId: string; sessionId: string }) =>
      clinicPodiatryApi.deleteSession(receptionId, sessionId),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      toast.success("تم حذف الجلسة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حذف الجلسة")),
  });
}
