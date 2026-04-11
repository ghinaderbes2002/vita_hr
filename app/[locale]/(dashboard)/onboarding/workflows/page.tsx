"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutList, CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useOnboardingWorkflows } from "@/lib/hooks/use-onboarding";
import { useEmployees } from "@/lib/hooks/use-employees";
import { WorkflowType, WorkflowStatus } from "@/lib/api/onboarding";
import { format } from "date-fns";

const STATUS_CLASSES: Record<WorkflowStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<WorkflowStatus, any> = {
  IN_PROGRESS: Clock,
  COMPLETED:   CheckCircle2,
  CANCELLED:   XCircle,
};

export default function OnboardingWorkflowsPage() {
  const router = useRouter();
  const t = useTranslations("onboarding.workflows");
  const [typeFilter, setTypeFilter] = useState<"all" | WorkflowType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkflowStatus>("all");

  const { data: workflows, isLoading } = useOnboardingWorkflows({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: employeesData } = useEmployees({ limit: 100 });
  const employees: any[] = (employeesData as any)?.data?.items || [];
  const employeeMap = Object.fromEntries(employees.map((e: any) => [e.id, e]));

  const list: any[] = Array.isArray(workflows) ? workflows : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t("description")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder={t("filters.type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
            <SelectItem value="ONBOARDING">{t("type.ONBOARDING")}</SelectItem>
            <SelectItem value="OFFBOARDING">{t("type.OFFBOARDING")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder={t("filters.status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t("status.IN_PROGRESS")}</SelectItem>
            <SelectItem value="COMPLETED">{t("status.COMPLETED")}</SelectItem>
            <SelectItem value="CANCELLED">{t("status.CANCELLED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <LayoutList className="h-12 w-12 opacity-30" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((wf: any) => {
            const StatusIcon = STATUS_ICONS[wf.status as WorkflowStatus];
            const completedTasks = (wf.tasks || []).filter((tk: any) => tk.status === "COMPLETED" || tk.status === "SKIPPED").length;
            const totalTasks = wf.tasks?.length || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const emp = wf.employee || employeeMap[wf.employeeId];
            const empName = emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : wf.employeeId;

            return (
              <Card
                key={wf.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/onboarding/workflows/${wf.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{empName}</p>
                        <Badge className={`text-xs ${wf.type === "ONBOARDING" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {t(wf.type === "ONBOARDING" ? "type.ONBOARDING_SHORT" : "type.OFFBOARDING_SHORT")}
                        </Badge>
                        {StatusIcon && (
                          <Badge className={`text-xs flex items-center gap-1 ${STATUS_CLASSES[wf.status as WorkflowStatus]}`}>
                            <StatusIcon className="h-3 w-3" />
                            {t(`status.${wf.status}`)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {t("taskProgress", { completed: completedTasks, total: totalTasks })}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{t("startDate")}: {wf.startDate ? format(new Date(wf.startDate), "yyyy/MM/dd") : "—"}</span>
                        {wf.targetDate && <span>{t("targetDate")}: {format(new Date(wf.targetDate), "yyyy/MM/dd")}</span>}
                        {wf.template && <span>{t("template")}: {wf.template.nameAr}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
