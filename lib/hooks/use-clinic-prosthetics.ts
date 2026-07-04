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
  AnkleDisarticulationDto,
  KneeDisarticulationDto,
  TransfemoralDto,
  TranstibialDto,
  HemipelvectomyDto,
  ElbowDisarticulationDto,
  TranshumeralDto,
  TransradialDto,
  TreatmentProgramDto,
  TreatmentProgramSessionDto,
  ReviewProgramDto,
  ProstheticDeliveryDto,
  DeliveryItemDto,
  BalanceAssessmentDto,
  GaitAnalysisFormDto,
  FinalEvaluationDto,
  DirectorSignDto,
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
    mutationFn: ({ id, role, signatureUrl }: { id: string; role: "DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST"; signatureUrl: string }) =>
      clinicProstheticsApi.signCommitteeDecision(id, role, signatureUrl),
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

export function useFinalEvaluation(caseId: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-final-eval", caseId],
    queryFn: () => clinicProstheticsApi.getFinalEvaluation(caseId),
    enabled: !!caseId,
    retry: false,
  });
}

export function useSubmitFinalEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: FinalEvaluationDto }) =>
      clinicProstheticsApi.submitFinalEvaluation(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-final-eval", id] });
      toast.success("تم حفظ التقييم النهائي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSignFinalEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: DirectorSignDto }) =>
      clinicProstheticsApi.signFinalEvaluation(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-final-eval", id] });
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

export function useProstheticsAttachments(caseId: string) {
  return useQuery({
    queryKey: ["clinic-prosthetics-attachments", caseId],
    queryFn: () => clinicProstheticsApi.getAttachments(caseId),
    enabled: !!caseId,
  });
}

export function useUploadProstheticsAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, caption }: { id: string; file: File; caption?: string }) =>
      clinicProstheticsApi.uploadAttachment(id, file, caption),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-attachments", id] });
      toast.success("تم رفع الملف");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل رفع الملف"),
  });
}

export function useDeleteProstheticsAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      clinicProstheticsApi.deleteAttachment(id, attachmentId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-attachments", id] });
      toast.success("تم حذف الملف");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حذف الملف"),
  });
}

export function useSubmitAnkleDisarticulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AnkleDisarticulationDto }) =>
      clinicProstheticsApi.submitAnkleDisarticulation(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitKneeDisarticulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: KneeDisarticulationDto }) =>
      clinicProstheticsApi.submitKneeDisarticulation(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useTreatmentPrograms(caseId: string) {
  return useQuery({
    queryKey: ["treatment-programs", caseId],
    queryFn: () => clinicProstheticsApi.getTreatmentPrograms(caseId),
    enabled: !!caseId,
  });
}

export function useCreateTreatmentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, dto }: { caseId: string; dto: TreatmentProgramSessionDto }) =>
      clinicProstheticsApi.createTreatmentProgram(caseId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["treatment-programs", caseId] });
      toast.success("تمت إضافة الجلسة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إضافة الجلسة"),
  });
}

export function useUpdateTreatmentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, programId, dto }: { caseId: string; programId: string; dto: TreatmentProgramSessionDto }) =>
      clinicProstheticsApi.updateTreatmentProgram(caseId, programId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["treatment-programs", caseId] });
      toast.success("تم حفظ الجلسة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useDeleteTreatmentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, programId }: { caseId: string; programId: string }) =>
      clinicProstheticsApi.deleteTreatmentProgram(caseId, programId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["treatment-programs", caseId] });
      toast.success("تم حذف الجلسة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

export function useReviewPrograms(caseId: string) {
  return useQuery({
    queryKey: ["review-programs", caseId],
    queryFn: () => clinicProstheticsApi.getReviewPrograms(caseId),
    enabled: !!caseId,
  });
}

export function useCreateReviewProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, dto }: { caseId: string; dto: ReviewProgramDto }) =>
      clinicProstheticsApi.createReviewProgram(caseId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["review-programs", caseId] });
      toast.success("تمت إضافة زيارة المراجعة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إضافة الزيارة"),
  });
}

