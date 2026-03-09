import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  attendanceJustificationsApi,
  CreateJustificationData,
  ReviewJustificationData,
  JustificationQueryParams,
} from "@/lib/api/attendance-justifications";

export function useMyJustifications(params?: JustificationQueryParams) {
  return useQuery({
    queryKey: ["justifications", "my", params],
    queryFn: () => attendanceJustificationsApi.getMy(params),
  });
}

export function useAllJustifications(params?: JustificationQueryParams) {
  return useQuery({
    queryKey: ["justifications", "all", params],
    queryFn: () => attendanceJustificationsApi.getAll(params),
  });
}

export function useCreateJustification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJustificationData) => attendanceJustificationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["justifications"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-alerts"] });
      toast.success("تم إرسال التبرير بنجاح");
    },
    onError: (error: any) => {
      const code = error.response?.data?.error?.code;
      const msg = error.response?.data?.error?.message || error.response?.data?.message;
      const errorMap: Record<string, string> = {
        ALERT_NOT_FOUND: "التنبيه غير موجود",
        ALERT_NOT_OWNED: "هذا التنبيه ليس خاصاً بك",
        ALERT_TYPE_NOT_JUSTIFIABLE: "هذا النوع من التنبيهات لا يقبل تبريراً",
        JUSTIFICATION_ALREADY_EXISTS: "يوجد تبرير سابق لهذا التنبيه",
        JUSTIFICATION_DEADLINE_PASSED: "انتهت مهلة تقديم التبرير (24 ساعة)",
      };
      toast.error(errorMap[code] || msg || "حدث خطأ أثناء إرسال التبرير");
    },
  });
}

export function useManagerReviewJustification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewJustificationData }) =>
      attendanceJustificationsApi.managerReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["justifications"] });
      toast.success("تم إرسال القرار بنجاح");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message;
      toast.error(msg || "حدث خطأ");
    },
  });
}

export function useHrReviewJustification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewJustificationData }) =>
      attendanceJustificationsApi.hrReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["justifications"] });
      toast.success("تم إرسال القرار بنجاح");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.response?.data?.message;
      toast.error(msg || "حدث خطأ");
    },
  });
}
