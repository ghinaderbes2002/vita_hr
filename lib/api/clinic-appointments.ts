import { apiClient } from "./client";

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";
export type AppointmentType = "ASSESSMENT" | "FITTING" | "SESSION" | "FOLLOW_UP" | "COMMITTEE" | "EXAMINATION";
export type PractitionerRole = "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR" | "TECHNICIAN";

export interface Appointment {
  id: string;
  patientId: string;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string };
  caseId?: string | null;
  caseType?: "prosthetics" | "physio" | null;
  practitionerId: string;
  practitionerRole?: PractitionerRole | null;
  practitioner?: { id: string; firstName: string; lastName: string };
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  notes?: string | null;
  cancelReason?: string | null;
  cancelledReason?: string | null;
  physiotherapistId?: string | null;
  patientName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  patientId: string;
  caseId?: string;
  caseType?: "prosthetics" | "physio";
  practitionerId: string;
  practitionerRole: PractitionerRole;
  physiotherapistId?: string;
  appointmentType: AppointmentType;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {
  status?: AppointmentStatus;
  cancelReason?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AppointmentListParams {
  page?: number;
  limit?: number;
  date?: string;
  practitionerId?: string;
  status?: AppointmentStatus;
}

export const clinicAppointmentsApi = {
  create: async (dto: CreateAppointmentDto): Promise<Appointment> => {
    const { data } = await apiClient.post("/appointments", dto);
    return data?.data ?? data;
  },

  list: async (params?: AppointmentListParams) => {
    const { data } = await apiClient.get("/appointments", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items ?? d?.data ?? (Array.isArray(d) ? d : []) as Appointment[],
      total: d?.total ?? 0,
      page: d?.page ?? 1,
      limit: d?.limit ?? 10,
      totalPages: d?.totalPages ?? 0,
    };
  },

  getCalendar: async (from: string, to: string): Promise<Appointment[]> => {
    const { data } = await apiClient.get("/appointments/calendar", { params: { from, to } });
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getSlots: async (practitionerId: string, date?: string): Promise<TimeSlot[]> => {
    const { data } = await apiClient.get(`/appointments/practitioner/${practitionerId}/slots`, {
      params: date ? { date } : undefined,
    });
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : [];
  },

  update: async (id: string, dto: UpdateAppointmentDto): Promise<Appointment> => {
    const { data } = await apiClient.put(`/appointments/${id}`, dto);
    return data?.data ?? data;
  },

  cancel: async (id: string, reason?: string): Promise<Appointment> => {
    const { data } = await apiClient.put(`/appointments/${id}/cancel`, { reason });
    return data?.data ?? data;
  },

  reschedule: async (id: string, dto: { date: string; startTime: string; endTime: string }): Promise<Appointment> => {
    const { data } = await apiClient.put(`/appointments/${id}/reschedule`, dto);
    return data?.data ?? data;
  },

  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const { data } = await apiClient.put(`/appointments/${id}/status`, { status });
    return data?.data ?? data;
  },

  getPractitionerPatients: async (practitionerId?: string): Promise<string[]> => {
    const { data } = await apiClient.get("/appointments/practitioner-patients", {
      params: practitionerId ? { practitionerId } : undefined,
    });
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.patientIds ?? d?.items ?? [];
  },
};
