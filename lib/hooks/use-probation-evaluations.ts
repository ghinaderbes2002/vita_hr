import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  probationEvaluationsApi,
  CreateProbationEvaluationData,
  SelfEvaluateData,
  SeniorApproveData,
  CeoDecideData,
  WorkflowNotesData,
  ProposeMeetingData,
  ConfirmMeetingData,
  CompleteProbationData,
} from "@/lib/api/probation-evaluations";
import { toast } from "sonner";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>, id: string) => {
  qc.invalidateQueries({ queryKey: ["probation-evaluation", id] });
  qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
  qc.invalidateQueries({ queryKey: ["probation-pending-my-action"] });
  qc.invalidateQueries({ queryKey: ["probation-history", id] });
};


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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["probation-evaluations"] });
      toast.success("تم إنشاء التقييم بنجاح");
    },
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

export function useSelfEvaluateProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SelfEvaluateData }) =>
      probationEvaluationsApi.selfEvaluate(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تم إرسال التقييم الذاتي");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useSeniorApproveProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SeniorApproveData }) =>
      probationEvaluationsApi.seniorApprove(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تمت الموافقة وإرسالها لـ HR");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useSeniorRejectProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: WorkflowNotesData }) =>
      probationEvaluationsApi.seniorReject(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تم الرفض");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useHrDocumentProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: WorkflowNotesData }) =>
      probationEvaluationsApi.hrDocument(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تم التوثيق وإرساله للمدير التنفيذي");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useHrRejectProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: WorkflowNotesData }) =>
      probationEvaluationsApi.hrReject(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تم الرفض من HR");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useCeoDecideProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CeoDecideData }) =>
      probationEvaluationsApi.ceoDecide(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تم اتخاذ القرار النهائي");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useProposeMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProposeMeetingData }) =>
      probationEvaluationsApi.proposeMeeting(id, data),
    onSuccess: (_, { id }) => {
      invalidateAll(qc, id);
      toast.success("تم اقتراح موعد الاجتماع");
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
      invalidateAll(qc, id);
      toast.success("تم تأكيد موعد الاجتماع");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useCompleteProbation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; employeeId?: string; data?: CompleteProbationData }) =>
      probationEvaluationsApi.complete(id, data),
    onSuccess: (_, { id, employeeId }) => {
      invalidateAll(qc, id);
      if (employeeId) qc.invalidateQueries({ queryKey: ["employee", employeeId] });
      toast.success("تم إغلاق التقييم بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}
