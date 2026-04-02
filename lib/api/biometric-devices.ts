import { apiClient } from "./client";

export interface BiometricDevice {
  id: string;
  serialNumber: string;
  nameAr: string;
  nameEn?: string;
  location?: string;
  ipAddress?: string;
  model?: string;
  isActive: boolean;
  lastSyncAt?: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBiometricDeviceData {
  serialNumber: string;
  nameAr: string;
  nameEn?: string;
  location?: string;
  ipAddress?: string;
  model?: string;
  isActive?: boolean;
}

export interface UpdateBiometricDeviceData {
  nameAr?: string;
  nameEn?: string;
  ipAddress?: string;
  location?: string;
  model?: string;
  isActive?: boolean;
}

export const biometricDevicesApi = {
  getAll: async (): Promise<BiometricDevice[]> => {
    const response = await apiClient.get("/biometric-devices");
    return response.data?.data || response.data;
  },

  getById: async (id: string): Promise<BiometricDevice> => {
    const response = await apiClient.get(`/biometric-devices/${id}`);
    return response.data?.data || response.data;
  },

  create: async (data: CreateBiometricDeviceData): Promise<BiometricDevice> => {
    const response = await apiClient.post("/biometric-devices", data);
    return response.data?.data || response.data;
  },

  update: async (id: string, data: UpdateBiometricDeviceData): Promise<BiometricDevice> => {
    const response = await apiClient.patch(`/biometric-devices/${id}`, data);
    return response.data?.data || response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/biometric-devices/${id}`);
  },
};
