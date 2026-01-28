import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentsApi, CreateDepartmentData, UpdateDepartmentData } from "@/lib/api/departments";
import { PaginationParams } from "@/types";
import { toast } from "sonner";

export function useDepartments(params?: PaginationParams & { search?: string }) {
  return useQuery({
    queryKey: ["departments", params],
    queryFn: () => departmentsApi.getAll(params),
  });
}

export function useDepartmentTree() {
  return useQuery({
    queryKey: ["departments", "tree"],
    queryFn: () => departmentsApi.getTree(),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: ["department", id],
    queryFn: () => departmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepartmentData) => departmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("تم إنشاء القسم بنجاح");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "حدث خطأ";
      toast.error(message);
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentData }) =>
      departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("تم تحديث القسم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("تم حذف القسم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
