"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, EyeOff, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CycleStatusBadge, TaskStatusBadge } from "@/components/appraisal/appraisal-ui";
import { MyAppraisalResult } from "@/components/appraisal/my-appraisal-result";
import { useAppraisalCurrentCycle, useAppraisalTasks } from "@/lib/hooks/use-appraisal";
import { ANONYMOUS_AXES, AppraisalInputAxis, AppraisalTask } from "@/lib/api/appraisal";

const SECTIONS: AppraisalInputAxis[] = ["SELF", "MANAGER", "UPWARD", "PEER"];

export default function MyAppraisalPage() {
  const t = useTranslations("appraisal");
  const router = useRouter();
  const { data: cycle, isLoading: cycleLoading } = useAppraisalCurrentCycle();
  const { data: tasksData, isLoading: tasksLoading } = useAppraisalTasks(cycle?.id);

  if (cycleLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("my.title")} description={t("my.description")} />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("my.title")} description={t("my.description")} />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t("my.noCycle")}</CardContent>
        </Card>
      </div>
    );
  }

  const tasks = tasksData?.tasks ?? [];
  const canEdit = tasksData?.canEdit ?? false;

  const openTask = (task: AppraisalTask) =>
    router.push(`/evaluations/360/${cycle.id}/${task.axis}/${task.evaluateeId}`);

  return (
    <div className="space-y-4">
      <PageHeader title={t("my.title")} description={t("my.description")} />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-lg font-bold">{cycle.nameAr}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span dir="ltr">
                {cycle.startDate?.slice(0, 10)} → {cycle.endDate?.slice(0, 10)}
              </span>
              <span className="mx-1">·</span>
              <span>{cycle.code}</span>
            </p>
          </div>
          <CycleStatusBadge status={cycle.status} />
        </CardContent>
      </Card>

      {cycle.status === "FINALIZED" && <MyAppraisalResult cycleId={cycle.id} />}

      {tasksData && !canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          {t("my.readOnly")}
        </div>
      )}

      {tasksLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t("my.noTasks")}</CardContent>
        </Card>
      ) : (
        SECTIONS.map((axis) => {
          const sectionTasks = tasks.filter((task) => task.axis === axis);
          if (sectionTasks.length === 0) return null;
          const anonymous = ANONYMOUS_AXES.includes(axis);
          return (
            <Card key={axis}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t(`my.sections.${axis}`)}</CardTitle>
                {anonymous && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <EyeOff className="h-3.5 w-3.5" />
                    {t("anonymousNote")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="divide-y p-0">
                {sectionTasks.map((task) => (
                  <button
                    key={`${task.axis}-${task.evaluateeId}`}
                    type="button"
                    onClick={() => openTask(task)}
                    className="flex w-full items-center justify-between gap-3 px-6 py-3 text-start transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{task.evaluateeName}</p>
                      {task.evaluateeJobTitle && (
                        <p className="truncate text-xs text-muted-foreground">{task.evaluateeJobTitle}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <TaskStatusBadge status={task.status} />
                      <Button variant="ghost" size="sm" asChild>
                        <span>
                          {canEdit && task.status !== "SUBMITTED"
                            ? task.status === "DRAFT"
                              ? t("my.continue")
                              : t("my.start")
                            : t("my.view")}
                          <ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
                        </span>
                      </Button>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
