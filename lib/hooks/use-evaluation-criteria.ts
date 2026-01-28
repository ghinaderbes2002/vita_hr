import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  evaluationCriteriaApi,
  CreateCriteriaData,
  UpdateCriteriaData,
  CriteriaCategory,
} from "@/lib/api/evaluation-criteria";

export function useEvaluationCriteria(params?: { category?: CriteriaCategory }) {
  return useQuery({
    queryKey: ["evaluation-criteria", params],
    queryFn: () => evaluationCriteriaApi.getAll(params),
  });
}

export function useEvaluationCriterion(id: string) {
  return useQuery({
    queryKey: ["evaluation-criteria", id],
    queryFn: () => evaluationCriteriaApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEvaluationCriteria() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CreateCriteriaData) => evaluationCriteriaApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-criteria"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useUpdateEvaluationCriteria() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCriteriaData }) =>
      evaluationCriteriaApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-criteria"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useDeleteEvaluationCriteria() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => evaluationCriteriaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-criteria"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}
