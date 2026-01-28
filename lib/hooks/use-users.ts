import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, CreateUserData, UpdateUserData } from "@/lib/api/users";
import { PaginationParams } from "@/types";
import { toast } from "sonner";

export function useUsers(params?: PaginationParams & { search?: string }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const result = await usersApi.getAll(params);
      console.log("Users API response:", result);
      return result;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم إنشاء المستخدم بنجاح");
    },
    onError: (error: any) => {
      console.error("Create user error - Full error:", error);
      console.error("Create user error - Response:", error.response);
      console.error("Create user error - Data:", error.response?.data);
      console.error("Create user error - Status:", error.response?.status);
      const message = error.response?.data?.message
        || error.response?.data?.error
        || (error.response?.data && Object.keys(error.response.data).length > 0
            ? JSON.stringify(error.response.data)
            : null)
        || error.message
        || "حدث خطأ";
      toast.error(message);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم تحديث المستخدم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم حذف المستخدم بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useAssignRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      usersApi.assignRoles(id, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم تعيين الأدوار بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
