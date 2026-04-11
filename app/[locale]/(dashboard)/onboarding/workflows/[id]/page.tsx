"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useOnboardingWorkflow, useUpdateTaskStatus, useCancelWorkflow } from "@/lib/hooks/use-onboarding";
import { TaskStatus, TaskAssignee } from "@/lib/api/onboarding";
import { format } from "date-fns";

const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  PENDING:     "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED:   "bg-green-100 text-green-700",
  SKIPPED:     "bg-amber-100 text-amber-700",
};

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("onboarding.workflowDetail");
  const tAssignee = useTranslations("onboarding.assignee");
  const tWorkflows = useTranslations("onboarding.workflows");
  const tCommon = useTranslations("common");

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState<{ status: TaskStatus; notes: string }>({ status: "COMPLETED", notes: "" });

  const { data: workflow, isLoading } = useOnboardingWorkflow(id);
  const updateTask = useUpdateTaskStatus(id);
  const cancelWorkflow = useCancelWorkflow();

  const wf = workflow as any;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!wf) return null;

  const completedTasks = (wf.tasks || []).filter((tk: any) => tk.status === "COMPLETED" || tk.status === "SKIPPED").length;
  const totalTasks = wf.tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const empName = wf.employee ? `${wf.employee.firstNameAr} ${wf.employee.lastNameAr}` : wf.employeeId;

  const statusClass =
    wf.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
    wf.status === "COMPLETED" ? "bg-green-100 text-green-700" :
    "bg-red-100 text-red-700";

  function openTaskDialog(task: any) {
    setSelectedTask(task);
    setTaskForm({ status: "COMPLETED", notes: "" });
    setTaskDialogOpen(true);
  }

  function handleUpdateTask() {
    if (!selectedTask) return;
    updateTask.mutate(
      { taskId: selectedTask.id, status: taskForm.status, notes: taskForm.notes || undefined },
      { onSuccess: () => setTaskDialogOpen(false) }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{empName}</h1>
          <p className="text-muted-foreground text-sm">
            {tWorkflows(wf.type === "ONBOARDING" ? "type.ONBOARDING" : "type.OFFBOARDING")}
          </p>
        </div>
        <Badge className={`text-xs ${statusClass}`}>
          {tWorkflows(`status.${wf.status}`)}
        </Badge>
        {wf.status === "IN_PROGRESS" && (
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => setCancelOpen(true)}>
            {t("cancelWorkflow")}
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("progress")}</span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>{t("completedOf", { completed: completedTasks, total: totalTasks })}</span>
            {wf.startDate && <span>{t("startDate")}: {format(new Date(wf.startDate), "yyyy/MM/dd")}</span>}
            {wf.targetDate && <span>{t("targetDate")}: {format(new Date(wf.targetDate), "yyyy/MM/dd")}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("tasks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(wf.tasks || []).map((task: any, i: number) => {
            const isDone = task.status === "COMPLETED" || task.status === "SKIPPED";
            return (
              <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${isDone ? "bg-muted/30" : ""}`}>
                <div className="mt-0.5">
                  {task.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : task.status === "SKIPPED" ? (
                    <SkipForward className="h-5 w-5 text-amber-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                      {i + 1}. {task.titleAr}
                    </p>
                    <Badge className={`text-[10px] ${TASK_STATUS_CLASSES[task.status as TaskStatus]}`}>
                      {t(`taskStatus.${task.status}`)}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{tAssignee(task.assignedTo)}</span>
                    {task.dueDate && <span>{t("dueDate")}: {format(new Date(task.dueDate), "yyyy/MM/dd")}</span>}
                  </div>
                  {task.notes && <p className="text-xs text-muted-foreground mt-1 italic">{task.notes}</p>}
                </div>
                {wf.status === "IN_PROGRESS" && !isDone && (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                    onClick={() => openTaskDialog(task)}>
                    {t("update")}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Update Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("updateTaskTitle")}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium">{selectedTask.titleAr}</p>
              <div className="space-y-1.5">
                <Label>{t("newStatus")}</Label>
                <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v as TaskStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_PROGRESS">{t("taskStatus.IN_PROGRESS")}</SelectItem>
                    <SelectItem value="COMPLETED">{t("taskStatus.COMPLETED")}</SelectItem>
                    <SelectItem value="SKIPPED">{t("taskStatus.SKIPPED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("notes")}</Label>
                <Textarea
                  rows={2}
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder={t("notesPlaceholder")}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleUpdateTask} disabled={updateTask.isPending}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelDialog.title")}
        description={t("cancelDialog.description")}
        onConfirm={() => cancelWorkflow.mutate(id, { onSuccess: () => { setCancelOpen(false); router.back(); } })}
        variant="destructive"
      />
    </div>
  );
}
