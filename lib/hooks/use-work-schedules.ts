import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  workSchedulesApi,
  CreateWorkScheduleData,
  UpdateWorkScheduleData,
  AssignScheduleDto,
  UpdateEmployeeScheduleDto,
} from "@/lib/api/work-schedules";

export function useEmployeesMissingSchedule() {
  return useQuery({
    queryKey: ["employee-schedules", "missing"],
    queryFn: () => workSchedulesApi.checkMissing(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorkSchedules() {
  return useQuery({
    queryKey: ["work-schedules"],
    queryFn: () => workSchedulesApi.getAll(),
  });
}

export function useWorkSchedule(id: string) {
  return useQuery({
    queryKey: ["work-schedules", id],
    queryFn: () => workSchedulesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateWorkSchedule() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (data: CreateWorkScheduleData) => workSchedulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      const code = error.response?.data?.error?.code || error.response?.data?.code;
      if (code === "WORK_SCHEDULE_CODE_EXISTS") return toast.error("هذا الكود موجود مسبقاً، اختر كوداً مختلفاً");
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useUpdateWorkSchedule() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkScheduleData }) =>
      workSchedulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.saveError"));
    },
  });
}

export function useDeleteWorkSchedule() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => workSchedulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || t("messages.deleteError"));
    },
  });
}

export function useEmployeeSchedules(employeeId: string) {
  return useQuery({
    queryKey: ["employee-schedules", "employee", employeeId],
    queryFn: () => workSchedulesApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useAssignSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AssignScheduleDto) => workSchedulesApi.assign(dto),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules", "employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee-schedules", "missing"] });
      toast.success("تم ربط الوردية بالموظف");
    },
    onError: () => toast.error("فشل ربط الوردية"),
  });
}

export function useUpdateEmployeeSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeScheduleDto }) =>
      workSchedulesApi.updateAssignment(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      toast.success("تم تحديث الوردية");
    },
    onError: () => toast.error("فشل تحديث الوردية"),
  });
}

export function useDeleteEmployeeSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workSchedulesApi.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      toast.success("تم حذف الوردية");
    },
    onError: () => toast.error("فشل حذف الوردية"),
  });
}
