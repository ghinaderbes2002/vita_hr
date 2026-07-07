import { apiClient } from "./client";
import { Employee, ApiResponse, PaginationParams } from "@/types";

export interface TransferDto {
  departmentId?: string;
  jobTitleId?: string;
  jobGradeId?: string;
  managerId?: string;
  basicSalary?: number;
  salaryCurrency?: string;
  effectiveDate: string;
  note?: string;
}

export interface SalaryChangeDto {
  basicSalary: number;
  salaryCurrency: string;
  eventType?: "SALARY_CHANGE" | "PROMOTION";
  effectiveDate: string;
  note?: string;
}

export interface DossierEvent {
  id?: string;
  category: "HISTORY" | "PENALTY" | "REWARD" | "SALARY_ADVANCE" | "LEAVE_REQUEST" | "REQUEST";
  type: string;
  date: string;
  fromValue?: Record<string, any>;
  toValue?: Record<string, any>;
  amount?: number;
  penaltyDays?: number;
  reason?: string;
  status?: string;
  note?: string;
  performedBy?: string;
  remainingBalance?: number;
  // LEAVE_REQUEST fields
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  // REQUEST fields
  requestNumber?: string;
}

export interface DossierResponse {
  employee: Record<string, any>;
  timeline: DossierEvent[];
}

export const employeesApi = {
  getAll: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Employee[]>> => {
    const response = await apiClient.get("/employees", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data.data;
  },

  getBasicById: async (id: string): Promise<Partial<Employee> & { department?: { id: string; nameAr: string; nameEn: string } }> => {
    const response = await apiClient.get(`/employees/${id}/basic`);
    return response.data?.data ?? response.data;
  },

  getBasicList: async (): Promise<{ id: string; firstNameAr: string; lastNameAr: string; firstNameEn?: string; lastNameEn?: string; employeeNumber?: string; userId?: string; department?: { id: string; nameAr: string; nameEn: string }; employmentStatus?: string }[]> => {
    const response = await apiClient.get("/employees/basic");
    const d = response.data;
    return Array.isArray(d?.data?.items) ? d.data.items :
           Array.isArray(d?.data) ? d.data :
           Array.isArray(d) ? d : [];
  },

  getByCompany: async (company: string): Promise<{ id: string; firstNameAr: string; lastNameAr: string; employeeNumber?: string; company?: string; department?: { id: string; nameAr: string }; jobTitle?: { id: string; titleAr: string } }[]> => {
    const response = await apiClient.get(`/employees/by-company/${company}`);
    const d = response.data;
    return Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
  },

  getMyProfile: async (): Promise<Employee> => {
    const response = await apiClient.get("/employees/my");
    return response.data?.data || response.data;
  },

  create: async (data: Record<string, any>): Promise<Employee> => {
    const response = await apiClient.post("/employees", data);
    return response.data.data;
  },

  update: async (id: string, data: Record<string, any>): Promise<Employee> => {
    const response = await apiClient.patch(`/employees/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employees/${id}`);
  },

  getSubordinates: async (managerId: string): Promise<Employee[]> => {
    const response = await apiClient.get(`/employees/manager/${managerId}/subordinates`);
    return response.data.data;
  },

  linkUser: async (employeeId: string, userId: string): Promise<void> => {
    await apiClient.post(`/employees/${employeeId}/link-user`, { userId });
  },

  getByDepartment: async (departmentId: string): Promise<Employee[]> => {
    const response = await apiClient.get(`/employees/department/${departmentId}`);
    return response.data.data;
  },

  getManagerNotes: async (id: string): Promise<{ managerNotes: string | null; managerNotesUpdatedAt: string | null; managerNotesUpdatedBy: string | null }> => {
    const response = await apiClient.get(`/employees/${id}/manager-notes`);
    return response.data.data ?? response.data;
  },

  updateManagerNotes: async (id: string, notes: string): Promise<void> => {
    await apiClient.put(`/employees/${id}/manager-notes`, { notes });
  },

  exportFullProfile: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get(`/employees/${id}/export-full`, {
      responseType: "blob",
    });
    const disposition: string = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
    const filename = match?.[2]?.trim() || `employee-${id}.xlsx`;
    return { blob: response.data as Blob, filename };
  },

  exportAll: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get("/employees/export-all", {
      responseType: "blob",
    });
    const disposition: string = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
    const filename = match?.[2]?.trim() || "ملف-السيرة-الذاتية-الشاملة.xlsx";
    return { blob: response.data as Blob, filename };
  },

  getProbationReport: async (days: number): Promise<any[]> => {
    const response = await apiClient.get("/employees/reports/probation-ending", { params: { days } });
    return response.data?.data?.items ?? response.data?.data ?? response.data ?? [];
  },

  getContractReport: async (days: number): Promise<any[]> => {
    const response = await apiClient.get("/employees/reports/contract-ending", { params: { days } });
    return response.data?.data?.items ?? response.data?.data ?? response.data ?? [];
  },

  transfer: async (id: string, dto: TransferDto): Promise<void> => {
    await apiClient.post(`/employees/${id}/transfer`, dto);
  },

  salaryChange: async (id: string, dto: SalaryChangeDto): Promise<void> => {
    await apiClient.post(`/employees/${id}/salary-change`, dto);
  },

  getDossier: async (id: string): Promise<DossierResponse> => {
    const response = await apiClient.get(`/employees/${id}/dossier`);
    return response.data?.data ?? response.data;
  },
};
