import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  biometricDevicesApi,
  CreateBiometricDeviceData,
  UpdateBiometricDeviceData,
} from "@/lib/api/biometric-devices";
import { toast } from "sonner";

export function useBiometricDevices() {
  return useQuery({
    queryKey: ["biometric-devices"],
    queryFn: () => biometricDevicesApi.getAll(),
  });
}

export function useBiometricDevice(id: string) {
  return useQuery({
    queryKey: ["biometric-device", id],
    queryFn: () => biometricDevicesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBiometricDeviceData) => biometricDevicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biometric-devices"] });
      toast.success("تم إضافة الجهاز بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useUpdateBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBiometricDeviceData }) =>
      biometricDevicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biometric-devices"] });
      toast.success("تم تحديث الجهاز بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteBiometricDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => biometricDevicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biometric-devices"] });
      toast.success("تم حذف الجهاز بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
