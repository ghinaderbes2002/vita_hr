import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  peerEvaluationsApi,
  SubmitPeerEvaluationData,
} from "@/lib/api/peer-evaluations";

// Get peer evaluations for a form
export function usePeerEvaluations(formId: string) {
  return useQuery({
    queryKey: ["peer-evaluations", formId],
    queryFn: () => peerEvaluationsApi.getByForm(formId),
    enabled: !!formId,
  });
}

// Submit peer evaluation
export function useSubmitPeerEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, data }: { formId: string; data: SubmitPeerEvaluationData }) =>
      peerEvaluationsApi.submit(formId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer-evaluations"] });
      toast.success("تم إرسال تقييم الزملاء بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إرسال التقييم");
    },
  });
}
