import { apiClient } from "./client";

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";
export type AppointmentType = "ASSESSMENT" | "FITTING" | "SESSION" | "FOLLOW_UP" | "COMMITTEE" | "EXAMINATION";
export type PractitionerRole = "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR" | "TECHNICIAN";

export interface Appointment {
  id: string;
  patientId: string;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string };
  caseId?: string | null;
  caseType?: "PROSTHETICS" | "PHYSIO" | "GENERAL" | null;
  practitionerId: string;
  practitionerRole?: PractitionerRole | null;
  practitioner?: { id: string; firstName: string; lastName: string };
  departmentId?: string | null;
  department?: { id: string; nameAr?: string; nameEn?: string } | null;
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
  /** Additional therapists assigned to the appointment (they get notified). */
  therapistIds?: string[] | null;
  therapists?: { id: string; firstName?: string; lastName?: string; firstNameAr?: string; lastNameAr?: string }[] | null;
  patientName?: string | null;
  patientNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  patientId: string;
  caseId?: string;
  caseType?: "PROSTHETICS" | "PHYSIO" | "GENERAL";
  practitionerId: string;
  practitionerRole?: PractitionerRole;   // now optional (replaced by department)
  departmentId?: string;                 // clinic department the appointment belongs to
  physiotherapistId?: string;
  appointmentType: AppointmentType;
  startTime: string;
  endTime: string;
  notes?: string;
  /** Additional therapist user IDs; each is notified. Send [] to clear all. */
  therapistIds?: string[];
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
  departmentId?: string;
  patientId?: string;
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

  // Appointments where the logged-in therapist is the main practitioner, the
  // physiotherapist, or one of the additional therapists.
  myAppointments: async (params?: AppointmentListParams) => {
    const { data } = await apiClient.get("/appointments/my-appointments", { params });
    const d = data?.data ?? data;
    return {
      items: (d?.items ?? d?.data ?? (Array.isArray(d) ? d : [])) as Appointment[],
      total: d?.total ?? 0,
      page: d?.page ?? 1,
      limit: d?.limit ?? 50,
      totalPages: d?.totalPages ?? 0,
    };
  },

  // Every appointment of a single patient. The patientId filter is sent to the
  // API, but the result is narrowed client-side too so the numbers stay right
  // even if the backend ignores (or rejects) the filter.
  listByPatient: async (patientId: string): Promise<Appointment[]> => {
    const mine = (items: Appointment[]) => items.filter((a) => a.patientId === patientId);
    try {
      const { items } = await clinicAppointmentsApi.list({ patientId, limit: 500 });
      return mine(items);
    } catch {
      const { items } = await clinicAppointmentsApi.list({ limit: 500 });
      return mine(items);
    }
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
