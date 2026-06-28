import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicAppointmentsApi, CreateAppointmentDto, UpdateAppointmentDto, AppointmentListParams, AppointmentStatus } from "@/lib/api/clinic-appointments";
import { toast } from "sonner";

export function useClinicAppointments(params?: AppointmentListParams) {
  return useQuery({
    queryKey: ["clinic-appointments", params],
    queryFn: () => clinicAppointmentsApi.list(params),
  });
}

export function useClinicCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["clinic-calendar", from, to],
    queryFn: () => clinicAppointmentsApi.getCalendar(from, to),
    enabled: !!from && !!to,
  });
}

export function usePractitionerSlots(practitionerId: string, date?: string) {
  return useQuery({
    queryKey: ["clinic-slots", practitionerId, date],
    queryFn: () => clinicAppointmentsApi.getSlots(practitionerId, date),
    enabled: !!practitionerId,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) => clinicAppointmentsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-appointments"] });
      qc.invalidateQueries({ queryKey: ["clinic-calendar"] });
      toast.success("تم حجز الموعد");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل حجز الموعد"),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAppointmentDto }) =>
      clinicAppointmentsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-appointments"] });
      qc.invalidateQueries({ queryKey: ["clinic-calendar"] });
      toast.success("تم تحديث الموعد");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      clinicAppointmentsApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-appointments"] });
      qc.invalidateQueries({ queryKey: ["clinic-calendar"] });
      toast.success("تم إلغاء الموعد");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإلغاء"),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { date: string; startTime: string; endTime: string } }) =>
      clinicAppointmentsApi.reschedule(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-appointments"] });
      qc.invalidateQueries({ queryKey: ["clinic-calendar"] });
      toast.success("تم إعادة جدولة الموعد");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل إعادة الجدولة"),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      clinicAppointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-appointments"] });
      qc.invalidateQueries({ queryKey: ["clinic-calendar"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل تغيير الحالة"),
  });
}

export function usePractitionerPatients(practitionerId?: string, enabled = true) {
  return useQuery({
    queryKey: ["practitioner-patients", practitionerId],
    queryFn: () => clinicAppointmentsApi.getPractitionerPatients(practitionerId),
    staleTime: 60_000,
    enabled,
  });
}
