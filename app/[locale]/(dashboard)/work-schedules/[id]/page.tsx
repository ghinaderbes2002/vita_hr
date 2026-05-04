"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkSchedule } from "@/lib/hooks/use-work-schedules";
import { useEmployees } from "@/lib/hooks/use-employees";

export default function WorkScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const id = params.id as string;

  const { data: schedule, isLoading } = useWorkSchedule(id);
  const { data: employeesData } = useEmployees({ limit: 1000 });
  const allEmployees: any[] = (employeesData as any)?.data?.items || (employeesData as any)?.data || (employeesData as any) || [];
  const employeeMap = new Map(allEmployees.map((e: any) => [e.id, e]));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.noData")}</p>
      </div>
    );
  }

  const getWorkDaysText = (workDaysJson: string) => {
    try {
      const days = JSON.parse(workDaysJson) as number[];
      const dayNames = [
        t("workSchedules.weekDays.sunday"),
        t("workSchedules.weekDays.monday"),
        t("workSchedules.weekDays.tuesday"),
        t("workSchedules.weekDays.wednesday"),
        t("workSchedules.weekDays.thursday"),
        t("workSchedules.weekDays.friday"),
        t("workSchedules.weekDays.saturday"),
      ];
      return days.map((d) => dayNames[d]).join("، ");
    } catch {
      return "-";
    }
  };

  const activeEmployees = (schedule.employeeSchedules || []).filter((es) => es.isActive);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowRight className="h-4 w-4" />
        {t("common.back")}
      </Button>

      {/* بطاقة معلومات الوردية */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{schedule.nameAr}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{schedule.nameEn}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="font-mono">{schedule.code}</Badge>
              <Badge variant={schedule.isActive ? "default" : "secondary"}>
                {schedule.isActive ? t("workSchedules.statuses.active") : t("workSchedules.statuses.inactive")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t("workSchedules.fields.workTimes")}</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {schedule.workStartTime} - {schedule.workEndTime}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t("workSchedules.fields.workDays")}</span>
              <span className="text-sm font-medium">{getWorkDaysText(schedule.workDays)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t("workSchedules.fields.lateTolerance")}</span>
              <span className="text-sm font-medium">{schedule.lateToleranceMin} {t("workSchedules.minutes")}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">الموظفون النشطون</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {activeEmployees.length} موظف
              </span>
            </div>
          </div>
          {schedule.description && (
            <p className="text-sm text-muted-foreground mt-4 border-t pt-3">{schedule.description}</p>
          )}
        </CardContent>
      </Card>

      {/* جدول الموظفين */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            الموظفون المسجلون في هذه الوردية
            <Badge variant="secondary" className="ms-auto">{activeEmployees.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>تاريخ البدء</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    لا يوجد موظفون مسجلون في هذه الوردية
                  </TableCell>
                </TableRow>
              ) : (
                activeEmployees.map((es) => {
                  const emp = es.employee || employeeMap.get(es.employeeId);
                  return (
                  <TableRow key={es.id}>
                    <TableCell>
                      {emp ? (
                        <div>
                          <div className="font-medium">
                            {emp.firstNameAr} {emp.lastNameAr}
                          </div>
                          {(emp.firstNameEn || emp.lastNameEn) && (
                            <div className="text-xs text-muted-foreground">
                              {emp.firstNameEn} {emp.lastNameEn}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {es.effectiveFrom ? new Date(es.effectiveFrom).toLocaleDateString("en-GB") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={es.isActive ? "default" : "secondary"} className="text-xs">
                        {es.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
