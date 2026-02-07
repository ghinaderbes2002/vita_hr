"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  useCreateAttendanceAlert,
  useUpdateAttendanceAlert,
  useResolveAttendanceAlert,
  useDeleteAttendanceAlert,
} from "@/lib/hooks/use-attendance-alerts";
import { AlertSeverityBadge } from "@/components/features/attendance/alert-severity-badge";
import { AlertStatusBadge } from "@/components/features/attendance/alert-status-badge";
import { AlertTypeBadge } from "@/components/features/attendance/alert-type-badge";
import { AttendanceAlert, AlertStatus, AlertType, AlertSeverity } from "@/lib/api/attendance-alerts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/lib/hooks/use-employees";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AttendanceAlertsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | AlertStatus>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AttendanceAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  // Create alert form state
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    alertType: "LATE" as AlertType,
    severity: "MEDIUM" as AlertSeverity,
    message: "",
    messageAr: "",
    status: "OPEN" as AlertStatus,
  });

  const queryParams = activeTab === "all" ? {} : { status: activeTab };
  const { data, isLoading } = useAttendanceAlerts(queryParams);
  const { data: employeesData } = useEmployees({});
  const createAlert = useCreateAttendanceAlert();
  const updateAlert = useUpdateAttendanceAlert();
  const resolveAlert = useResolveAttendanceAlert();
  const deleteAlert = useDeleteAttendanceAlert();

  const employees = Array.isArray(employeesData)
    ? employeesData
    : (employeesData as any)?.data?.items || (employeesData as any)?.data || [];

  const alerts = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredAlerts = alerts.filter((alert: AttendanceAlert) => {
    // إذا ما في بحث، نعرض كل التنبيهات
    if (!search) return true;

    const searchLower = search.toLowerCase();
    return (
      alert.employee?.nameAr?.toLowerCase().includes(searchLower) ||
      alert.employee?.nameEn?.toLowerCase().includes(searchLower) ||
      alert.employee?.code?.toLowerCase().includes(searchLower) ||
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
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  const renderTable = (tableAlerts: AttendanceAlert[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الموظف</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الرسالة</TableHead>
            <TableHead>الشدة</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
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
                    <div className="font-medium">{alert.employee?.nameAr}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.employee?.code}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatDate(alert.date)}
                </TableCell>
                <TableCell>
                  <AlertTypeBadge type={alert.alertType} />
                </TableCell>
                <TableCell className="max-w-md">
                  {alert.messageAr}
                </TableCell>
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
                        <DropdownMenuItem onClick={() => handleAcknowledge(alert)}>
                          <Eye className="h-4 w-4 ml-2" />
                          إقرار بالتنبيه
                        </DropdownMenuItem>
                      )}
                      {alert.status !== "RESOLVED" && (
                        <DropdownMenuItem onClick={() => handleResolve(alert)}>
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          حل التنبيه
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(alert)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        {t("common.delete")}
                      </DropdownMenuItem>
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
        title="تنبيهات الحضور"
        description="إدارة تنبيهات حضور وانصراف الموظفين"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة تنبيه
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالموظف أو الرسالة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="OPEN">مفتوحة</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">تم الإقرار</TabsTrigger>
          <TabsTrigger value="RESOLVED">محلولة</TabsTrigger>
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حل التنبيه</DialogTitle>
            <DialogDescription>
              أدخل ملاحظات حول كيفية حل هذا التنبيه
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolveNotes">ملاحظات الحل</Label>
              <Textarea
                id="resolveNotes"
                placeholder="تم التعامل مع التنبيه..."
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
              حل التنبيه
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
            <DialogTitle>إضافة تنبيه جديد</DialogTitle>
            <DialogDescription>
              إنشاء تنبيه حضور جديد لموظف
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select
                value={createForm.employeeId}
                onValueChange={(v) => setCreateForm({ ...createForm, employeeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstNameAr} {emp.lastNameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع التنبيه</Label>
                <Select
                  value={createForm.alertType}
                  onValueChange={(v) => setCreateForm({ ...createForm, alertType: v as AlertType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LATE">تأخير</SelectItem>
                    <SelectItem value="ABSENT">غياب</SelectItem>
                    <SelectItem value="EARLY_LEAVE">انصراف مبكر</SelectItem>
                    <SelectItem value="MISSING_CLOCK_OUT">نسيان تسجيل الانصراف</SelectItem>
                    <SelectItem value="CONSECUTIVE_ABSENCE">غياب متتالي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الشدة</Label>
                <Select
                  value={createForm.severity}
                  onValueChange={(v) => setCreateForm({ ...createForm, severity: v as AlertSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">منخفضة</SelectItem>
                    <SelectItem value="MEDIUM">متوسطة</SelectItem>
                    <SelectItem value="HIGH">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>الرسالة (بالإنجليزية)</Label>
              <Input
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                placeholder="Employee was 30 minutes late"
              />
            </div>

            <div className="space-y-2">
              <Label>الرسالة (بالعربية)</Label>
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
              {createAlert.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
