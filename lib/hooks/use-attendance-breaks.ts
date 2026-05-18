import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceBreaksApi, BreakType } from "@/lib/api/attendance-breaks";
import { toast } from "sonner";

export function useAttendanceBreaks(recordId: string) {
  return useQuery({
    queryKey: ["attendance-breaks", recordId],
    queryFn: () => attendanceBreaksApi.getByRecord(recordId),
    enabled: !!recordId,
  });
}

export function useMyBreaks(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["my-breaks", params],
    queryFn: () => attendanceBreaksApi.getMyBreaks(params),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, recordId?: string) {
  qc.invalidateQueries({ queryKey: ["attendance-breaks"] });
  if (recordId) qc.invalidateQueries({ queryKey: ["attendance-breaks", recordId] });
}

export function useAuthorizeBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ breakId, reason }: { breakId: string; reason: string; recordId?: string }) =>
      attendanceBreaksApi.authorize(breakId, reason),
    onSuccess: (_, vars) => {
      toast.success("تم اعتماد الاستراحة");
      invalidate(qc, vars.recordId);
    },
    onError: () => toast.error("فشل الاعتماد، حاول مرة أخرى"),
  });
}

export function useRejectBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ breakId, reason }: { breakId: string; reason: string; recordId?: string }) =>
      attendanceBreaksApi.reject(breakId, reason),
    onSuccess: (_, vars) => {
      toast.success("تم رفض الاستراحة");
      invalidate(qc, vars.recordId);
    },
    onError: () => toast.error("فشل الرفض، حاول مرة أخرى"),
  });
}

export function useUpdateBreakType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ breakId, type }: { breakId: string; type: BreakType; recordId?: string }) =>
      attendanceBreaksApi.updateType(breakId, type),
    onSuccess: (_, vars) => {
      toast.success("تم تحديث نوع الاستراحة");
      invalidate(qc, vars.recordId);
    },
    onError: () => toast.error("فشل التحديث"),
  });
}
