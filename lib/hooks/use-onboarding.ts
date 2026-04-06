import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardingApi, CreateTemplateData, CreateWorkflowData, WorkflowType, WorkflowStatus, TaskStatus } from "@/lib/api/onboarding";
import { toast } from "sonner";

// Templates
export function useOnboardingTemplates(type?: WorkflowType) {
  return useQuery({
    queryKey: ["onboarding-templates", type],
    queryFn: () => onboardingApi.getTemplates(type ? { type } : undefined),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOnboardingTemplate(id: string) {
  return useQuery({
    queryKey: ["onboarding-template", id],
    queryFn: () => onboardingApi.getTemplate(id),
    enabled: !!id,
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateData) => onboardingApi.createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast.success("تم إنشاء القالب بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}

export function useDeleteOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => onboardingApi.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast.success("تم حذف القالب");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}

// Workflows
export function useOnboardingWorkflows(params?: { employeeId?: string; status?: WorkflowStatus; type?: WorkflowType }) {
  return useQuery({
    queryKey: ["onboarding-workflows", params],
    queryFn: () => onboardingApi.getWorkflows(params),
  });
}

export function useOnboardingWorkflow(id: string) {
  return useQuery({
    queryKey: ["onboarding-workflow", id],
    queryFn: () => onboardingApi.getWorkflow(id),
    enabled: !!id,
  });
}

export function useEmployeeWorkflows(employeeId: string) {
  return useQuery({
    queryKey: ["onboarding-workflows-employee", employeeId],
    queryFn: () => onboardingApi.getWorkflows({ employeeId }),
    enabled: !!employeeId,
  });
}

export function useCreateOnboardingWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowData) => onboardingApi.createWorkflow(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["onboarding-workflows"] });
      qc.invalidateQueries({ queryKey: ["onboarding-workflows-employee", vars.employeeId] });
      toast.success("تم بدء الـ Workflow بنجاح");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}

export function useUpdateTaskStatus(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status, notes }: { taskId: string; status: TaskStatus; notes?: string }) =>
      onboardingApi.updateTaskStatus(workflowId, taskId, { status, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-workflow", workflowId] });
      qc.invalidateQueries({ queryKey: ["onboarding-workflows"] });
      toast.success("تم تحديث حالة المهمة");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}

export function useCancelWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => onboardingApi.cancelWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-workflows"] });
      toast.success("تم إلغاء الـ Workflow");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  });
}
