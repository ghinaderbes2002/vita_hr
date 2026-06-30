import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { custodiesApi, CreateCustodyData, UpdateCustodyData, ReturnCustodyData, TransferCustodyData } from "@/lib/api/custodies";
import { toast } from "sonner";

export function useCustodies(params?: {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["custodies", params],
    queryFn: () => custodiesApi.getAll(params),
  });
}

export function useCustody(id: string) {
  return useQuery({
    queryKey: ["custody", id],
    queryFn: () => custodiesApi.getById(id),
    enabled: !!id,
  });
}

export function useMyCustodies() {
  return useQuery({
    queryKey: ["custodies", "my"],
    queryFn: () => custodiesApi.getMyCustodies(),
  });
}

export function useEmployeeCustodies(employeeId: string) {
  return useQuery({
    queryKey: ["custodies", "employee", employeeId],
    queryFn: () => custodiesApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useEmployeeCustodySummary(employeeId: string) {
  return useQuery({
    queryKey: ["custody-summary", employeeId],
    queryFn: () => custodiesApi.getEmployeeSummary(employeeId),
    enabled: !!employeeId,
  });
}

export function useCheckUnreturnedCustodies(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: ["custody-check", employeeId],
    queryFn: () => custodiesApi.checkUnreturned(employeeId),
    enabled: !!employeeId && enabled,
  });
}

export function useCreateCustody() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustodyData) => custodiesApi.create(data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["custodies"] });
      toast.success("تم إضافة العهدة بنجاح");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.response?.data?.error?.message || "حدث خطأ";
      toast.error(msg);
    },
  });
}

export function useUpdateCustody() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustodyData }) =>
      custodiesApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.refetchQueries({ queryKey: ["custodies"] });
      queryClient.refetchQueries({ queryKey: ["custody", id] });
      toast.success("تم تحديث العهدة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useReturnCustody() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnCustodyData }) =>
      custodiesApi.return(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.refetchQueries({ queryKey: ["custodies"] });
      queryClient.refetchQueries({ queryKey: ["custody", id] });
      toast.success("تم تحديث حالة العهدة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useTransferCustody() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransferCustodyData }) =>
      custodiesApi.transfer(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["custodies"] });
      queryClient.invalidateQueries({ queryKey: ["custody", id] });
      queryClient.invalidateQueries({ queryKey: ["custody-transfers", id] });
      toast.success("تم نقل العهدة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useCustodyTransfers(id: string) {
  return useQuery({
    queryKey: ["custody-transfers", id],
    queryFn: () => custodiesApi.getTransfers(id),
    enabled: !!id,
  });
}

export function useDeleteCustody() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => custodiesApi.delete(id),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["custodies"] });
      toast.success("تم حذف العهدة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
    },
  });
}
