import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicPatientsApi, CreatePatientDto, UpdatePatientDto, PatientListParams, DocumentType } from "@/lib/api/clinic-patients";
import { toast } from "sonner";

export function useClinicPatients(params?: PatientListParams, enabled = true) {
  return useQuery({
    queryKey: ["clinic-patients", params],
    queryFn: () => clinicPatientsApi.list(params),
    enabled,
  });
}

export function useExportPatients() {
  return useMutation({
    mutationFn: (params?: { from?: string; to?: string }) => clinicPatientsApi.exportXlsx(params),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تصدير ملف المرضى");
    },
    // The request asked for a blob, so an error body arrives as one too — read the
    // server's message out of it instead of showing a generic failure.
    onError: async (error: unknown) => {
      let message: string | undefined;
      const body = (error as { response?: { data?: unknown } } | null)?.response?.data;
      if (body instanceof Blob) {
        try {
          const parsed = JSON.parse(await body.text());
          message = parsed?.error?.message ?? parsed?.message;
        } catch { /* not JSON */ }
      }
      toast.error(message || "فشل تصدير ملف المرضى");
    },
  });
}

export function useClinicPatient(id: string) {
  return useQuery({
    queryKey: ["clinic-patient", id],
    queryFn: () => clinicPatientsApi.getById(id),
    enabled: !!id,
  });
}

export function useCheckDuplicate(idNumber: string) {
  return useQuery({
    queryKey: ["clinic-patient-duplicate", idNumber],
    queryFn: () => clinicPatientsApi.checkDuplicate(idNumber),
    enabled: idNumber.length >= 7,
  });
}

export function useCreateClinicPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePatientDto) => clinicPatientsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-patients"] });
      toast.success("تم تسجيل المريض بنجاح");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التسجيل"),
  });
}

export function useUpdateClinicPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePatientDto }) => clinicPatientsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clinic-patient", id] });
      qc.invalidateQueries({ queryKey: ["clinic-patients"] });
      toast.success("تم تحديث بيانات المريض");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeleteClinicPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicPatientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-patients"] });
      toast.success("تم حذف المريض");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

export function usePatientDocuments(patientId: string) {
  return useQuery({
    queryKey: ["clinic-patient-documents", patientId],
    queryFn: () => clinicPatientsApi.getDocuments(patientId),
    enabled: !!patientId,
  });
}

export function useUploadPatientDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, file, type }: { patientId: string; file: File; type: DocumentType }) =>
      clinicPatientsApi.uploadDocument(patientId, file, type),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries({ queryKey: ["clinic-patient-documents", patientId] });
      toast.success("تم رفع المستند");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل رفع المستند"),
  });
}

export function useDownloadPatientDocument() {
  return useMutation({
    mutationFn: ({ patientId, docId }: { patientId: string; docId: string }) =>
      clinicPatientsApi.downloadDocument(patientId, docId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
    onError: () => toast.error("فشل تحميل المستند"),
  });
}

export function useDeletePatientDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, docId }: { patientId: string; docId: string }) =>
      clinicPatientsApi.deleteDocument(patientId, docId),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries({ queryKey: ["clinic-patient-documents", patientId] });
      toast.success("تم حذف المستند");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

export function usePatientConsents(patientId: string) {
  return useQuery({
    queryKey: ["clinic-patient-consents", patientId],
    queryFn: () => clinicPatientsApi.getConsents(patientId),
    enabled: !!patientId,
  });
}

export function useCreatePatientConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, dto }: { patientId: string; dto: Parameters<typeof clinicPatientsApi.createConsent>[1] }) =>
      clinicPatientsApi.createConsent(patientId, dto),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries({ queryKey: ["clinic-patient-consents", patientId] });
      toast.success("تم حفظ الموافقة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حفظ الموافقة"),
  });
}

export function usePatientNotes(patientId: string) {
  return useQuery({
    queryKey: ["clinic-patient-notes", patientId],
    queryFn: () => clinicPatientsApi.getNotes(patientId),
    enabled: !!patientId,
  });
}

export function useCreatePatientNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, note }: { patientId: string; note: string }) =>
      clinicPatientsApi.createNote(patientId, note),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries({ queryKey: ["clinic-patient-notes", patientId] });
      toast.success("تمت إضافة الملاحظة");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إضافة الملاحظة"),
  });
}
