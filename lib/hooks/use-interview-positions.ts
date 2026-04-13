import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { interviewPositionsApi, CreateInterviewPositionData, PositionStatus } from "@/lib/api/interview-positions";
import { toast } from "sonner";

export function useInterviewPositions(params?: { page?: number; limit?: number; status?: PositionStatus }) {
  return useQuery({
    queryKey: ["interview-positions", params],
    queryFn: () => interviewPositionsApi.getAll(params),
  });
}

export function useInterviewPosition(id: string) {
  return useQuery({
    queryKey: ["interview-position", id],
    queryFn: () => interviewPositionsApi.getById(id),
    enabled: !!id,
  });
}

export function useInterviewPositionComparison(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["interview-position-comparison", id],
    queryFn: () => interviewPositionsApi.getComparison(id),
    enabled: enabled && !!id,
  });
}

export function useCreateInterviewPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewPositionData) => interviewPositionsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-positions"] }); toast.success("تم إنشاء الشاغر بنجاح"); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useUpdateInterviewPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInterviewPositionData> & { status?: PositionStatus } }) =>
      interviewPositionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["interview-positions"] });
      qc.invalidateQueries({ queryKey: ["interview-position", id] });
      toast.success("تم التحديث بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useDeleteInterviewPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => interviewPositionsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-positions"] }); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

// Technical Questions
export function useTechnicalQuestions(positionId: string) {
  return useQuery({
    queryKey: ["technical-questions", positionId],
    queryFn: () => interviewPositionsApi.getTechnicalQuestions(positionId),
    enabled: !!positionId,
  });
}

export function useAddTechnicalQuestion(positionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; maxScore: number; displayOrder?: number }) =>
      interviewPositionsApi.addTechnicalQuestion(positionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technical-questions", positionId] });
      qc.invalidateQueries({ queryKey: ["interview-position", positionId] });
      toast.success("تمت إضافة السؤال");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}

export function useDeleteTechnicalQuestion(positionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => interviewPositionsApi.deleteTechnicalQuestion(positionId, questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technical-questions", positionId] });
      qc.invalidateQueries({ queryKey: ["interview-position", positionId] });
      toast.success("تم حذف السؤال");
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || e.response?.data?.message || "حدث خطأ"),
  });
}
