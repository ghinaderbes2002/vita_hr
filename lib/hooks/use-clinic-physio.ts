import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clinicPhysioApi,
  CreatePhysioCaseDto,
  UpdatePhysioCaseDto,
  PhysioStatus,
  PainMapDto,
  MedicalHistoryDto,
  SurgeryDto,
  GoalsDto,
  PosturalAssessmentDto,
  TreatmentPlanDto,
  SupervisorReviewDto,
  CreatePhysioSessionDto,
  PhysioCaseListParams,
} from "@/lib/api/clinic-physio";
import { toast } from "sonner";

export function usePhysioCases(params?: PhysioCaseListParams) {
  return useQuery({
    queryKey: ["clinic-physio-cases", params],
    queryFn: () => clinicPhysioApi.list(params),
  });
}

export function usePhysioCase(id: string) {
  return useQuery({
    queryKey: ["clinic-physio-case", id],
    queryFn: () => clinicPhysioApi.getById(id),
    enabled: !!id,
  });
}

export function usePhysioCasesByPatient(patientId: string) {
  return useQuery({
    queryKey: ["clinic-physio-cases-patient", patientId],
    queryFn: () => clinicPhysioApi.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreatePhysioCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePhysioCaseDto) => clinicPhysioApi.create(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-cases"] });
      qc.invalidateQueries({ queryKey: ["clinic-physio-cases-patient", data.patientId] });
      toast.success("تم إنشاء حالة الفيزيائي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إنشاء الحالة"),
  });
}

export function useUpdatePhysioCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePhysioCaseDto }) =>
      clinicPhysioApi.update(id, dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", data.id] });
      toast.success("تم الحفظ");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(msg || "فشل الحفظ");
    },
  });
}

export function useUpdatePhysioStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PhysioStatus }) =>
      clinicPhysioApi.updateStatus(id, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", data.id] });
      qc.invalidateQueries({ queryKey: ["clinic-physio-cases"] });
    },
    onError: (e: any) => {
      const errCode = e?.response?.data?.errorCode;
      const msg     = e?.response?.data?.message;
      if (errCode === "INVALID_TRANSITION") {
        const { from, to, allowed } = e?.response?.data?.meta ?? {};
        toast.error(`لا يمكن الانتقال من ${from ?? "?"} إلى ${to ?? "?"}${allowed ? ` (المسموح: ${allowed.join(", ")})` : ""}`);
      } else {
        toast.error(msg || "فشل تغيير الحالة");
      }
    },
  });
}

export function useSubmitPainMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: PainMapDto }) =>
      clinicPhysioApi.submitPainMap(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", id] });
      toast.success("تم حفظ خريطة الألم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitMedicalHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: MedicalHistoryDto }) =>
      clinicPhysioApi.submitMedicalHistory(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", id] });
      toast.success("تم حفظ التاريخ الطبي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useAddPhysioSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SurgeryDto }) =>
      clinicPhysioApi.addSurgery(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حفظ الجراحة"),
  });
}

export function useSubmitPhysioGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: GoalsDto }) =>
      clinicPhysioApi.submitGoals(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", id] });
      toast.success("تم حفظ الأهداف");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitPosturalAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: PosturalAssessmentDto }) =>
      clinicPhysioApi.submitPosturalAssessment(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", id] });
      toast.success("تم حفظ التقييم الوضعي");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSubmitTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TreatmentPlanDto }) =>
      clinicPhysioApi.submitTreatmentPlan(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", id] });
      toast.success("تم حفظ خطة العلاج");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحفظ"),
  });
}

export function useSupervisorReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SupervisorReviewDto }) =>
      clinicPhysioApi.supervisorReview(id, dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", data.id] });
      toast.success("تم اعتماد نظرة رئيس القسم");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الاعتماد"),
  });
}

export function useSignPhysioTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signatureBase64 }: { id: string; signatureBase64: string }) =>
      clinicPhysioApi.signTreatmentPlan(id, signatureBase64),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-case", (data as any).id ?? ""] });
      qc.invalidateQueries({ queryKey: ["clinic-physio-cases"] });
      toast.success("تم توقيع خطة العلاج");
    },
    onError: (e: any) => {
      const errCode = e?.response?.data?.errorCode;
      if (errCode === "ALREADY_SIGNED")       toast.error("الخطة موقّعة مسبقاً ولا يمكن استبدالها");
      else if (errCode === "NOT_ASSIGNED_SIGNER") toast.error("التوقيع متاح فقط للطبيب المشرف المعيّن");
      else toast.error(e?.response?.data?.message || "فشل التوقيع");
    },
  });
}

export function usePhysioSessions(caseId: string) {
  return useQuery({
    queryKey: ["clinic-physio-sessions", caseId],
    queryFn: () => clinicPhysioApi.getSessions(caseId),
    enabled: !!caseId,
  });
}

export function useAddPhysioSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreatePhysioSessionDto }) =>
      clinicPhysioApi.addSession(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-sessions", id] });
      toast.success("تمت إضافة الجلسة");
    },
    onError: (e: any) => {
      const errCode = e?.response?.data?.errorCode;
      if (errCode === "DOCTOR_SIGNATURE_REQUIRED") toast.error("يجب توقيع الطبيب قبل بدء الجلسات");
      else toast.error(e?.response?.data?.message || "فشل إضافة الجلسة");
    },
  });
}

export function useDeletePhysioSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) =>
      clinicPhysioApi.deleteSession(id, sessionId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-physio-sessions", id] });
      toast.success("تم حذف الجلسة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

export function usePhysioTimeline(caseId: string) {
  return useQuery({
    queryKey: ["clinic-physio-timeline", caseId],
    queryFn: () => clinicPhysioApi.getTimeline(caseId),
    enabled: !!caseId,
  });
}

export function useDownloadPhysioPdf() {
  return useMutation({
    mutationFn: (caseId: string) => clinicPhysioApi.downloadPdf(caseId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
    onError: () => toast.error("فشل تنزيل PDF"),
  });
}
