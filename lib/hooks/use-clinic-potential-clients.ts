import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clinicPotentialClientsApi,
  CreatePotentialClientDto,
  PotentialClientFilters,
  PotentialClientParams,
  UpdatePotentialClientDto,
} from "@/lib/api/clinic-potential-clients";

const KEY = "clinic-potential-clients";

export function usePotentialClients(params?: PotentialClientParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => clinicPotentialClientsApi.list(params),
    enabled,
  });
}

export function usePotentialClientServices() {
  return useQuery({
    queryKey: [KEY, "services"],
    queryFn: () => clinicPotentialClientsApi.getServices(),
  });
}

export function useCreatePotentialClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePotentialClientDto) => clinicPotentialClientsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تمت إضافة العميل المحتمل");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useUpdatePotentialClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePotentialClientDto }) =>
      clinicPotentialClientsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تم تحديث السجل");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeletePotentialClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicPotentialClientsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تم حذف السجل");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}

/** Downloads the potential-clients list as Excel, narrowed by the given filters. */
export function useExportPotentialClients() {
  return useMutation({
    mutationFn: (filters?: PotentialClientFilters) => clinicPotentialClientsApi.exportXlsx(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `potential-clients-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    onError: () => toast.error("فشل تصدير الملف"),
  });
}
