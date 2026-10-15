import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clinicOrthoticsApi,
  CreateOrthoticsReceptionDto,
  OrthoticsDoctorAssessment,
  OrthoticsGuardianDto,
  OrthoticsPhysioAssessment,
} from "@/lib/api/clinic-orthotics";

type ApiError = { response?: { data?: { message?: string; error?: { message?: string } } } };
const errMsg = (e: unknown, fallback: string) => {
  const d = (e as ApiError)?.response?.data;
  return d?.error?.message || d?.message || fallback;
};

export function useOrthoticsReceptions(patientId?: string, enabled = true) {
  return useQuery({
    queryKey: ["orthotics-receptions", patientId ?? "all"],
    queryFn: () => clinicOrthoticsApi.getReceptions(patientId),
    enabled,
  });
}

/** الاستقبالات التي عُيّن المستخدم الحالي معالجاً فيها. */
export function useOrthoticsMyPatients(enabled = true) {
  return useQuery({
    queryKey: ["orthotics-my-patients"],
    queryFn: () => clinicOrthoticsApi.getMyPatients(),
    enabled,
  });
}

export function useOrthoticsReception(id: string) {
  return useQuery({
    queryKey: ["orthotics-reception", id],
    queryFn: () => clinicOrthoticsApi.getReception(id),
    enabled: !!id,
  });
}

/** Every write answers with the whole reception, so all views are refreshed. */
function useInvalidateReception() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["orthotics-receptions"] });
    qc.invalidateQueries({ queryKey: ["orthotics-my-patients"] });
    if (id) qc.invalidateQueries({ queryKey: ["orthotics-reception", id] });
  };
}

export function useCreateOrthoticsReception() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: (dto: CreateOrthoticsReceptionDto) => clinicOrthoticsApi.createReception(dto),
    onSuccess: () => {
      invalidate();
      toast.success("تم إنشاء الاستقبال");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل إنشاء الاستقبال")),
  });
}

export function useUpdateOrthoticsReception() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: OrthoticsGuardianDto }) =>
      clinicOrthoticsApi.updateReception(id, dto),
    onSuccess: (_, { id }) => {
      invalidate(id);
      toast.success("تم حفظ التعديلات");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ التعديلات")),
  });
}

/** القائمة المرسلة تستبدل الفريق بالكامل. */
export function useAssignOrthoticsPractitioners() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: ({ id, practitionerIds }: { id: string; practitionerIds: string[] }) =>
      clinicOrthoticsApi.assignPractitioners(id, practitionerIds),
    onSuccess: (_, { id }) => {
      invalidate(id);
      toast.success("تم حفظ فريق المعالجين");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ فريق المعالجين")),
  });
}

export function useSaveOrthoticsDoctorAssessment() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: OrthoticsDoctorAssessment }) =>
      clinicOrthoticsApi.saveDoctorAssessment(id, dto),
    onSuccess: (_, { id }) => {
      invalidate(id);
      toast.success("تم حفظ تقييم طبيب العظمية");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ تقييم طبيب العظمية")),
  });
}

export function useSaveOrthoticsPhysioAssessment() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: OrthoticsPhysioAssessment }) =>
      clinicOrthoticsApi.savePhysioAssessment(id, dto),
    onSuccess: (_, { id }) => {
      invalidate(id);
      toast.success("تم حفظ تقييم العلاج الفيزيائي");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ تقييم العلاج الفيزيائي")),
  });
}

export function useSaveOrthoticsProsthetistOpinion() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: ({ id, opinion }: { id: string; opinion: string }) =>
      clinicOrthoticsApi.saveProsthetistOpinion(id, opinion),
    onSuccess: (_, { id }) => {
      invalidate(id);
      toast.success("تم حفظ رأي أخصائي الأطراف الصناعية");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حفظ رأي أخصائي الأطراف الصناعية")),
  });
}

export function useDeleteOrthoticsReception() {
  const invalidate = useInvalidateReception();
  return useMutation({
    mutationFn: (id: string) => clinicOrthoticsApi.deleteReception(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الاستقبال");
    },
    onError: (e: unknown) => toast.error(errMsg(e, "فشل حذف الاستقبال")),
  });
}
