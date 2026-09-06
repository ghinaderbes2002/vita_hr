import { apiClient } from "./client";

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";
export type AppointmentType =
  // Prosthetics & Podiatry
  | "COMPANY_EXAMINATION" | "REFERRAL_EXAMINATION" | "TRIAL_DELIVERY" | "FINAL_DELIVERY"
  | "REVIEW" | "IMPRESSION_TAKING" | "MEASUREMENT_TAKING" | "WHEELCHAIR_DELIVERY"
  | "WARRANTY_DELIVERY" | "COSMETIC_DELIVERY" | "ANALYSIS" | "INSTALLATION"
  // Medical Administration (orthopaedic)
  | "ORTHOPEDIC_EXAMINATION" | "FOOT_ANALYSIS_EXAMINATION" | "LIMB_PATIENT_EXAMINATION"
  // Physiotherapy
  | "SESSION" | "ASSESSMENT" | "FOLLOW_UP"
  // Older values, still returned on existing records
  | "FITTING" | "COMMITTEE" | "EXAMINATION";

/**
 * Which appointment types each clinical department accepts. A department that
 * appears in none of these has no restriction — the server takes any type.
 */
export const PROSTHETICS_PODIATRY_APPOINTMENT_TYPES: AppointmentType[] = [
  "COMPANY_EXAMINATION", "REFERRAL_EXAMINATION", "TRIAL_DELIVERY", "FINAL_DELIVERY",
  "REVIEW", "IMPRESSION_TAKING", "MEASUREMENT_TAKING", "WHEELCHAIR_DELIVERY",
  "WARRANTY_DELIVERY", "COSMETIC_DELIVERY", "ANALYSIS", "INSTALLATION",
];

export const MEDICAL_ADMIN_APPOINTMENT_TYPES: AppointmentType[] = [
  "ORTHOPEDIC_EXAMINATION", "FOOT_ANALYSIS_EXAMINATION", "LIMB_PATIENT_EXAMINATION",
];

export const PHYSIO_APPOINTMENT_TYPES: AppointmentType[] = [
  "SESSION", "ASSESSMENT", "FOLLOW_UP",
];

/** Everything the picker may offer when no department narrows the choice. */
export const ALL_APPOINTMENT_TYPES: AppointmentType[] = [
  ...PROSTHETICS_PODIATRY_APPOINTMENT_TYPES,
  ...MEDICAL_ADMIN_APPOINTMENT_TYPES,
  ...PHYSIO_APPOINTMENT_TYPES,
  "FITTING", "COMMITTEE", "EXAMINATION",
];
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
  /**
   * Still returned for an open-ended booking, where it is the 15-minute buffer
   * the server reserves rather than a real finish time — don't show it as one.
   */
  endTime: string;
  /** The visit runs until the practitioner is done; `endTime` is only a buffer. */
  isOpenEnded?: boolean;
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
  /** The registered patient's phone; empty string for a walk-in with no record. */
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  /**
   * Omitted for a walk-in who is not in the patients list yet — send
   * `patientName` instead. Exactly one of the two is required.
   */
  patientId?: string;
  /** Free-text name for an unregistered patient; creates no patient record. */
  patientName?: string;
  caseId?: string;
  caseType?: "PROSTHETICS" | "PHYSIO" | "GENERAL";
  practitionerId: string;
  practitionerRole?: PractitionerRole;   // now optional (replaced by department)
  departmentId?: string;                 // clinic department the appointment belongs to
  physiotherapistId?: string;
  appointmentType: AppointmentType;
  startTime: string;
  /** Required unless `isOpenEnded` is true, where the server picks the buffer. */
  endTime?: string;
  /** Book without a finish time; the server reserves 15 minutes after the start. */
  isOpenEnded?: boolean;
  notes?: string;
  /** Additional therapist user IDs; each is notified. Send [] to clear all. */
  therapistIds?: string[];
}

export interface RescheduleAppointmentDto {
  /** Full ISO timestamp — it carries the date, so none is sent separately. */
  startTime: string;
  /** Required unless `isOpenEnded` is true, where the server picks the buffer. */
  endTime?: string;
  /**
   * Send `true` to keep (or make) the booking open-ended, and `false` to turn an
   * open-ended one back into a fixed slot — alongside an `endTime`. Omit it when
   * a fixed booking stays fixed.
   */
  isOpenEnded?: boolean;
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

  reschedule: async (id: string, dto: RescheduleAppointmentDto): Promise<Appointment> => {
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
