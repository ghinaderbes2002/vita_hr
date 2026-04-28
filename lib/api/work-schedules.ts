import { apiClient } from "./client";
import { ApiResponse } from "@/types";

export interface WorkSchedule {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  workStartTime: string;
  workEndTime: string;
  workDays: string; // JSON string like "[0,1,2,3,4]"
  lateToleranceMin: number;
  earlyLeaveToleranceMin: number;
  overtimeAfterMin: number;
  requireCheckIn: boolean;
  requireCheckOut: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkScheduleData {
  code: string;
  nameAr: string;
  nameEn: string;
  workStartTime: string;
  workEndTime: string;
  workDays: string;
  lateToleranceMin: number;
  earlyLeaveToleranceMin: number;
  isActive: boolean;
  description?: string;
}

export interface UpdateWorkScheduleData {
  code?: string;
  nameAr?: string;
  nameEn?: string;
  workStartTime?: string;
  workEndTime?: string;
  workDays?: string;
  lateToleranceMin?: number;
  earlyLeaveToleranceMin?: number;
  isActive?: boolean;
  description?: string;
}

export interface EmployeeSchedule {
  id: string;
  employeeId: string;
  scheduleId: string;
  schedule?: WorkSchedule;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignScheduleDto {
  employeeId: string;
  scheduleId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UpdateEmployeeScheduleDto {
  scheduleId?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface MissingScheduleEmployee {
  id: string;
  employeeNumber: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  departmentId: string;
}

export interface MissingSchedulesResult {
  count: number;
  employees: MissingScheduleEmployee[];
}

export const workSchedulesApi = {
  getAll: async (): Promise<ApiResponse<WorkSchedule[]>> => {
    const response = await apiClient.get("/work-schedules");
    return response.data;
  },

  getById: async (id: string): Promise<WorkSchedule> => {
    const response = await apiClient.get(`/work-schedules/${id}`);
    return response.data.data;
  },

  create: async (data: CreateWorkScheduleData): Promise<WorkSchedule> => {
    const response = await apiClient.post("/work-schedules", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateWorkScheduleData): Promise<WorkSchedule> => {
    const response = await apiClient.patch(`/work-schedules/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/work-schedules/${id}`);
  },

  checkMissing: async (): Promise<MissingSchedulesResult> => {
    const response = await apiClient.get("/employee-schedules/check/missing");
    return response.data?.data || response.data;
  },

  getByEmployee: async (employeeId: string): Promise<EmployeeSchedule[]> => {
    const response = await apiClient.get(`/employee-schedules/employee/${employeeId}`);
    return response.data?.data || response.data || [];
  },

  assign: async (dto: AssignScheduleDto): Promise<EmployeeSchedule> => {
    const response = await apiClient.post("/employee-schedules", dto);
    return response.data?.data || response.data;
  },

  updateAssignment: async (id: string, dto: UpdateEmployeeScheduleDto): Promise<EmployeeSchedule> => {
    const response = await apiClient.patch(`/employee-schedules/${id}`, dto);
    return response.data?.data || response.data;
  },

  deleteAssignment: async (id: string): Promise<void> => {
    await apiClient.delete(`/employee-schedules/${id}`);
  },
};
