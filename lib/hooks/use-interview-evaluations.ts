import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { interviewEvaluationsApi, CreateInterviewEvaluationData, InterviewDecision } from "@/lib/api/interview-evaluations";
import { toast } from "sonner";

export function useInterviewEvaluations(params?: { positionId?: string; decision?: InterviewDecision; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["interview-evaluations", params],
    queryFn: () => interviewEvaluationsApi.getAll(params),
  });
}

export function useInterviewEvaluation(id: string) {
  return useQuery({
    queryKey: ["interview-evaluation", id],
    queryFn: () => interviewEvaluationsApi.getById(id),
    enabled: !!id,
  });
}

export function useInterviewEvaluationByApplication(jobApplicationId: string) {
  return useQuery({
    queryKey: ["interview-evaluation-by-app", jobApplicationId],
    queryFn: () => interviewEvaluationsApi.getByApplication(jobApplicationId),
    enabled: !!jobApplicationId,
  });
}

export function useCreateInterviewEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewEvaluationData) => interviewEvaluationsApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["interview-evaluations"] });
      qc.invalidateQueries({ queryKey: ["interview-evaluation-by-app", vars.jobApplicationId] });
      qc.invalidateQueries({ queryKey: ["interview-position-comparison", vars.positionId] });
      toast.success("تم حفظ التقييم بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}

export function useUpdateInterviewEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInterviewEvaluationData> }) =>
      interviewEvaluationsApi.update(id, data),
    onSuccess: (result, { id }) => {
      qc.invalidateQueries({ queryKey: ["interview-evaluations"] });
      qc.invalidateQueries({ queryKey: ["interview-evaluation", id] });
      qc.invalidateQueries({ queryKey: ["interview-evaluation-by-app", result.jobApplicationId] });
      toast.success("تم تحديث التقييم");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}

export function useTransferToEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => interviewEvaluationsApi.transferToEmployee(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["interview-evaluation", id] });
      toast.success("تم نقل النتيجة لسجل الموظف");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}
