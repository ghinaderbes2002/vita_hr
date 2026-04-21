import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  probationEvaluationsApi, CreateProbationEvaluationData, WorkflowActionData,
  ProposeMeetingData, ConfirmMeetingData, CompleteProbationData,
} from "@/lib/api/probation-evaluations";
import { toast } from "sonner";

export function useProbationCriteria() {
  return useQuery({
    queryKey: ["probation-criteria"],
    queryFn: () => probationEvaluationsApi.getCriteria(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useProbationEvaluations() {
  return useQuery({
    queryKey: ["probation-evaluations"],
    queryFn: () => probationEvaluationsApi.getAll(),
  });
}

export function useProbationEvaluation(id: string) {
  return useQuery({
    queryKey: ["probation-evaluation", id],
    queryFn: () => probationEvaluationsApi.getById(id),
    enabled: !!id,
  });
}

export function useProbationEvaluationsByEmployee(employeeId: string) {
  return useQuery({
    queryKey: ["probation-evaluations-employee", employeeId],
    queryFn: () => probationEvaluationsApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function usePendingMyAction() {
  return useQuery({
    queryKey: ["probation-pending-my-action"],
    queryFn: () => probationEvaluationsApi.getPendingMyAction(),
  });
}

export function useProbationHistory(id: string) {
  return useQuery({
    queryKey: ["probation-history", id],
    queryFn: () => probationEvaluationsApi.getHistory(id),
    enabled: !!id,
  });
}

export function useCreateProbationEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProbationEvaluationData) => probationEvaluationsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["probation-evaluations"] }); toast.success("تم إنشاء التقييم بنجاح"); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useUpdateProbationEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProbationEvaluationData> }) =>
      probationEvaluationsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
      qc.invalidateQueries({ queryKey: ["probation-evaluation", id] });
      toast.success("تم التحديث");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

// Workflow actions — generic factory
function makeWorkflowMutation(action: (id: string, data?: WorkflowActionData) => Promise<any>, successMsg: string) {
  return function useWorkflowAction() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data?: WorkflowActionData }) => action(id, data),
      onSuccess: (_, { id }) => {
        qc.invalidateQueries({ queryKey: ["probation-evaluation", id] });
        qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
        qc.invalidateQueries({ queryKey: ["probation-pending-my-action"] });
        qc.invalidateQueries({ queryKey: ["probation-history", id] });
        toast.success(successMsg);
      },
      onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
    });
  };
}

export function useProposeMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProposeMeetingData }) =>
      probationEvaluationsApi.proposeMeeting(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["probation-evaluation", id] });
      qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
      qc.invalidateQueries({ queryKey: ["probation-history", id] });
      toast.success("تم اقتراح موعد الاجتماع بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useConfirmMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmMeetingData }) =>
      probationEvaluationsApi.confirmMeeting(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["probation-evaluation", id] });
      qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
      qc.invalidateQueries({ queryKey: ["probation-history", id] });
      toast.success("تم تأكيد موعد الاجتماع");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useCompleteProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteProbationData }) =>
      probationEvaluationsApi.complete(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["probation-evaluation", id] });
      qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
      qc.invalidateQueries({ queryKey: ["probation-history", id] });
      toast.success("تم إغلاق التقييم بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export const useSubmitProbation = makeWorkflowMutation(probationEvaluationsApi.submit, "تم الإرسال للمدير الأعلى");
export const useSeniorApproveProbation = makeWorkflowMutation(probationEvaluationsApi.seniorApprove, "تمت الموافقة وإرسالها لـ HR");
export const useSeniorRejectProbation = makeWorkflowMutation(probationEvaluationsApi.seniorReject, "تم الرفض وإعادته للمقيّم");
export const useHrDocumentProbation = makeWorkflowMutation(probationEvaluationsApi.hrDocument, "تم التوثيق وإرساله للمدير التنفيذي");
export const useHrRejectProbation = makeWorkflowMutation(probationEvaluationsApi.hrReject, "تم الرفض من HR");
export const useCeoDecideProbation = makeWorkflowMutation(probationEvaluationsApi.ceoDecide, "تم اتخاذ القرار النهائي");
export const useEmployeeAcknowledgeProbation = makeWorkflowMutation(probationEvaluationsApi.employeeAcknowledge, "تم إقرار الموظف — التقييم مكتمل");