export function useUpdateReviewProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, reviewId, dto }: { caseId: string; reviewId: string; dto: ReviewProgramDto }) =>
      clinicProstheticsApi.updateReviewProgram(caseId, reviewId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["review-programs", caseId] });
      toast.success("تم حفظ الزيارة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useDeleteReviewProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, reviewId }: { caseId: string; reviewId: string }) =>
      clinicProstheticsApi.deleteReviewProgram(caseId, reviewId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["review-programs", caseId] });
      toast.success("تم حذف الزيارة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

export function useSubmitTransradial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TransradialDto }) =>
      clinicProstheticsApi.submitTransradial(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitTranshumeral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TranshumeralDto }) =>
      clinicProstheticsApi.submitTranshumeral(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitElbowDisarticulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ElbowDisarticulationDto }) =>
      clinicProstheticsApi.submitElbowDisarticulation(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitHemipelvectomy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: HemipelvectomyDto }) =>
      clinicProstheticsApi.submitHemipelvectomy(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitTranstibial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TranstibialDto }) =>
      clinicProstheticsApi.submitTranstibial(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitTransfemoral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TransfemoralDto }) =>
      clinicProstheticsApi.submitTransfemoral(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
      toast.success("تم حفظ ورق القياس");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

// ── Pro-015 Balance Assessment ───────────────────────────────────────────────

export function useBalanceAssessments(caseId: string) {
  return useQuery({
    queryKey: ["balance-assessments", caseId],
    queryFn: () => clinicProstheticsApi.getBalanceAssessments(caseId),
    enabled: !!caseId,
  });
}

export function useAddBalanceAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, dto }: { caseId: string; dto: BalanceAssessmentDto }) =>
      clinicProstheticsApi.addBalanceAssessment(caseId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["balance-assessments", caseId] });
      toast.success("تمت إضافة تقييم التوازن");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useUpdateBalanceAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, formId, dto }: { caseId: string; formId: string; dto: BalanceAssessmentDto }) =>
      clinicProstheticsApi.updateBalanceAssessment(caseId, formId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["balance-assessments", caseId] });
      toast.success("تم تحديث تقييم التوازن");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeleteBalanceAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, formId }: { caseId: string; formId: string }) =>
      clinicProstheticsApi.deleteBalanceAssessment(caseId, formId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["balance-assessments", caseId] });
      toast.success("تم حذف التقييم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

// ── Pro-019 Prosthetic Delivery ──────────────────────────────────────────────

export function useProstheticDelivery(caseId: string) {
  return useQuery({
    queryKey: ["prosthetic-delivery", caseId],
    queryFn: () => clinicProstheticsApi.getProstheticDelivery(caseId),
    enabled: !!caseId,
  });
}

export function useSaveProstheticDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, dto }: { caseId: string; dto: ProstheticDeliveryDto }) =>
      clinicProstheticsApi.saveProstheticDelivery(caseId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["prosthetic-delivery", caseId] });
      toast.success("تم حفظ بيانات التسليم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useAddDeliveryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, dto }: { caseId: string; dto: DeliveryItemDto }) =>
      clinicProstheticsApi.addDeliveryItem(caseId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["prosthetic-delivery", caseId] });
      toast.success("تمت إضافة القطعة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useUpdateDeliveryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, itemId, dto }: { caseId: string; itemId: string; dto: DeliveryItemDto }) =>
      clinicProstheticsApi.updateDeliveryItem(caseId, itemId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["prosthetic-delivery", caseId] });
      toast.success("تم تحديث القطعة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeleteDeliveryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, itemId }: { caseId: string; itemId: string }) =>
      clinicProstheticsApi.deleteDeliveryItem(caseId, itemId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["prosthetic-delivery", caseId] });
      toast.success("تم حذف القطعة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

// ── Pro-016 Gait Analysis ──────────────────────────────────────────────────────
export function useGaitAnalysisForms(caseId: string) {
  return useQuery({
    queryKey: ["gait-analysis-forms", caseId],
    queryFn: () => clinicProstheticsApi.getGaitAnalysisForms(caseId),
    enabled: !!caseId,
  });
}

export function useAddGaitAnalysisForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, dto }: { caseId: string; dto: GaitAnalysisFormDto }) =>
      clinicProstheticsApi.addGaitAnalysisForm(caseId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["gait-analysis-forms", caseId] });
      toast.success("تمت إضافة جلسة تحليل المشي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useUpdateGaitAnalysisForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, formId, dto }: { caseId: string; formId: string; dto: GaitAnalysisFormDto }) =>
      clinicProstheticsApi.updateGaitAnalysisForm(caseId, formId, dto),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["gait-analysis-forms", caseId] });
      toast.success("تم حفظ التعديلات");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeleteGaitAnalysisForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, formId }: { caseId: string; formId: string }) =>
      clinicProstheticsApi.deleteGaitAnalysisForm(caseId, formId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: ["gait-analysis-forms", caseId] });
      toast.success("تم حذف جلسة تحليل المشي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}
