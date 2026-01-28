import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  workSchedulesApi,
  CreateWorkScheduleData,
  UpdateWorkScheduleData,
} from "@/lib/api/work-schedules";

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
      toast.error(error.response?.data?.message || t("messages.saveError"));
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
      toast.error(error.response?.data?.message || t("messages.saveError"));
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
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}
