"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  useMyMaintenanceTasks,
  useCompleteMaintenanceTask,
} from "@/lib/hooks/use-maintenance-requests";
import { MaintenanceStatusBadge } from "@/components/features/maintenance-requests/maintenance-status-badge";
import { MaintenanceRequest } from "@/lib/api/maintenance-requests";

const priorityClasses: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-orange-100 text-orange-800 border-orange-300",
  NORMAL: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function MyMaintenanceTasksPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useMyMaintenanceTasks();
  const completeTask = useCompleteMaintenanceTask();

  const tasks: MaintenanceRequest[] = (data as any)?.data?.items || (data as any)?.data || (data as any)?.items || [];

  const handleComplete = async () => {
    if (!confirmId) return;
    await completeTask.mutateAsync(confirmId);
    setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.myTasksTitle")}
        description={t("maintenance.myTasksDescription")}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("requests.fields.employee")}</TableHead>
              <TableHead>{t("maintenance.fields.assetType")}</TableHead>
              <TableHead>{t("maintenance.fields.workLocation")}</TableHead>
              <TableHead>{t("maintenance.fields.repairOption")}</TableHead>
              <TableHead>{t("maintenance.fields.priority")}</TableHead>
              <TableHead>{t("requests.fields.status")}</TableHead>
              <TableHead>{t("requests.fields.createdAt")}</TableHead>
              <TableHead className="w-28">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {task.employee?.firstNameAr} {task.employee?.lastNameAr}
                  </TableCell>
                  <TableCell>{task.details?.assetType || "—"}</TableCell>
                  <TableCell>
                    {task.details?.workLocation
                      ? t(`maintenance.workLocations.${task.details.workLocation}` as any)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {task.details?.repairOption
                      ? t(`maintenance.repairOptions.${task.details.repairOption}` as any)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {task.details?.priority && (
                      <Badge variant="outline" className={priorityClasses[task.details.priority] ?? ""}>
                        {t(`maintenance.priorities.${task.details.priority}` as any)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <MaintenanceStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(task.createdAt), "PPP", { locale: dateLocale })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSelected(task); setDetailsOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {task.status === "ASSIGNED" && (
                        <Button
                          size="sm"
                          onClick={() => setConfirmId(task.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-1" />
                          {t("maintenance.actions.complete")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm complete dialog */}
      <Dialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("maintenance.actions.complete")}</DialogTitle>
            <DialogDescription>
              {t("messages.actionCantUndo")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleComplete} disabled={completeTask.isPending}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("maintenance.title")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("requests.fields.employee")}</p>
                    <p className="font-medium">
                      {selected.employee?.firstNameAr} {selected.employee?.lastNameAr}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("requests.fields.status")}</p>
                    <MaintenanceStatusBadge status={selected.status} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.assetType")}</p>
                    <p className="font-medium">{selected.details?.assetType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.workLocation")}</p>
                    <p className="font-medium">
                      {selected.details?.workLocation
                        ? t(`maintenance.workLocations.${selected.details.workLocation}` as any)
                        : "—"}
                    </p>
                  </div>
                  {selected.details?.repairOption && (
                    <div>
                      <p className="text-muted-foreground">{t("maintenance.fields.repairOption")}</p>
                      <p className="font-medium">
                        {t(`maintenance.repairOptions.${selected.details.repairOption}` as any)}
                      </p>
                    </div>
                  )}
                  {selected.details?.brandModel && (
                    <div>
                      <p className="text-muted-foreground">{t("maintenance.fields.brandModel")}</p>
                      <p className="font-medium">{selected.details.brandModel}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("maintenance.fields.faultDescription")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{selected.details?.faultDescription || "—"}</p>
                </div>
                {selected.details?.situationDescription && (
                  <div>
                    <p className="text-muted-foreground text-sm">{t("maintenance.fields.situationDescription")}</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{selected.details.situationDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
