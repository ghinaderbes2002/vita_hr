import { apiClient } from "./client";

export type MaintenanceStatus =
  | "PENDING_MANAGER"
  | "PENDING_LOGISTICS"
  | "PENDING_EXECUTIVE"
  | "ASSIGNED"
  | "DONE"
  | "REJECTED";

export type WorkLocation = "SHAHBA" | "CENTER" | "NEW_ALEPPO";
export type MaintenancePriority = "URGENT" | "HIGH" | "NORMAL";
export type RepairOption = "INTERNAL" | "INTERNAL_PARTS" | "EXTERNAL_WORKSHOP";

export interface MaintenanceRequest {
  id: string;
  requestNumber?: string;
  employeeId: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn?: string;
    lastNameEn?: string;
  };
  type: "MAINTENANCE";
  status: MaintenanceStatus;
  targetEmployeeId?: string;
  targetEmployee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
  };
  details?: {
    workLocation?: WorkLocation;
    assetType?: string;
    assetNumber?: string;
    brandModel?: string;
    faultDescription?: string;
    priority?: MaintenancePriority;
    situationDescription?: string;
    repairOption?: RepairOption;
    assignedAt?: string;
    executedAt?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceData {
  workLocation: WorkLocation;
  assetType: string;
  assetNumber?: string;
  brandModel?: string;
  faultDescription: string;
  priority: MaintenancePriority;
}

export interface LogisticsData {
  situationDescription?: string;
  repairOption: RepairOption;
  assignedEmployeeId: string;
  amount?: number;
}

export const maintenanceRequestsApi = {
  getMy: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get("/requests/my", {
      params: { ...params, type: "MAINTENANCE" },
    });
    return response.data;
  },

  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get("/requests", {
      params: { ...params, type: "MAINTENANCE" },
    });
    return response.data;
  },

  create: async (data: CreateMaintenanceData) => {
    const response = await apiClient.post("/requests/maintenance", data);
    return response.data.data;
  },

  managerApprove: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/maintenance/${id}/manager-approve`, { notes });
    return response.data.data;
  },

  managerReject: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/maintenance/${id}/manager-reject`, { notes });
    return response.data.data;
  },

  processLogistics: async (id: string, data: LogisticsData) => {
    const response = await apiClient.post(`/requests/maintenance/${id}/logistics`, data);
    return response.data.data;
  },

  executiveApprove: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/maintenance/${id}/executive-approve`, { notes });
    return response.data.data;
  },

  executiveReject: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/requests/maintenance/${id}/executive-reject`, { notes });
    return response.data.data;
  },

  getMyTasks: async () => {
    const response = await apiClient.get("/requests/maintenance/my-tasks");
    return response.data;
  },

  complete: async (id: string) => {
    const response = await apiClient.post(`/requests/maintenance/${id}/complete`);
    return response.data.data;
  },
};
