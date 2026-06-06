import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi, TransferDto, SalaryChangeDto } from "@/lib/api/employees";
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

export function useEmployeeBasic(id: string) {
  return useQuery({
    queryKey: ["employee-basic", id],
    queryFn: () => employeesApi.getBasicById(id),
    enabled: !!id,
  });
}

export function useEmployeesBasicList() {
  return useQuery({
    queryKey: ["employees-basic-list"],
    queryFn: () => employeesApi.getBasicList(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyEmployee() {
  return useQuery({
    queryKey: ["employee-my-profile"],
    queryFn: () => employeesApi.getMyProfile(),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم إنشاء الموظف بنجاح");
      setTimeout(() => {
        toast.warning("تذكير: لا تنسَ إضافة بصمة الموظف", { duration: 6000 });
      }, 800);
      setTimeout(() => {
        toast.warning("تذكير: لا تنسَ تنسيب الموظف لوردية عمل", { duration: 6000 });
      }, 1600);
    },
    onError: (error: any) => {
      const errData = error.response?.data?.error;
      const errorMessage: string =
        (typeof errData === "string" ? errData : errData?.message) ||
        error.response?.data?.message ||
        error.message ||
        "حدث خطأ أثناء إنشاء الموظف";

      const errCode = error.response?.data?.error?.code || error.response?.data?.code;
      if (errCode === "EMPLOYEE_PREVIOUSLY_DELETED") {
        toast.error("يوجد موظف محذوف مسبقاً بنفس البريد الإلكتروني — يرجى التواصل مع الإدارة");
      } else if (errCode === "RESOURCE_ALREADY_EXISTS" || errorMessage.includes("duplicate") || errorMessage.includes("already exists")) {
        toast.error("رقم الهوية أو البريد الإلكتروني مستخدم مسبقاً");
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        toast.error("يرجى التحقق من جميع الحقول المطلوبة");
      } else {
        toast.error("حدث خطأ أثناء إنشاء الموظف");
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
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
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
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || "حدث خطأ");
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
      const status = error.response?.status;
      const message = error.response?.data?.message || error.response?.data?.error?.message;
      if (status === 409) {
        toast.error(message || "هذا المستخدم مرتبط بموظف آخر بالفعل");
      } else {
        toast.error(message || "حدث خطأ أثناء ربط المستخدم");
      }
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

export function useManagerNotes(employeeId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["employee-manager-notes", employeeId],
    queryFn: () => employeesApi.getManagerNotes(employeeId),
    enabled: !!employeeId && enabled,
  });
}

export function useUpdateManagerNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, notes }: { employeeId: string; notes: string }) =>
      employeesApi.updateManagerNotes(employeeId, notes),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ["employee-manager-notes", employeeId] });
      toast.success("تم حفظ الملاحظات");
    },
    onError: () => toast.error("فشل حفظ الملاحظات"),
  });
}

export function useProbationReport(days: number) {
  return useQuery({
    queryKey: ["hr-report", "probation", days],
    queryFn: () => employeesApi.getProbationReport(days),
  });
}

export function useContractReport(days: number) {
  return useQuery({
    queryKey: ["hr-report", "contract", days],
    queryFn: () => employeesApi.getContractReport(days),
  });
}

export function useTransferEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TransferDto }) =>
      employeesApi.transfer(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-dossier", id] });
      toast.success("تم تنفيذ النقل بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error?.message || "فشل تنفيذ النقل");
    },
  });
}

export function useSalaryChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SalaryChangeDto }) =>
      employeesApi.salaryChange(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-dossier", id] });
      toast.success("تم تحديث الراتب بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error?.message || "فشل تحديث الراتب");
    },
  });
}

export function useEmployeeDossier(id: string) {
  return useQuery({
    queryKey: ["employee-dossier", id],
    queryFn: () => employeesApi.getDossier(id),
    enabled: !!id,
    retry: false,
  });
}
