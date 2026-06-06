import { apiClient } from "./client";

export type DocumentType =
  | "ID_COPY" | "PERSONAL_PHOTO" | "AMPUTATION_PHOTO"
  | "RESIDUAL_LIMB_PHOTO" | "MEDICAL_REPORT" | "OTHER";

export type Gender         = "MALE" | "FEMALE";
export type IdentityType   = "NATIONAL_ID" | "PASSPORT" | "UNHCR" | "OTHER";
export type EducationLevel = "ILLITERATE" | "PRIMARY" | "SECONDARY" | "HIGH_SCHOOL" | "UNIVERSITY" | "POSTGRADUATE";
export type MaritalStatus  = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
export type LivingCondition = "WITH_FAMILY" | "INDEPENDENT" | "SHELTER_CAMP" | "OTHER";
export type FinancialStatus = "LOW" | "MODERATE" | "GOOD" | "NOT_WORKING" | "RETIRED";
export type ConsentOption   = "FULL" | "ANONYMOUS" | "NONE";

export interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  identityType: IdentityType;
  idNumber: string;
  dateOfBirth: string;
  gender: Gender;
  occupation?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  cityId?: number | string | null;
  city?: { id: number | string; name: string; governorate: string } | null;
  addressDetails?: string | null;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  educationLevel?: EducationLevel | null;
  maritalStatus?: MaritalStatus | null;
  livingCondition?: LivingCondition | null;
  financialStatus?: FinancialStatus | null;
  receivesAid?: boolean;
  referralSource?: string | null;
  referralDetails?: string | null;
  photoUrl?: string | null;
  documentConsent?: ConsentOption | null;
  mediaConsent?: boolean;
  notes?: string | null;
  activeProstheticsCount?: number;
  activePhysioCount?: number;
  lastVisitDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  type: DocumentType;
  url: string;
  createdAt: string;
}

export interface PatientConsent {
  id: string;
  patientId: string;
  documentConsent: ConsentOption;
  mediaConsent: boolean;
  signatureUrl?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

export interface PatientNote {
  id: string;
  patientId: string;
  note: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  identityType: IdentityType;
  idNumber: string;
  dateOfBirth: string;
  gender: Gender;
  occupation?: string;
  heightCm?: number;
  weightKg?: number;
  cityId?: number | string;
  addressDetails?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  educationLevel?: EducationLevel;
  maritalStatus?: MaritalStatus;
  livingCondition?: LivingCondition;
  financialStatus?: FinancialStatus;
  receivesAid?: boolean;
  referralSource?: string;
  referralDetails?: string;
  photoUrl?: string;
  documentConsent?: ConsentOption;
  mediaConsent?: boolean;
  notes?: string;
}

export interface UpdatePatientDto extends Partial<CreatePatientDto> {}

export interface PatientListParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  gender?: Gender;
  ageMin?: number;
  ageMax?: number;
  caseType?: "prosthetics" | "physio" | "both";
}

export interface PaginatedPatients {
  items: Patient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const clinicPatientsApi = {
  list: async (params?: PatientListParams): Promise<PaginatedPatients> => {
    const { data } = await apiClient.get("/patients", { params });
    const d = data?.data ?? data;
    return {
      items: d?.items ?? d?.data ?? (Array.isArray(d) ? d : []),
      total: d?.total ?? 0,
      page: d?.page ?? 1,
      limit: d?.limit ?? 10,
      totalPages: d?.totalPages ?? 0,
    };
  },

  getById: async (id: string): Promise<Patient> => {
    const { data } = await apiClient.get(`/patients/${id}`);
    return data?.data ?? data;
  },

  create: async (dto: CreatePatientDto): Promise<Patient> => {
    const { identityType, ...rest } = dto;
    const { data } = await apiClient.post("/patients", { ...rest, idType: identityType });
    return data?.data ?? data;
  },

  update: async (id: string, dto: UpdatePatientDto): Promise<Patient> => {
    const { identityType, ...rest } = dto;
    const payload = identityType ? { ...rest, idType: identityType } : rest;
    const { data } = await apiClient.put(`/patients/${id}`, payload);
    return data?.data ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/patients/${id}`);
  },

  checkDuplicate: async (idNumber: string): Promise<{ exists: boolean; patientId?: string }> => {
    const { data } = await apiClient.get("/patients/check-duplicate", { params: { idNumber } });
    return data?.data ?? data;
  },

  uploadDocument: async (patientId: string, file: File, type: DocumentType): Promise<PatientDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const { data } = await apiClient.post(`/patients/${patientId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data ?? data;
  },

  downloadDocument: async (patientId: string, docId: string): Promise<Blob> => {
    const response = await apiClient.get(`/patients/${patientId}/documents/${docId}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  getDocuments: async (patientId: string): Promise<PatientDocument[]> => {
    const { data } = await apiClient.get(`/patients/${patientId}/documents`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  deleteDocument: async (patientId: string, docId: string): Promise<void> => {
    await apiClient.delete(`/patients/${patientId}/documents/${docId}`);
  },

  createConsent: async (
    patientId: string,
    dto: { documentConsent: ConsentOption; mediaConsent: boolean; signatureBase64?: string },
  ): Promise<PatientConsent> => {
    const { data } = await apiClient.post(`/patients/${patientId}/consents`, dto);
    return data?.data ?? data;
  },

  getConsents: async (patientId: string): Promise<PatientConsent[]> => {
    const { data } = await apiClient.get(`/patients/${patientId}/consents`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  createNote: async (patientId: string, note: string): Promise<PatientNote> => {
    const { data } = await apiClient.post(`/patients/${patientId}/notes`, { note });
    return data?.data ?? data;
  },

  getNotes: async (patientId: string): Promise<PatientNote[]> => {
    const { data } = await apiClient.get(`/patients/${patientId}/notes`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },
};
