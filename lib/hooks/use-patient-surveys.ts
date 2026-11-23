import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  patientSurveysApi, CreatePatientSurveyDto, PatientSurveyListParams, PatientSurveyStatsParams,
} from "@/lib/api/patient-surveys";
import { toast } from "sonner";

export function usePatientSurveys(params?: PatientSurveyListParams, enabled = true) {
  return useQuery({
    queryKey: ["patient-surveys", params],
    queryFn: () => patientSurveysApi.list(params),
    enabled,
  });
}

// Under the "patient-surveys" prefix, so saving a survey refreshes it too.
export function usePatientSurveyStats(params?: PatientSurveyStatsParams, enabled = true) {
  return useQuery({
    queryKey: ["patient-surveys", "stats", params],
    queryFn: () => patientSurveysApi.stats(params),
    enabled,
  });
}

// Under the "patient-surveys" prefix: saving the survey drops the patient off the list.
export function useSurveyPendingFollowups(enabled = true) {
  return useQuery({
    queryKey: ["patient-surveys", "pending-followups"],
    queryFn: () => patientSurveysApi.pendingFollowups(),
    enabled,
  });
}

export function usePatientSurvey(id?: string | null) {
  return useQuery({
    queryKey: ["patient-surveys", "one", id],
    queryFn: () => patientSurveysApi.get(id!),
    enabled: !!id,
  });
}

export function useCreatePatientSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePatientSurveyDto) => patientSurveysApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-surveys"] });
      toast.success("تم حفظ الاستبيان");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حفظ الاستبيان"),
  });
}
