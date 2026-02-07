import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  evaluationPeriodsApi,
  CreatePeriodData,
  UpdatePeriodData,
  GenerateFormsData,
} from "@/lib/api/evaluation-periods";

export function useEvaluationPeriods() {
  return useQuery({
    queryKey: ["evaluation-periods"],
    queryFn: () => evaluationPeriodsApi.getAll(),
  });
}

export function useEvaluationPeriod(id: string) {
  return useQuery({
    queryKey: ["evaluation-periods", id],
    queryFn: () => evaluationPeriodsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEvaluationPeriod() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CreatePeriodData) => evaluationPeriodsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useUpdateEvaluationPeriod() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePeriodData }) =>
      evaluationPeriodsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useOpenEvaluationPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => evaluationPeriodsApi.open(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] });
      toast.success("تم فتح فترة التقييم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء فتح فترة التقييم");
    },
  });
}

export function useCloseEvaluationPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => evaluationPeriodsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] });
      toast.success("تم إغلاق فترة التقييم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إغلاق فترة التقييم");
    },
  });
}

export function useDeleteEvaluationPeriod() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => evaluationPeriodsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}

export function useGenerateEvaluationForms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: GenerateFormsData }) =>
      evaluationPeriodsApi.generateForms(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });

      // Handle different response formats from backend
      const totalForms = result?.totalForms ?? 0;
      const message = result?.message;

      if (message) {
        toast.success(message);
      } else if (totalForms > 0) {
        toast.success(`تم إنشاء ${totalForms} نموذج تقييم بنجاح`);
      } else {
        toast.success("تم إنشاء نماذج التقييم بنجاح");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إنشاء نماذج التقييم");
    },
  });
}
