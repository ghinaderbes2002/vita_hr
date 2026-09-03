import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clinicWaitingListApi,
  CreateWaitingListDto,
  UpdateWaitingListDto,
  WaitingListParams,
} from "@/lib/api/clinic-waiting-list";

const KEY = "clinic-waiting-list";

export function useWaitingList(params?: WaitingListParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => clinicWaitingListApi.list(params),
    enabled,
  });
}

export function useWaitingListEntry(id: string) {
  return useQuery({
    queryKey: [KEY, "entry", id],
    queryFn: () => clinicWaitingListApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateWaitingListEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWaitingListDto) => clinicWaitingListApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تمت إضافة المريض إلى قائمة الانتظار");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الإضافة"),
  });
}

export function useUpdateWaitingListEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWaitingListDto }) =>
      clinicWaitingListApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تم تحديث السجل");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل التحديث"),
  });
}

export function useDeleteWaitingListEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicWaitingListApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("تم حذف السجل");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "فشل الحذف"),
  });
}
