"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useWorkSchedules, useDeleteWorkSchedule, useEmployeesMissingSchedule } from "@/lib/hooks/use-work-schedules";
import { WorkScheduleDialog } from "@/components/features/work-schedules/work-schedule-dialog";
import { WorkSchedule, ShiftType } from "@/lib/api/work-schedules";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";

export default function WorkSchedulesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);

  const { data, isLoading } = useWorkSchedules();
  const deleteSchedule = useDeleteWorkSchedule();
  const { data: missingData } = useEmployeesMissingSchedule();
  const missingCount = missingData?.count ?? 0;

  // Extract array from API response
  const schedules = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredSchedules = schedules.filter((schedule: WorkSchedule) => {
    const searchLower = search.toLowerCase();
    return (
      schedule.code.toLowerCase().includes(searchLower) ||
      schedule.nameAr.toLowerCase().includes(searchLower) ||
      schedule.nameEn.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setDialogOpen(true);
  };

  const handleDelete = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedSchedule) {
      await deleteSchedule.mutateAsync(selectedSchedule.id);
      setDeleteDialogOpen(false);
      setSelectedSchedule(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedSchedule(null);
    }
  };

  const SHIFT_TYPE_CLASSES: Record<string, string> = {
    DAY:      "bg-blue-100 text-blue-800 border-blue-200",
    NIGHT:    "bg-purple-100 text-purple-800 border-purple-200",
    FLEXIBLE: "bg-green-100 text-green-800 border-green-200",
  };

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
        t("workSchedules.weekDays.saturday")
      ];
      const separator = locale === "ar" ? "، " : ", ";
      return days.map((d) => dayNames[d]).join(separator);
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("workSchedules.title")}
        description={t("workSchedules.description")}
        actions={
          <ActionGuard permission={PERMISSIONS.WORK_SCHEDULES.CREATE}>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              {t("workSchedules.addSchedule")}
            </Button>
          </ActionGuard>
        }
      />


      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("workSchedules.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workSchedules.fields.code")}</TableHead>
              <TableHead>{t("workSchedules.fields.shiftType")}</TableHead>
              <TableHead>{t("workSchedules.fields.name")}</TableHead>
              <TableHead>{t("workSchedules.fields.workTimes")}</TableHead>
              <TableHead>{t("workSchedules.fields.workDays")}</TableHead>
              <TableHead>{t("workSchedules.fields.lateTolerance")}</TableHead>
              <TableHead>{t("workSchedules.fields.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedules.map((schedule: WorkSchedule) => (
                <TableRow
                  key={schedule.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/${locale}/work-schedules/${schedule.id}`)}
                >
                  <TableCell className="font-medium">{schedule.code}</TableCell>
                  <TableCell>
                    {(() => {
                      const cls = SHIFT_TYPE_CLASSES[schedule.shiftType as ShiftType];
                      return cls ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
                          {t(`workSchedules.shiftTypes.${schedule.shiftType}` as any)}
                        </span>
                      ) : null;
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{schedule.nameAr}</div>
                    <div className="text-sm text-muted-foreground">{schedule.nameEn}</div>
                  </TableCell>
                  <TableCell>
                    {schedule.shiftType === "FLEXIBLE" ? (
                      <span className="text-sm" dir="ltr">
                        {schedule.minimumWorkMinutes
                          ? `${Math.round(schedule.minimumWorkMinutes / 60)} ${t("workSchedules.hoursPerDay")}`
                          : t("workSchedules.flexible")}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-sm" dir="ltr">
                          {(() => {
                            if (!schedule.workStartTime || !schedule.workEndTime) return "—";
                            const [sh, sm] = schedule.workStartTime.split(":").map(Number);
                            const [eh, em] = schedule.workEndTime.split(":").map(Number);
                            const hrs = Math.round((eh * 60 + em - sh * 60 - sm) / 60);
                            return `${hrs} ${t("workSchedules.hoursPerDay")}`;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                          <Clock className="h-3 w-3" />
                          {schedule.workStartTime} - {schedule.workEndTime}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{getWorkDaysText(schedule.workDays)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{schedule.lateToleranceMin} {t("workSchedules.minutes")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                      {schedule.isActive ? t("workSchedules.statuses.active") : t("workSchedules.statuses.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ActionGuard permission={PERMISSIONS.WORK_SCHEDULES.UPDATE}>
                          <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4 ml-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        </ActionGuard>
                        <ActionGuard permission={PERMISSIONS.WORK_SCHEDULES.DELETE}>
                          <DropdownMenuItem
                            onClick={() => handleDelete(schedule)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </ActionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WorkScheduleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        schedule={selectedSchedule}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
