import { apiClient } from "./client";
import { BiometricDevice } from "./biometric-devices";

export interface EmployeeFingerprint {
  id: string;
  employeeId: string;
  deviceId: string;
  pin: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  device?: BiometricDevice;
}

export interface RegisterFingerprintData {
  employeeId: string;
  deviceId: string;
  pin: string;
}

export interface BulkFingerprintMapping {
  employeeId: string;
  pin: string;
  deviceId: string;
}

export const employeeFingerprintsApi = {
  getByEmployee: async (employeeId: string): Promise<EmployeeFingerprint[]> => {
    const response = await apiClient.get("/employee-fingerprints", {
      params: { employeeId },
    });
    return response.data?.data || response.data;
  },

  register: async (data: RegisterFingerprintData): Promise<EmployeeFingerprint> => {
    const response = await apiClient.post("/employee-fingerprints", data);
    return response.data?.data || response.data;
  },

  bulkCreate: async (mappings: BulkFingerprintMapping[]): Promise<EmployeeFingerprint[]> => {
    const response = await apiClient.post("/employee-fingerprints/bulk", { mappings });
    return response.data?.data || response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employee-fingerprints/${id}`);
  },
};
