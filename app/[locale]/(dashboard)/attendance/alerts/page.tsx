"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  Plus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useAttendanceAlerts,
  useMyTeamAlerts,
  useCreateAttendanceAlert,
  useUpdateAttendanceAlert,
  useResolveAttendanceAlert,
  useDeleteAttendanceAlert,
} from "@/lib/hooks/use-attendance-alerts";
import { useAuthStore } from "@/lib/stores/auth-store";
import { AlertSeverityBadge } from "@/components/features/attendance/alert-severity-badge";
import { AlertStatusBadge } from "@/components/features/attendance/alert-status-badge";
import { AlertTypeBadge } from "@/components/features/attendance/alert-type-badge";
import {
  AttendanceAlert,
  AlertStatus,
  AlertType,
  AlertSeverity,
} from "@/lib/api/attendance-alerts";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { Pagination } from "@/components/shared/pagination";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";

const ALERT_TYPE_VALUES: AlertType[] = [
  "LATE",
  "ABSENT",
  "EARLY_LEAVE",
  "MISSING_CLOCK_OUT",
  "CONSECUTIVE_ABSENCE",
];

const ALERT_SEVERITY_VALUES: AlertSeverity[] = ["LOW", "MEDIUM", "HIGH"];

export default function AttendanceAlertsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;
  const { user } = useAuthStore();
  const isDirectManager = (user as any)?.roles?.some((r: any) =>
    ["DIRECT_MANAGER", "مدير مباشر"].includes(
      typeof r === "string" ? r : r?.name,
    ),
  );

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | AlertStatus>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AttendanceAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const [createForm, setCreateForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    alertType: "LATE" as AlertType,
    severity: "MEDIUM" as AlertSeverity,
    message: "",
    messageAr: "",
    status: "OPEN" as AlertStatus,
  });

  const LIMIT = 10;
  const queryParams =
    activeTab === "all"
      ? { page, limit: LIMIT }
      : { status: activeTab, page, limit: LIMIT };
  const { data: allData, isLoading: allLoading } = useAttendanceAlerts(queryParams);
  const { data: teamData, isLoading: teamLoading } = useMyTeamAlerts(queryParams);
  const data = isDirectManager ? teamData : allData;
  const isLoading = isDirectManager ? teamLoading : allLoading;
  const { data: employeesData } = useEmployeesBasicList();
  const createAlert = useCreateAttendanceAlert();
  const updateAlert = useUpdateAttendanceAlert();
  const resolveAlert = useResolveAttendanceAlert();
  const deleteAlert = useDeleteAttendanceAlert();

  const employees = Array.isArray(employeesData) ? employeesData : [];

  const alerts = (data as any)?.items || (data as any)?.data?.items || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages =
    (data as any)?.totalPages ??
    (data as any)?.data?.totalPages ??
    Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const filteredAlerts = alerts.filter((alert: AttendanceAlert) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const employeeNameAr =
      `${alert.employee?.firstNameAr || ""} ${alert.employee?.lastNameAr || ""}`.trim();
    const employeeNameEn =
      `${alert.employee?.firstNameEn || ""} ${alert.employee?.lastNameEn || ""}`.trim();
    return (
      employeeNameAr.toLowerCase().includes(searchLower) ||
      employeeNameEn.toLowerCase().includes(searchLower) ||
      alert.employee?.employeeNumber?.toLowerCase().includes(searchLower) ||
      alert.messageAr?.toLowerCase().includes(searchLower)
    );
  });

  const handleResolve = (alert: AttendanceAlert) => {
    setSelectedAlert(alert);
    setResolveNotes("");
    setResolveDialogOpen(true);
  };

  const confirmResolve = async () => {
    if (selectedAlert) {
      await resolveAlert.mutateAsync({
        id: selectedAlert.id,
        data: { resolvedNotes: resolveNotes },
      });
      setResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolveNotes("");
    }
  };

  const handleDelete = (alert: AttendanceAlert) => {
    setSelectedAlert(alert);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedAlert) {
      await deleteAlert.mutateAsync(selectedAlert.id);
      setDeleteDialogOpen(false);
      setSelectedAlert(null);
    }
  };

  const handleAcknowledge = async (alert: AttendanceAlert) => {
    await updateAlert.mutateAsync({
      id: alert.id,
      data: { status: "ACKNOWLEDGED" },
    });
  };

  const resetCreateForm = () => {
    setCreateForm({
      employeeId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      alertType: "LATE",
      severity: "MEDIUM",
      message: "",
      messageAr: "",
      status: "OPEN",
    });
  };

  const handleCreateAlert = async () => {
    await createAlert.mutateAsync({
      ...createForm,
      date: new Date(createForm.date).toISOString(),
    });
    setCreateDialogOpen(false);
    resetCreateForm();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: dateLocale });
    } catch {
      return dateString;
    }
  };

  const renderTable = (tableAlerts: AttendanceAlert[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("attendance.fields.employee")}</TableHead>
            <TableHead>{t("attendance.fields.date")}</TableHead>
            <TableHead>{t("attendance.alertFields.type")}</TableHead>
            <TableHead>{t("attendance.alertFields.message")}</TableHead>
            <TableHead>{t("attendance.alertFields.severity")}</TableHead>
            <TableHead>{t("attendance.fields.status")}</TableHead>
            <TableHead className="w-17.5">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))
          ) : tableAlerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                {t("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            tableAlerts.map((alert: AttendanceAlert) => (
              <TableRow key={alert.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {alert.employee
                        ? `${alert.employee.firstNameAr} ${alert.employee.lastNameAr}`
                        : "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {alert.employee?.employeeNumber || "-"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatDate(alert.date)}
                </TableCell>
                <TableCell>
                  <AlertTypeBadge type={alert.alertType} />
                </TableCell>
                <TableCell className="max-w-md">{alert.messageAr}</TableCell>
                <TableCell>
                  <AlertSeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell>
                  <AlertStatusBadge status={alert.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {alert.status === "OPEN" && (
                        <ActionGuard permission={PERMISSIONS.ATTENDANCE_ALERTS.UPDATE}>
                          <DropdownMenuItem onClick={() => handleAcknowledge(alert)}>
                            <Eye className="h-4 w-4 ml-2" />
                            {t("attendance.acknowledge")}
                          </DropdownMenuItem>
                        </ActionGuard>
                      )}
                      {alert.status !== "RESOLVED" && (
                        <ActionGuard permission={PERMISSIONS.ATTENDANCE_ALERTS.RESOLVE}>
                          <DropdownMenuItem onClick={() => handleResolve(alert)}>
                            <CheckCircle2 className="h-4 w-4 ml-2" />
                            {t("attendance.resolve")}
                          </DropdownMenuItem>
                        </ActionGuard>
                      )}
                      <ActionGuard permission={PERMISSIONS.ATTENDANCE_ALERTS.DELETE}>
                        <DropdownMenuItem
                          onClick={() => handleDelete(alert)}
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
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attendance.alertsTitle")}
        description={t("attendance.alertsDescription")}
        actions={
          <ActionGuard permission={PERMISSIONS.ATTENDANCE_ALERTS.CREATE}>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              {t("attendance.addAlert")}
            </Button>
          </ActionGuard>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("attendance.alertSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as any);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">{t("attendance.tabs.all")}</TabsTrigger>
          <TabsTrigger value="OPEN">{t("attendance.tabs.open")}</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">{t("attendance.tabs.acknowledged")}</TabsTrigger>
          <TabsTrigger value="RESOLVED">{t("attendance.tabs.resolved")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderTable(filteredAlerts)}
        </TabsContent>
        <TabsContent value="OPEN" className="space-y-4">
          {renderTable(filteredAlerts.filter((a: AttendanceAlert) => a.status === "OPEN"))}
        </TabsContent>
        <TabsContent value="ACKNOWLEDGED" className="space-y-4">
          {renderTable(filteredAlerts.filter((a: AttendanceAlert) => a.status === "ACKNOWLEDGED"))}
        </TabsContent>
        <TabsContent value="RESOLVED" className="space-y-4">
          {renderTable(filteredAlerts.filter((a: AttendanceAlert) => a.status === "RESOLVED"))}
        </TabsContent>
      </Tabs>

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("attendance.resolveTitle")}</DialogTitle>
            <DialogDescription>{t("attendance.resolveDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolveNotes">{t("attendance.resolveNotesLabel")}</Label>
              <Textarea
                id="resolveNotes"
                placeholder={t("attendance.resolveNotesPlaceholder")}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmResolve} disabled={!resolveNotes.trim()}>
              {t("attendance.resolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {/* Create Alert Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("attendance.createAlertTitle")}</DialogTitle>
            <DialogDescription>{t("attendance.createAlertDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("attendance.fields.employee")}</Label>
              <Select
                value={createForm.employeeId}
                onValueChange={(v) => setCreateForm({ ...createForm, employeeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("attendance.selectEmployee")} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstNameAr} {emp.lastNameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("attendance.fields.date")}</Label>
              <Input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("attendance.alertTypeLabel")}</Label>
                <Select
                  value={createForm.alertType}
                  onValueChange={(v) => setCreateForm({ ...createForm, alertType: v as AlertType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPE_VALUES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`attendance.alertTypesEnum.${type}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("attendance.alertFields.severity")}</Label>
                <Select
                  value={createForm.severity}
                  onValueChange={(v) => setCreateForm({ ...createForm, severity: v as AlertSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_SEVERITY_VALUES.map((sev) => (
                      <SelectItem key={sev} value={sev}>
                        {t(`attendance.alertSeverities.${sev}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("attendance.messageEnLabel")}</Label>
              <Input
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                placeholder="Employee was 30 minutes late"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("attendance.messageArLabel")}</Label>
              <Input
                value={createForm.messageAr}
                onChange={(e) => setCreateForm({ ...createForm, messageAr: e.target.value })}
                placeholder="تأخير 30 دقيقة عن موعد الحضور"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateAlert}
              disabled={!createForm.employeeId || !createForm.messageAr || createAlert.isPending}
            >
              {createAlert.isPending ? t("attendance.adding") : t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
