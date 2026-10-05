import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clinicWaitingListApi,
  CreateWaitingListDto,
  UpdateWaitingListDto,
  WaitingListParams,
  WaitingStatus,
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

/** Downloads the waiting list as Excel — under one status, or all when none is given. */
export function useExportWaitingList() {
  return useMutation({
    mutationFn: (status?: WaitingStatus) => clinicWaitingListApi.exportXlsx(status),
    onSuccess: (blob, status) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `waiting-list${status ? `-${status.toLowerCase()}` : ""}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    onError: () => toast.error("فشل تصدير الملف"),
  });
}
