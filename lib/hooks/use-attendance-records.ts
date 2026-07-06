import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  attendanceRecordsApi,
  CheckInData,
  CheckOutData,
  CreateAttendanceRecordData,
  UpdateAttendanceRecordData,
  AttendanceQueryParams,
  InterpretedType,
  NeedsReviewQueryParams,
} from "@/lib/api/attendance-records";
export type { AttendanceBreak, RawStamp, InterpretedType, NeedsReviewResponse } from "@/lib/api/attendance-records";

export function useMyAttendance(params: AttendanceQueryParams) {
  return useQuery({
    queryKey: ["attendance-records", "my-attendance", params],
    queryFn: () => attendanceRecordsApi.getMyAttendance(params),
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}

export function useAttendanceRecords(params: AttendanceQueryParams) {
  return useQuery({
    queryKey: ["attendance-records", params],
    queryFn: () => attendanceRecordsApi.getAll(params),
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}

export function useAttendanceRecord(id: string) {
  return useQuery({
    queryKey: ["attendance-records", id],
    queryFn: () => attendanceRecordsApi.getById(id),
    enabled: !!id,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CheckInData) => attendanceRecordsApi.checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success(t("messages.checkInSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.checkInError"));
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CheckOutData) => attendanceRecordsApi.checkOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success(t("messages.checkOutSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.checkOutError"));
    },
  });
}

export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CreateAttendanceRecordData) => attendanceRecordsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceRecordData }) =>
      attendanceRecordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useAttendanceRecordBreaks(id: string) {
  return useQuery({
    queryKey: ["attendance-records", id, "breaks"],
    queryFn: () => attendanceRecordsApi.getBreaks(id),
    enabled: !!id,
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => attendanceRecordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.deleteError"));
    },
  });
}

export function useRawStamps(recordId: string) {
  return useQuery({
    queryKey: ["attendance-records", recordId, "raw-stamps"],
    queryFn: () => attendanceRecordsApi.getRawStamps(recordId),
    enabled: !!recordId,
  });
}

export function useUpdateStampInterpretation(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, interpretedAs, deviceId }: { logId: string; interpretedAs: InterpretedType; deviceId?: string }) =>
      attendanceRecordsApi.updateInterpretation(logId, { interpretedAs, ...(deviceId ? { deviceId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records", recordId] });
      queryClient.refetchQueries({ queryKey: ["attendance-records", recordId, "raw-stamps"] });
      toast.success("تم تحديث التفسير");
    },
    onError: () => toast.error("فشل تحديث التفسير"),
  });
}

export function useDeleteStamp(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => attendanceRecordsApi.deleteStamp(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records", recordId] });
      queryClient.refetchQueries({ queryKey: ["attendance-records", recordId, "raw-stamps"] });
      toast.success("تم حذف البصمة");
    },
    onError: () => toast.error("فشل حذف البصمة"),
  });
}

export function useRecomputeRecord(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceRecordsApi.recompute(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records", recordId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-records", recordId, "raw-stamps"] });
      toast.success("تمت إعادة الحساب بنجاح");
    },
    onError: () => toast.error("فشلت إعادة الحساب"),
  });
}

export function useApproveRecord(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceRecordsApi.approveRecord(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records", recordId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-records", "needs-review"] });
      toast.success("تم اعتماد السجل");
    },
    onError: () => toast.error("فشل اعتماد السجل"),
  });
}

export function useAddManualStamp(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { timestamp: string; interpretedAs: InterpretedType; deviceId?: string }) =>
      attendanceRecordsApi.addManualStamp(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records", recordId] });
      queryClient.refetchQueries({ queryKey: ["attendance-records", recordId, "raw-stamps"] });
      toast.success("تمت إضافة البصمة اليدوية");
    },
    onError: () => toast.error("فشلت إضافة البصمة"),
  });
}

export function useNeedsReview(params?: NeedsReviewQueryParams) {
  return useQuery({
    queryKey: ["attendance-records", "needs-review", params],
    queryFn: () => attendanceRecordsApi.getNeedsReview(params),
  });
}
