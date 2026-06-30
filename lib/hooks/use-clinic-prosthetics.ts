import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clinicProstheticsApi,
  CreateProstheticsCaseDto,
  ProstheticsStatus,
  AssessmentUpperDto,
  AssessmentLowerDto,
  CommitteeOpinionDto,
  CommitteeDecisionDto,
  AddComponentDto,
  GaitAnalysisDto,
  ProstheticsCaseListParams,
} from "@/lib/api/clinic-prosthetics";
import { toast } from "sonner";

export function useProstheticsCases(params?: ProstheticsCaseListParams) {
  return useQuery({
    queryKey: ["clinic-prosthetics-cases", params],
    queryFn: () => clinicProstheticsApi.list(params),
  });
}

export function useProstheticsCase(id: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-case", id],
    queryFn: () => clinicProstheticsApi.getById(id),
    enabled: !!id,
  });
}

export function useProstheticsCasesByPatient(patientId: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-cases-patient", patientId],
    queryFn: () => clinicProstheticsApi.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateProstheticsCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProstheticsCaseDto) => clinicProstheticsApi.create(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-cases"] });
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-cases-patient", data.patientId] });
      toast.success("تم إنشاء الحالة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إنشاء الحالة"),
  });
}

export function useUpdateProstheticsCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateProstheticsCaseDto> }) =>
      clinicProstheticsApi.update(id, dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", data.id] });
      toast.success("تم تحديث الحالة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useUpdateProstheticsStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProstheticsStatus }) =>
      clinicProstheticsApi.updateStatus(id, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", data.id] });
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-cases"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل تغيير الحالة"),
  });
}

export function useSubmitAssessmentUpper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AssessmentUpperDto }) =>
      clinicProstheticsApi.submitAssessmentUpper(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ التقييم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حفظ التقييم"),
  });
}

export function useSubmitAssessmentLower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AssessmentLowerDto }) =>
      clinicProstheticsApi.submitAssessmentLower(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ التقييم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حفظ التقييم"),
  });
}

export function useSubmitCommitteeOpinion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CommitteeOpinionDto }) =>
      clinicProstheticsApi.submitCommitteeOpinion(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم إرسال رأيك");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إرسال الرأي"),
  });
}

export function useSubmitCommitteeDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CommitteeDecisionDto }) =>
      clinicProstheticsApi.submitCommitteeDecision(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم إرسال قرار اللجنة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إرسال القرار"),
  });
}

export function useSignCommitteeDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role, signatureBase64 }: { id: string; role: "DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST"; signatureBase64: string }) =>
      clinicProstheticsApi.signCommitteeDecision(id, role, signatureBase64),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم التوقيع");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التوقيع"),
  });
}

export function useCaseComponents(caseId: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-components", caseId],
    queryFn: () => clinicProstheticsApi.getComponents(caseId),
    enabled: !!caseId,
  });
}

export function useAddCaseComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AddComponentDto }) =>
      clinicProstheticsApi.addComponent(id, dto),
    onSuccess: (data: any, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-components", id] });
      if (data?.matchedInInventory === false) {
        toast.warning("تم الحفظ — الكود غير موجود بالمخزون، لن يتم خصم أي كمية");
      } else {
        qc.invalidateQueries({ queryKey: ["clinic-inventory-items"] });
        toast.success("تمت إضافة القطعة وخُصمت من المخزون تلقائياً");
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إضافة القطعة"),
  });
}

export function useDeleteCaseComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, compId }: { id: string; compId: string }) =>
      clinicProstheticsApi.deleteComponent(id, compId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-components", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

export function useSubmitGaitAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: GaitAnalysisDto }) =>
      clinicProstheticsApi.submitGaitAnalysis(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ تحليل المشي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useProstheticsFollowUps(caseId: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-followups", caseId],
    queryFn: () => clinicProstheticsApi.getFollowUps(caseId),
    enabled: !!caseId,
  });
}

export function useAddProstheticsFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof clinicProstheticsApi.addFollowUp>[1] }) =>
      clinicProstheticsApi.addFollowUp(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-followups", id] });
      toast.success("تمت إضافة متابعة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useProstheticsTimeline(caseId: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-timeline", caseId],
    queryFn: () => clinicProstheticsApi.getTimeline(caseId),
    enabled: !!caseId,
  });
}

export function useDownloadProstheticsPdf() {
  return useMutation({
    mutationFn: (caseId: string) => clinicProstheticsApi.downloadPdf(caseId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
    onError: () => toast.error("فشل تنزيل PDF"),
  });
}

export function useSubmitBalanceAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      clinicProstheticsApi.submitBalanceAssessment(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ تقييم التوازن");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useAddConsumable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      clinicProstheticsApi.addConsumable(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تمت إضافة المستهلك");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useSubmitFinalEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      clinicProstheticsApi.submitFinalEvaluation(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ التقييم النهائي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSignFinalEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signature }: { id: string; signature: string }) =>
      clinicProstheticsApi.signFinalEvaluation(id, signature),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم توقيع التقييم النهائي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التوقيع"),
  });
}

export function useSubmitDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      clinicProstheticsApi.submitDelivery(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم تسجيل التسليم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التسجيل"),
  });
}

export function useSignDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signature }: { id: string; signature: string }) =>
      clinicProstheticsApi.signDelivery(id, signature),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم توقيع استلام الطرف الصناعي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التوقيع"),
  });
}
