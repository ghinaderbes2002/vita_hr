import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  employeeGoalsApi,
  CreateGoalData,
  UpdateGoalData,
} from "@/lib/api/employee-goals";

// Get employee goals by form
export function useEmployeeGoals(formId: string) {
  return useQuery({
    queryKey: ["employee-goals", formId],
    queryFn: () => employeeGoalsApi.getByForm(formId),
    enabled: !!formId,
  });
}

// Create employee goal
export function useCreateEmployeeGoal() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ formId, data }: { formId: string; data: CreateGoalData }) =>
      employeeGoalsApi.create(formId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-goals"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

// Update employee goal
export function useUpdateEmployeeGoal() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalData }) =>
      employeeGoalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-goals"] });
      toast.success(t("messages.saveSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.saveError"));
    },
  });
}

// Delete employee goal
export function useDeleteEmployeeGoal() {
  const queryClient = useQueryClient();
  const t = useTranslations();

  return useMutation({
    mutationFn: (id: string) => employeeGoalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-goals"] });
      toast.success(t("messages.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("messages.deleteError"));
    },
  });
}
