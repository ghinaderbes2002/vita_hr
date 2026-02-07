import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api/employees";
import { PaginationParams } from "@/types";
import { toast } from "sonner";

export function useEmployees(params?: PaginationParams) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: () => employeesApi.getAll(params),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم إنشاء الموظف بنجاح");
    },
    onError: (error: any) => {
      console.error("❌ Create employee error:", error);
      console.error("❌ Error response:", error.response);
      console.error("❌ Error data:", error.response?.data);

      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          "حدث خطأ أثناء إنشاء الموظف";

      // Check for specific errors
      if (errorMessage.includes("duplicate") || errorMessage.includes("already exists")) {
        toast.error("رقم الهوية أو البريد الإلكتروني مستخدم مسبقاً");
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        toast.error("يرجى التحقق من جميع الحقول المطلوبة");
      } else {
        toast.error(errorMessage);
      }
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم تحديث الموظف بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم حذف الموظف بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useSubordinates(managerId: string) {
  return useQuery({
    queryKey: ["subordinates", managerId],
    queryFn: () => employeesApi.getSubordinates(managerId),
    enabled: !!managerId,
  });
}

export function useLinkUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, userId }: { employeeId: string; userId: string }) =>
      employeesApi.linkUser(employeeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم ربط المستخدم بالموظف بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useEmployeesByDepartment(departmentId: string) {
  return useQuery({
    queryKey: ["employees", "department", departmentId],
    queryFn: () => employeesApi.getByDepartment(departmentId),
    enabled: !!departmentId,
  });
}
