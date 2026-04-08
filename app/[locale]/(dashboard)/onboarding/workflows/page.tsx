"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; className: string; icon: any }> = {
  IN_PROGRESS: { label: "قيد التنفيذ", className: "bg-blue-100 text-blue-700", icon: Clock },
  COMPLETED:   { label: "مكتمل",       className: "bg-green-100 text-green-700", icon: CheckCircle2 },
  CANCELLED:   { label: "ملغى",        className: "bg-red-100 text-red-700",    icon: XCircle },
};

export default function OnboardingWorkflowsPage() {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold">لوحة الإلحاق والإنهاء</h1>
        <p className="text-muted-foreground text-sm mt-0.5">متابعة جميع عمليات استقبال وإنهاء خدمة الموظفين</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            <SelectItem value="ONBOARDING">استقبال موظف</SelectItem>
            <SelectItem value="OFFBOARDING">إنهاء خدمة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="IN_PROGRESS">قيد التنفيذ</SelectItem>
            <SelectItem value="COMPLETED">مكتملة</SelectItem>
            <SelectItem value="CANCELLED">ملغاة</SelectItem>
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
          <p>لا توجد عمليات مطابقة للفلاتر</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((wf: any) => {
            const cfg = STATUS_CONFIG[wf.status as WorkflowStatus];
            const StatusIcon = cfg?.icon;
            const completedTasks = (wf.tasks || []).filter((t: any) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
            const totalTasks = wf.tasks?.length || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const emp = wf.employee || employeeMap[wf.employeeId];
            const empName = emp
              ? `${emp.firstNameAr} ${emp.lastNameAr}`
              : wf.employeeId;

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
                          {wf.type === "ONBOARDING" ? "استقبال" : "إنهاء خدمة"}
                        </Badge>
                        {cfg && (
                          <Badge className={`text-xs flex items-center gap-1 ${cfg.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">{completedTasks}/{totalTasks} مهمة</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>البداية: {wf.startDate ? format(new Date(wf.startDate), "yyyy/MM/dd") : "—"}</span>
                        {wf.targetDate && <span>الهدف: {format(new Date(wf.targetDate), "yyyy/MM/dd")}</span>}
                        {wf.template && <span>القالب: {wf.template.nameAr}</span>}
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
