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
} from "@/lib/api/attendance-records";

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
      toast.error(error.response?.data?.message || t("messages.checkInError"));
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
      toast.error(error.response?.data?.message || t("messages.checkOutError"));
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
      toast.error(error.response?.data?.message || t("messages.saveError"));
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
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
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
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}
