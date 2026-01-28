import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  evaluationFormsApi,
  CreateFormData,
  SaveSelfEvaluationData,
  SaveManagerEvaluationData,
  HrReviewData,
  GmApprovalData,
} from "@/lib/api/evaluation-forms";

// Get all evaluation forms
export function useAllEvaluationForms() {
  return useQuery({
    queryKey: ["evaluation-forms", "all"],
    queryFn: () => evaluationFormsApi.getAll(),
  });
}

// Get my evaluation forms
export function useMyEvaluationForms(periodId?: string) {
  return useQuery({
    queryKey: ["evaluation-forms", "my", periodId],
    queryFn: () => evaluationFormsApi.getMy(periodId ? { periodId } : undefined),
  });
}

// Get single evaluation form
export function useEvaluationForm(id: string) {
  return useQuery({
    queryKey: ["evaluation-forms", id],
    queryFn: () => evaluationFormsApi.getById(id),
    enabled: !!id,
  });
}

// Get pending my review
export function usePendingMyReview() {
  return useQuery({
    queryKey: ["evaluation-forms", "pending-my-review"],
    queryFn: () => evaluationFormsApi.getPendingMyReview(),
  });
}

// Create evaluation form
export function useCreateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFormData) => evaluationFormsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم إنشاء نموذج التقييم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إنشاء النموذج");
    },
  });
}

// Save self evaluation
export function useSaveSelfEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveSelfEvaluationData }) =>
      evaluationFormsApi.saveSelfEvaluation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم حفظ التقييم الذاتي بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حفظ التقييم");
    },
  });
}

// Submit self evaluation
export function useSubmitSelfEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => evaluationFormsApi.submitSelfEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم تقديم التقييم الذاتي بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء تقديم التقييم");
    },
  });
}

// Save manager evaluation
export function useSaveManagerEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveManagerEvaluationData }) =>
      evaluationFormsApi.saveManagerEvaluation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم حفظ تقييم المدير بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حفظ التقييم");
    },
  });
}

// Submit manager evaluation
export function useSubmitManagerEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => evaluationFormsApi.submitManagerEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم تقديم تقييم المدير بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء تقديم التقييم");
    },
  });
}

// HR review
export function useHrReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HrReviewData }) =>
      evaluationFormsApi.hrReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم إرسال مراجعة الموارد البشرية بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إرسال المراجعة");
    },
  });
}

// GM approval
export function useGmApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GmApprovalData }) =>
      evaluationFormsApi.gmApproval(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
      toast.success("تم إرسال قرار المدير العام بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إرسال القرار");
    },
  });
}
