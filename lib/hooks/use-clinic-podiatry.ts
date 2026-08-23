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

export function usePodiatrySessions(receptionId: string) {
  return useQuery({
    queryKey: ["podiatry-sessions", receptionId],
    queryFn: () => clinicPodiatryApi.getSessions(receptionId),
    enabled: !!receptionId,
  });
}

export function useCreatePodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    // POST upserts: one assessment per reception, created then updated.
    mutationFn: ({ receptionId, dto }: { receptionId: string; dto: PodiatrySessionDto }) =>
      clinicPodiatryApi.createSession(receptionId, dto),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      qc.invalidateQueries({ queryKey: ["podiatry-reception", receptionId] });
      toast.success("تم حفظ النموذج");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ النموذج")),
  });
}

export function useUpdatePodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, sessionId, dto }: { receptionId: string; sessionId: string; dto: PodiatrySessionDto }) =>
      clinicPodiatryApi.updateSession(receptionId, sessionId, dto),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      toast.success("تم حفظ النموذج");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ النموذج")),
  });
}

export function useInstallPodiatrySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, sessionId }: { receptionId: string; sessionId: string }) =>
      clinicPodiatryApi.installSession(receptionId, sessionId),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-sessions", receptionId] });
      toast.success("تم تسجيل التركيب");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل تسجيل التركيب")),
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

// ── المراجعات ────────────────────────────────────────────────────────────────
export function usePodiatryReviews(receptionId: string) {
  return useQuery({
    queryKey: ["podiatry-reviews", receptionId],
    queryFn: () => clinicPodiatryApi.listReviews(receptionId),
    enabled: !!receptionId,
  });
}

export function useCreatePodiatryReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, notes }: { receptionId: string; notes: string }) =>
      clinicPodiatryApi.createReview(receptionId, notes),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-reviews", receptionId] });
      toast.success("تمت إضافة المراجعة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل إضافة المراجعة")),
  });
}

export function useUpdatePodiatryReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, reviewId, notes }: { receptionId: string; reviewId: string; notes: string }) =>
      clinicPodiatryApi.updateReview(receptionId, reviewId, notes),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-reviews", receptionId] });
      toast.success("تم حفظ المراجعة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ المراجعة")),
  });
}

export function useDeletePodiatryReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, reviewId }: { receptionId: string; reviewId: string }) =>
      clinicPodiatryApi.deleteReview(receptionId, reviewId),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-reviews", receptionId] });
      toast.success("تم حذف المراجعة");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حذف المراجعة")),
  });
}

// ── قرار الطبيب ──────────────────────────────────────────────────────────────
export function usePodiatryDoctorDecision(receptionId: string) {
  return useQuery({
    queryKey: ["podiatry-doctor-decision", receptionId],
    queryFn: () => clinicPodiatryApi.getDoctorDecision(receptionId),
    enabled: !!receptionId,
  });
}

export function useSavePodiatryDoctorDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receptionId, decision }: { receptionId: string; decision: string }) =>
      clinicPodiatryApi.saveDoctorDecision(receptionId, decision),
    onSuccess: (_, { receptionId }) => {
      qc.invalidateQueries({ queryKey: ["podiatry-doctor-decision", receptionId] });
      toast.success("تم حفظ قرار الطبيب");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ قرار الطبيب")),
  });
}

/** Notifies the clinic doctors; the response says how many were reached. */
export function useNotifyPodiatryDoctorDecision() {
  return useMutation({
    mutationFn: (receptionId: string) => clinicPodiatryApi.notifyDoctorDecision(receptionId),
    onSuccess: ({ notified }) =>
      toast.success(notified > 0 ? `تم إرسال الإشعار إلى ${notified} طبيب` : "لا يوجد طبيب لإرسال الإشعار إليه"),
    onError: (e: unknown) => toast.error(errMsg(e, "فشل إرسال الإشعار")),
  });
}
